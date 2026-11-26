/* =====================================================================
   server.js: serves the app and forwards "Ask AI" questions to Gemini (or Claude),
   so your API key stays on your computer and never reaches the browser.
   Needs Node 18 or newer. No packages to install.

   Set GEMINI_API_KEY in your hosting provider environment variables.
   Optional: set GEMINI_MODEL to a model enabled for your Google AI Studio project.
         node server.js
   Open: http://localhost:3000
   ===================================================================== */
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");

// Small built-in .env loader for local laptop use (no npm package required).
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
        process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
      }
    }
  }
} catch (error) {
  console.warn("Could not read local .env file:", error.message);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || "";
const PYQ_FILE = path.join(__dirname, "pyqs.json");
const MATERIAL_FILE = path.join(__dirname, "materials.json");
const teacherSessions = new Set();

function readPyqs(){
  try { return JSON.parse(fs.readFileSync(PYQ_FILE, "utf8")); }
  catch(e){ return []; }
}
function writePyqs(items){
  fs.writeFileSync(PYQ_FILE, JSON.stringify(items, null, 2));
}
function readMaterials(){
  try { return JSON.parse(fs.readFileSync(MATERIAL_FILE, "utf8")); }
  catch(e){ return []; }
}
function writeMaterials(items){ fs.writeFileSync(MATERIAL_FILE, JSON.stringify(items, null, 2)); }
function readBody(req){
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if(body.length > 8_000_000){ reject(new Error("Request too large")); req.destroy(); }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch(e){ reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}
function isTeacher(req){
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return !!token && teacherSessions.has(token);
}
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".json": "application/json; charset=utf-8", ".pdf": "application/pdf" };
const SYSTEM = "You are ExamSaathi, a friendly exam tutor for BCA students. " +
  "Answer in simple English, and reply in Hinglish if the student writes in Hinglish. " +
  "If student notes are provided and relevant, use them. Keep answers exam-oriented: " +
  "a short definition first, then key points, then a small example if it helps. " +
  "Use plain text only, with no markdown symbols like ** or #.";

function send(res, code, obj){
  res.writeHead(code, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

// Fast, bounded model selection: one quick retry for temporary overload, then one fallback.
// Override with GEMINI_MODEL / GEMINI_MODELS in Render if needed.
const GEMINI_MODELS = (process.env.GEMINI_MODELS || [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.8-flash"
].join(",")).split(",").map(x => x.trim()).filter(Boolean);

async function geminiGenerate(parts, config = {}, systemInstruction = null){
  if(!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set in Render Environment.");
  let lastError = "Gemini request failed";
  const models = [...new Set(GEMINI_MODELS)].slice(0, 2);
  for(let mi = 0; mi < models.length; mi++){
    const model = models[mi];
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent";
    for(let attempt = 0; attempt < 1; attempt++){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);
      let response, data;
      try {
        response = await fetch(url, { method:"POST", headers:{"content-type":"application/json","x-goog-api-key":GEMINI_API_KEY}, signal:controller.signal,
          body:JSON.stringify({...(systemInstruction ? {systemInstruction:{parts:[{text:systemInstruction}]}} : {}), contents:[{role:"user",parts}], generationConfig:config}) });
        data = await response.json().catch(()=>({}));
      } catch(e) {
        lastError = e.name === "AbortError" ? "Gemini timed out after 25 seconds" : (e.message || "Network error contacting Gemini");
      } finally { clearTimeout(timeout); }
      if(response && response.ok){
        const answer = (data.candidates || []).flatMap(c=>c.content?.parts || []).map(x=>x.text || "").join("").trim();
        if(answer) return {answer, model};
        lastError = "Gemini returned no text from " + model;
        break;
      }
      if(response){
        const status = response.status;
        lastError = "Gemini (" + status + ", " + model + "): " + (data?.error?.message || "request failed");
        // Retry only temporary capacity/rate/server errors; don't waste time on bad keys or invalid models.
        if([429,500,502,503,504].includes(status) && attempt === 0){
          await new Promise(resolve=>setTimeout(resolve,250));
          continue;
        }
        if(![429,500,502,503,504].includes(status)) throw new Error(lastError);
      }
      break;
    }
  }
  throw new Error(lastError + ". Please retry in a moment.");
}

http.createServer((req, res) => {
  // Public student access: teacher-approved PYQs are shared from the server.
  if(req.method === "GET" && req.url === "/api/pyqs"){
    return send(res, 200, { pyqs: readPyqs() });
  }

  // Teacher materials: images are read by Gemini and saved as subject-tagged text.
  if(req.method === "GET" && req.url === "/api/materials"){
    return send(res, 200, { materials: readMaterials().map(({id,subject,topic,filename,createdAt}) => ({id,subject,topic,filename,createdAt})) });
  }
  if(req.method === "POST" && req.url === "/api/materials"){
    if(!isTeacher(req)) return send(res, 401, {error:"Teacher sign-in required."});
    readBody(req).then(async ({subject, topic, filename, mimeType, imageData}) => {
      subject = String(subject || "").trim().slice(0,120);
      topic = String(topic || "General notes").trim().slice(0,160);
      filename = String(filename || "notes-image").trim().slice(0,180);
      mimeType = String(mimeType || "");
      imageData = String(imageData || "").replace(/^data:[^,]+,/, "");
      if(!subject || !imageData) return send(res, 400, {error:"Subject and an image are required."});
      if(!["image/jpeg","image/png","image/webp","image/heic"].includes(mimeType)) return send(res, 400, {error:"Please upload a JPG, PNG, WEBP or HEIC image."});
      if(imageData.length > 5_500_000) return send(res, 413, {error:"Image is too large. Please choose an image under 4 MB."});
      if(!GEMINI_API_KEY) return send(res, 503, {error:"Gemini is not configured on the server."});
      const prompt = "Read this photograph of a teacher's study notes or question paper. Transcribe all legible educational text faithfully. Preserve headings, formulas, numbering and question wording. Do not invent missing words. Return plain text only. Subject: " + subject + ". Topic: " + topic + ".";
      const imageResult = await geminiGenerate([{text:prompt},{inlineData:{mimeType, data:imageData}}], {maxOutputTokens:5000});
      const extractedText = imageResult.answer;
      if(!extractedText) throw new Error("Gemini could not read text from this image. Try a clearer, well-lit photo.");
      const materials = readMaterials();
      const item = {id:crypto.randomUUID(),subject,topic,filename,extractedText,createdAt:new Date().toISOString()};
      materials.unshift(item); writeMaterials(materials);
      send(res,201,{material:{id:item.id,subject,topic,filename,createdAt:item.createdAt,extractedText}});
    }).catch(e => send(res, 400, {error:e.message}));
    return;
  }
  if(req.method === "DELETE" && req.url.startsWith("/api/materials/")){
    if(!isTeacher(req)) return send(res,401,{error:"Teacher sign-in required."});
    const id = decodeURIComponent(req.url.slice("/api/materials/".length));
    const items=readMaterials(), next=items.filter(x=>x.id!==id);
    if(next.length===items.length) return send(res,404,{error:"Material not found."});
    writeMaterials(next); return send(res,200,{ok:true});
  }

  // Teacher sign-in. Set TEACHER_PASSWORD before starting the server.
  if(req.method === "POST" && req.url === "/api/teacher/login"){
    readBody(req).then(({password}) => {
      if(!TEACHER_PASSWORD) return send(res, 503, {error:"Teacher access is not configured. Set TEACHER_PASSWORD on the server."});
      if(password !== TEACHER_PASSWORD) return send(res, 401, {error:"Incorrect teacher password."});
      const token = crypto.randomBytes(32).toString("hex");
      teacherSessions.add(token);
      send(res, 200, {token});
    }).catch(e => send(res, 400, {error:e.message}));
    return;
  }

  if(req.method === "POST" && req.url === "/api/pyqs"){
    if(!isTeacher(req)) return send(res, 401, {error:"Teacher sign-in required."});
    readBody(req).then(({subject, topic, question, year, answer}) => {
      subject = String(subject || "").trim().slice(0,120);
      topic = String(topic || "").trim().slice(0,160);
      question = String(question || "").trim().slice(0,3000);
      answer = String(answer || "").trim().slice(0,8000);
      year = year ? String(year).trim().slice(0,12) : "";
      if(!subject || !topic || !question) return send(res, 400, {error:"Subject, topic and question are required."});
      const pyqs = readPyqs();
      const item = {id:crypto.randomUUID(), subject, topic, question, year, answer, createdAt:new Date().toISOString()};
      pyqs.unshift(item);
      writePyqs(pyqs);
      send(res, 201, {pyq:item});
    }).catch(e => send(res, 400, {error:e.message}));
    return;
  }

  if(req.method === "DELETE" && req.url.startsWith("/api/pyqs/")){
    if(!isTeacher(req)) return send(res, 401, {error:"Teacher sign-in required."});
    const id = decodeURIComponent(req.url.slice("/api/pyqs/".length));
    const pyqs = readPyqs(), next = pyqs.filter(x => x.id !== id);
    if(next.length === pyqs.length) return send(res, 404, {error:"PYQ not found."});
    writePyqs(next);
    return send(res, 200, {ok:true});
  }

  if(req.method === "POST" && req.url === "/api/teacher/logout"){
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    teacherSessions.delete(token);
    return send(res, 200, {ok:true});
  }

  // 1. The AI endpoint: the browser sends { question, notes }
  if(req.method === "POST" && req.url === "/api/ask"){
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      try{
        const { question, notes, subject } = JSON.parse(body);
        if(!question || !String(question).trim()) throw new Error("Please enter a question.");
        const materials = readMaterials();
        const subjects = [...new Set(materials.map(m=>m.subject))];
        const qLower = String(question).toLowerCase();
        const chosenSubject = String(subject || "").trim() || subjects.find(s => qLower.includes(s.toLowerCase())) || "";
        const relevant = chosenSubject ? materials.filter(m => m.subject.toLowerCase() === chosenSubject.toLowerCase()).slice(0,8) : [];
        const teacherContext = relevant.map(m => "[" + m.subject + " / " + m.topic + "]\n" + m.extractedText).join("\n\n");
        const scopedNotes = [teacherContext, String(notes || "").slice(0, 7000)].filter(Boolean).join("\n\n").slice(0, 10000);
        const prompt = (chosenSubject ? "The student's selected subject is " + chosenSubject + ". Answer ONLY within this subject. Do not mix notes from other subjects. If the question is outside this subject, ask them to select the correct subject.\n\n" : "Identify the subject from the question. Do not mix unrelated subjects.\n\n") + (scopedNotes ? "Relevant notes for this subject:\n" + scopedNotes + "\n\n" : "") + "Question: " + question;
        const result = await geminiGenerate([{text:prompt}], {maxOutputTokens:700}, SYSTEM);
        return send(res, 200, { answer: result.answer, provider: "Gemini", model: result.model });
      }catch(e){ send(res, 500, { error: e.message }); }
    });
    return;
  }

  // 2. Everything else: serve the app files from this folder
  const name = req.url === "/" ? "index.html" : decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(__dirname, name);
  if(!file.startsWith(__dirname) || name.includes("server.js")){ res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "text/plain" });
    res.end(data);
  });
 }).listen(process.env.PORT || 3000, () => console.log("ExamSaathi server started on port " + (process.env.PORT || 3000) +
  (GEMINI_API_KEY ? "  (Gemini AI enabled with model fallback: " + GEMINI_MODELS.join(", ") + ")" : "  (no Gemini key set: Ask AI will use notes only)") +
  (TEACHER_PASSWORD ? "  (teacher uploads enabled)" : "  (set TEACHER_PASSWORD to enable teacher uploads)")));
