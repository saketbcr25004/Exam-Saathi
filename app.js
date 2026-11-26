/* =====================================================================
   ExamSaathi: simple study planner. Sections:
   1. Storage   2. Date helpers   3. Plan maker   4. Screens (render)
   5. AI helper (canned answers)   6. Events
   ===================================================================== */

/* ---------- 1. Storage: one array saved in localStorage ----------
   subjects = [{ id, name, examDate, topics:[{ title, done, date }] }]  */
const KEY = "examsaathi-v1";
let subjects = load();
let openPlans = {};      // which subject cards have the day-by-day plan open
let score = 0, quizTotal = 0;

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch(e){ return []; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(subjects)); }catch(e){} }
const $ = id => document.getElementById(id);

/* ---------- 2. Date helpers ---------- */
const DAY = 86400000;
function todayDate(){ const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays(d, n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
function iso(d){ return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }
function parse(s){ const p = s.split("-").map(Number); return new Date(p[0], p[1]-1, p[2]); }
function daysLeft(s){ return Math.round((parse(s) - todayDate()) / DAY); }
function pretty(s){ return parse(s).toLocaleDateString("en-IN", {weekday:"short", day:"numeric", month:"short"}); }
function esc(t){ return String(t).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function say(m){ $("msg").textContent = m; }

/* ---------- 3. Plan maker ----------
   Spread topics evenly from today until the day before the exam.
   The last day before the exam is kept free for revision.        */
function makeSubject(name, examDate, titles){
  const left = daysLeft(examDate);
  const studyDays = Math.max(left - 1, 1);          // days available for new topics
  const n = titles.length;
  const topics = titles.map((title, i) => ({
    title: title, done: false,
    date: iso(addDays(todayDate(), Math.floor(i * studyDays / n)))   // even spread
  }));
  return { id: Date.now().toString(36) + Math.random().toString(36).slice(2,6), name: name, examDate: examDate, topics: topics };
}
function pct(s){ return s.topics.length ? Math.round(s.topics.filter(t => t.done).length * 100 / s.topics.length) : 0; }
function findSubject(id){ return subjects.find(s => s.id === id); }

/* ---------- 4. Screens ---------- */
function render(){
  $("today").innerHTML = todayHTML();
  $("perf").innerHTML = perfHTML();
  $("subjects").innerHTML = subjects.length
    ? subjects.map(subjectHTML).join("")
    : '<div class="card empty">No subjects yet. Add one above or tap “Load demo data”.</div>';
  // animate progress bars: start at 0, then grow to the real value
  setTimeout(() => document.querySelectorAll(".bar i").forEach(b => b.style.width = b.dataset.w + "%"), 30);
}

// "Today" checklist: topics planned for today, plus anything overdue
function todayHTML(){
  const t = iso(todayDate());
  let out = '<div class="head"><h2>Today’s checklist</h2><small>' + pretty(t) + '</small></div>', any = false;
  subjects.forEach(s => {
    const left = daysLeft(s.examDate);
    if(left < 0) return;
    let rows = "";
    s.topics.forEach((tp, i) => {
      if(tp.date <= t && (!tp.done || tp.date === t)){
        rows += '<label class="topic ' + (tp.done ? "done" : "") + '">' +
          '<input type="checkbox" data-act="tick" data-s="' + s.id + '" data-i="' + i + '"' + (tp.done ? " checked" : "") + '>' +
          '<span class="name">' + esc(tp.title) + '</span>' +
          (tp.date < t && !tp.done ? '<span class="late">overdue</span>' : "") + '</label>';
      }
    });
    if(left === 1) rows += '<p class="line">Revision day: go through every topic once.</p>';
    if(left === 0) rows += '<p class="line">Exam today. All the best!</p>';
    if(rows){ any = true; out += '<h3>' + esc(s.name) + '</h3>' + rows; }
  });
  if(!any) out += '<p class="empty">Nothing due today. Add a subject to get started.</p>';
  return out;
}

// One card per subject: progress, topics with AI buttons, optional day-by-day plan
function subjectHTML(s){
  const left = daysLeft(s.examDate), p = pct(s);
  const chip = left > 0 ? left + (left > 1 ? " days left" : " day left") : (left === 0 ? "Exam today" : "Exam over");

  const topics = s.topics.map((tp, i) =>
    '<div class="topic ' + (tp.done ? "done" : "") + '">' +
      '<input type="checkbox" data-act="tick" data-s="' + s.id + '" data-i="' + i + '"' + (tp.done ? " checked" : "") + ' aria-label="Mark done">' +
      '<span class="name">' + esc(tp.title) + '</span>' +
      '<button class="mini" data-act="notes" data-sub="' + esc(s.name) + '" data-t="' + esc(tp.title) + '">Notes and PYQs</button>' +
      '<button class="mini" data-act="explain" data-sub="' + esc(s.name) + '" data-t="' + esc(tp.title) + '">Explain simply</button>' +
      '<button class="mini" data-act="quiz" data-sub="' + esc(s.name) + '" data-t="' + esc(tp.title) + '">Quiz me</button>' +
    '</div>').join("");

  let plan = "";
  if(openPlans[s.id]){
    const byDate = {};
    s.topics.forEach(tp => { (byDate[tp.date] = byDate[tp.date] || []).push(tp.title); });
    plan = Object.keys(byDate).sort().map(d =>
      '<div class="plan"><b>' + pretty(d) + '</b><span>' + byDate[d].map(esc).join(", ") + '</span></div>').join("");
    if(left >= 2) plan += '<div class="plan"><b>' + pretty(iso(addDays(parse(s.examDate), -1))) + '</b><span>Revision day: go through everything once</span></div>';
  }

  return '<section class="card">' +
    '<div class="head"><div><h2>' + esc(s.name) + '</h2><small>Exam: ' + pretty(s.examDate) + '</small></div>' +
    '<div class="row"><span class="chip">' + chip + '</span><button class="mini" data-act="del" data-s="' + s.id + '">Delete</button></div></div>' +
    '<div class="ready"><span>Readiness</span><b>' + p + '%</b></div>' +
    '<div class="bar"><i data-w="' + p + '"></i></div>' + topics +
    '<div class="row" style="margin-top:10px"><button class="mini" data-act="plan" data-s="' + s.id + '">' + (openPlans[s.id] ? "Hide" : "Show") + ' day-by-day plan</button></div>' + plan +
    '</section>';
}

/* ---------- 5. AI helper ----------
   getAIResponse is the ONLY place that makes "AI" answers.
   Right now it returns canned text. To use a real AI later, replace the body
   with a fetch() to your own server and return the same shapes:
     "explain" -> array of 5 strings
     "quiz"    -> array of 5 items [question, [4 options], indexOfCorrectOption]  */
const CANNED = {
  normalization: {
    explain: [
      "Normalization ka matlab hai database ko aise organise karna ki data repeat na ho.",
      "Isse redundancy kam hoti hai aur update karte waqt galti ke chances kam ho jaate hain.",
      "1NF mein har cell mein sirf ek value hoti hai, koi repeating group nahi.",
      "2NF mein partial dependency hatate hain, aur 3NF mein transitive dependency.",
      "Yaad rakho: bade table ko chhote related tables mein todna hi normalization hai."],
    quiz: [
      ["Normalization ka main purpose kya hai?", ["Data redundancy kam karna","Data delete karna","Tables badhana","Queries slow karna"], 0],
      ["1NF mein kya hona chahiye?", ["Transitive dependency","Har attribute mein atomic value","Sirf ek table","Koi primary key nahi"], 1],
      ["2NF kis dependency ko hatata hai?", ["Transitive","Multivalued","Partial","Join"], 2],
      ["3NF kis dependency ko hatata hai?", ["Partial dependency","Transitive dependency","Atomic values","Foreign key"], 1],
      ["Redundancy se kaunsi problem hoti hai?", ["Faster queries","Better security","Less storage use","Update anomaly"], 3]]
  },
  lists: {
    explain: [
      "List Python ka ordered collection hai, jise square brackets [] mein likhte hain.",
      "Isme alag-alag type ki values ek saath rakh sakte ho.",
      "Lists mutable hoti hain, yaani baad mein unhe change kar sakte ho.",
      "append(), insert(), remove() aur pop() sabse common methods hain.",
      "Indexing 0 se shuru hoti hai, aur -1 last element deta hai."],
    quiz: [
      ["Python mein list kaise banate hain?", ["(1, 2, 3)","[1, 2, 3]","{1, 2, 3}","<1, 2, 3>"], 1],
      ["Lists mutable hoti hain ya immutable?", ["Mutable","Immutable","Dono","Koi nahi"], 0],
      ["list.append(x) kya karta hai?", ["Start mein jodta hai","Element hataata hai","End mein element jodta hai","List sort karta hai"], 2],
      ["len([4, 5, 6]) ka output kya hoga?", ["2","4","6","3"], 3],
      ["Last element hataane ke liye kaunsa method use hota hai?", ["add()","push()","insert()","pop()"], 3]]
  }
};

async function getAIResponse(type, topic, sub){
  const n = sub && findNotes(sub, topic);                       // quiz from your own notes first
  if(type === "quiz" && n && n.quiz && n.quiz.length) return n.quiz;
  const key = Object.keys(CANNED).find(k => topic.toLowerCase().includes(k));
  if(key) return CANNED[key][type];
  // Generic answers for any other topic
  if(type === "explain") return [
    topic + " ek important topic hai jo exam mein aksar poochha jaata hai.",
    "Sabse pehle iski definition simple words mein yaad karo.",
    "Phir ek real-life example se samjho, taaki concept yaad rahe.",
    "Key points ki chhoti list banao, aur diagram ya table ho to wo bhi.",
    "Last mein 2-3 previous year questions solve karke khud ko check karo."];
  return [
    [topic + " padhne ka sabse accha pehla step kya hai?", ["Definition aur basic concept samajhna","Seedha ratna shuru karna","Sirf last day padhna","Topic skip karna"], 0],
    [topic + " yaad rakhne ka best tarika kaunsa hai?", ["Sirf ek baar padhna","Example ke saath practice karna","Bina likhe dekhna","Raat bhar ratna"], 1],
    ["Exam se pehle " + topic + " ke liye kya karna chahiye?", ["Notes jala dena","Topic ignore karna","Previous year questions solve karna","Naya topic shuru karna"], 2],
    ["Revision ka sabse bada fayda kya hai?", ["Time waste hota hai","Confusion badhta hai","Kuch farak nahi padta","Concepts yaad rehte hain"], 3],
    [topic + " mein doubt ho to kya karna chahiye?", ["Chhod dena","Guess karna","Ignore karna","Teacher ya friend se poochhna"], 3]];
}

// Show the popup with an explanation or a quiz
async function openAI(type, topic, sub){
  quizCtx = {sub: sub, topic: topic};
  $("ov").classList.add("show");
  $("panel").innerHTML = "<p>Thinking…</p>";
  const data = await getAIResponse(type, topic, sub);
  let body = "";
  if(type === "explain"){
    body = data.map((l, i) => '<p class="line"><b>' + (i+1) + '.</b> ' + esc(l) + '</p>').join("");
  } else {
    score = 0; quizTotal = data.length;
    body = '<p class="score" id="score">Score: 0 / ' + quizTotal + '</p>' + data.map((q, qi) =>
      '<div class="q"><p><b>Q' + (qi+1) + '.</b> ' + esc(q[0]) + '</p>' +
      q[1].map((o, oi) => '<button class="opt" data-act="ans" data-o="' + oi + '" data-c="' + q[2] + '">' + esc(o) + '</button>').join("") +
      '</div>').join("");
  }
  $("panel").innerHTML = '<div class="head"><h2>' + (type === "explain" ? "Explain simply" : "Quiz") + ': ' + esc(topic) + '</h2>' +
    '<button class="mini" data-act="close">Close</button></div>' + body;
}

/* ---------- 6. Events ---------- */
// All button clicks go through one listener (event delegation)
document.addEventListener("click", e => {
  if(e.target === $("ov")){ $("ov").classList.remove("show"); return; }
  const b = e.target.closest("[data-act]");
  if(!b) return;
  const act = b.dataset.act;
  if(act === "explain" || act === "quiz") openAI(act, b.dataset.t, b.dataset.sub);
  else if(act === "notes" || act === "tab") openNotes(b.dataset.sub, b.dataset.t, b.dataset.tab || firstTab(b.dataset.sub, b.dataset.t));
  else if(act === "plus") openAdd();
  else if(act === "ask") askAI();
  else if(act === "addsyl") addSyl();
  else if(act === "row") $("rows").insertAdjacentHTML("beforeend", rowHTML());
  else if(act === "saveall") saveAll();
  else if(act === "import") importNotes();
  else if(act === "close") $("ov").classList.remove("show");
  else if(act === "del"){ subjects = subjects.filter(s => s.id !== b.dataset.s); save(); render(); }
  else if(act === "plan"){ openPlans[b.dataset.s] = !openPlans[b.dataset.s]; render(); }
  else if(act === "ans"){
    const group = b.parentElement;
    if(group.dataset.done) return;                  // one answer per question
    group.dataset.done = "1";
    const correct = +b.dataset.c, picked = +b.dataset.o;
    group.querySelectorAll(".opt").forEach((x, i) => {
      if(i === correct) x.classList.add("ok"); else if(i === picked) x.classList.add("no");
    });
    if(picked === correct) score++;
    const answered = document.querySelectorAll(".q[data-done]").length;
    $("score").textContent = "Score: " + score + " / " + quizTotal + (answered === quizTotal ? " (finished)" : "");
    if(answered === quizTotal && quizCtx){                    // quiz finished: save the result
      perf.push({sub: quizCtx.sub || "General", topic: quizCtx.topic, s: score, t: quizTotal, d: iso(todayDate())});
      saveKey(PKEY, perf); quizCtx = null; render();
    }
  }
});

// Ticking a checkbox updates data, saves and redraws
document.addEventListener("change", e => {
  const c = e.target;
  if(c.dataset.act !== "tick") return;
  findSubject(c.dataset.s).topics[+c.dataset.i].done = c.checked;
  save(); render();
});

// Add a subject
function addSubject(){
  const name = $("name").value.trim(), date = $("date").value;
  const titles = $("topics").value.split(",").map(x => x.trim()).filter(Boolean);
  if(!name || !date || !titles.length) return say("Fill in the subject, the exam date and at least one topic.");
  if(daysLeft(date) < 1) return say("Pick an exam date after today.");
  subjects.push(makeSubject(name, date, titles));
  save(); render();
  $("name").value = ""; $("topics").value = ""; $("date").value = ""; say("");
}
$("add").addEventListener("click", addSubject);
document.querySelectorAll("#addbox input").forEach(i => i.addEventListener("keydown", e => { if(e.key === "Enter") addSubject(); }));
$("date").min = iso(addDays(todayDate(), 1));

// Demo data: three sample subjects (skips any already added)
$("demo").addEventListener("click", () => {
  [["DBMS", 7, ["Introduction to DBMS","ER Model","Normalization","SQL Basics","Transactions","Indexing"]],
   ["Python Programming", 10, ["Functions","Lists","Tuples","Dictionaries","File Handling"]],
   ["Software Engineering", 13, ["SDLC Models","Risk Management","Project Planning","UML Diagrams"]]
  ].forEach(d => {
    if(!subjects.some(s => s.name === d[0])) subjects.push(makeSubject(d[0], iso(addDays(todayDate(), d[1])), d[2]));
  });
  save(); render();
});

// Dark mode toggle (remembered between visits)
function setTheme(t){
  document.documentElement.dataset.theme = t;
  $("theme").textContent = t === "dark" ? "Light mode" : "Dark mode";
  try{ localStorage.setItem(KEY + "-theme", t); }catch(e){}
}
$("theme").addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
let savedTheme = null;
try{ savedTheme = localStorage.getItem(KEY + "-theme"); }catch(e){}
setTheme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

/* ---------- 7. Notes, performance and the plus button ---------- */
const PKEY = KEY + "-perf", LKEY = KEY + "-lib";
function loadKey(k, d){ try{ return JSON.parse(localStorage.getItem(k)) || d; }catch(e){ return d; } }
function saveKey(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
let perf = loadKey(PKEY, []);       // quiz history: [{sub, topic, s (score), t (total), d (date)}]
let custom = loadKey(LKEY, {});     // notes added with the plus button (same format as data.js)
let quizCtx = null;                 // subject and topic of the quiz that is open

// Find notes for a subject and topic: your imported notes first, then data.js
function like(a, b){ a = a.toLowerCase(); b = b.toLowerCase(); return a.includes(b) || b.includes(a); }
function findNotes(sub, topic){
  for(const lib of [custom, LIBRARY]){
    const sk = Object.keys(lib).find(k => like(k, sub));
    const tk = sk && Object.keys(lib[sk]).find(k => like(k, topic));
    if(tk) return lib[sk][tk];
  }
  return null;
}

// Notes popup with tabs: short, medium, long, PYQs
const TABS = [["short","Short (2 marks)"], ["medium","Medium (5 marks)"], ["long","Long (10 marks)"], ["pyq","PYQs"]];
function openNotes(sub, topic, tab){
  const n = findNotes(sub, topic), items = (n && n[tab]) || [];
  const at = ' data-sub="' + esc(sub) + '" data-t="' + esc(topic) + '"';
  let body = items.map(it => tab === "pyq"
    ? '<p class="line">' + esc(it.q) + (it.y ? " <small>(" + esc(it.y) + ")</small>" : "") + '</p>'
    : '<div class="qa"><p><b>Q.</b> ' + esc(it.q) + '</p><p class="ans">' + esc(it.a) + '</p></div>').join("");
  if(!body) body = '<p class="empty">Nothing here yet. Add your notes with the + button (import) or in data.js.</p>';
  $("ov").classList.add("show");
  $("panel").innerHTML = '<div class="head"><h2>' + esc(topic) + '</h2><button class="mini" data-act="close">Close</button></div>' +
    '<div class="row tabs">' + TABS.map(t => '<button class="mini' + (t[0] === tab ? " on" : "") + '" data-act="tab" data-tab="' + t[0] + '"' + at + '>' + t[1] + '</button>').join("") +
    '<button class="mini" data-act="quiz"' + at + '>Take quiz</button></div>' + body;
}

// Performance card: average score, per-subject bars, weak topics, last 5 quizzes
function perfHTML(){
  let out = '<div class="head"><h2>Your performance</h2></div>';
  if(!perf.length) return out + '<p class="empty">Take a quiz to see your scores here.</p>';
  const avg = a => Math.round(a.reduce((x, p) => x + p.s * 100 / p.t, 0) / a.length);
  const group = key => { const g = {}; perf.forEach(p => (g[p[key]] = g[p[key]] || []).push(p)); return g; };
  out += '<p>Quizzes taken: <b>' + perf.length + '</b>. Average score: <b>' + avg(perf) + '%</b></p>';
  const bySub = group("sub"), byTopic = group("topic");
  Object.keys(bySub).forEach(k => {
    const a = avg(bySub[k]);
    out += '<div class="ready"><span>' + esc(k) + '</span><b>' + a + '%</b></div><div class="bar"><i data-w="' + a + '"></i></div>';
  });
  const weak = Object.keys(byTopic).filter(k => avg(byTopic[k]) < 60);
  if(weak.length) out += '<p class="late">Revise these topics: ' + weak.map(esc).join(", ") + '</p>';
  return out + '<small>Latest: ' + perf.slice(-5).reverse().map(p => esc(p.topic) + " " + p.s + "/" + p.t).join(", ") + '</small>';
}

// Plus button: add several subjects at once, or import notes for many subjects
function rowHTML(){
  return '<div class="rowbox"><input type="text" class="r-name" placeholder="Subject name">' +
    '<input type="date" class="r-date" min="' + iso(addDays(todayDate(), 1)) + '">' +
    '<input type="text" class="r-topics" placeholder="Topics, separated by commas"></div>';
}
function openAdd(){
  $("ov").classList.add("show");
  $("panel").innerHTML = '<div class="head"><h2>Add subjects</h2><button class="mini" data-act="close">Close</button></div>' +
    '<div id="rows">' + rowHTML() + rowHTML() + '</div>' +
    '<div class="row" style="margin-top:10px"><button class="mini" data-act="row">+ Add another subject</button></div>' +
    '<button class="primary" data-act="saveall">Save all subjects</button><p class="msg" id="msg2"></p>' +
    sylHTML() +
    '<details><summary>Import notes for many subjects (JSON)</summary>' +
    '<p><small>Same format as data.js: {"Subject":{"Topic":{"short":[{"q":"","a":""}],"medium":[],"long":[],"pyq":[{"q":"","y":2024}],"quiz":[["Question",["A","B","C","D"],0]]}}}</small></p>' +
    '<textarea id="libjson" rows="6" placeholder="Paste JSON here"></textarea>' +
    '<button class="mini" data-act="import">Import notes</button></details>';
}
function saveAll(){
  const list = []; let bad = false;
  document.querySelectorAll(".rowbox").forEach(r => {
    const name = r.querySelector(".r-name").value.trim(), date = r.querySelector(".r-date").value;
    const titles = r.querySelector(".r-topics").value.split(",").map(x => x.trim()).filter(Boolean);
    if(!name && !date && !titles.length) return;                 // empty row: skip
    if(!name || !date || !titles.length || daysLeft(date) < 1){ bad = true; return; }
    list.push([name, date, titles]);
  });
  const m = $("msg2"); m.style.color = "";
  if(bad) return m.textContent = "Each filled row needs a subject name, a future exam date and at least one topic.";
  if(!list.length) return m.textContent = "Fill in at least one subject.";
  list.forEach(x => subjects.push(makeSubject(x[0], x[1], x[2])));
  save(); render(); $("ov").classList.remove("show");
}
function importNotes(){
  const m = $("msg2");
  try{
    const obj = JSON.parse($("libjson").value);
    Object.keys(obj).forEach(s => { custom[s] = Object.assign(custom[s] || {}, obj[s]); });
    saveKey(LKEY, custom);
    m.style.color = "var(--good)"; m.textContent = "Notes imported. Tap Notes and PYQs on a topic to see them.";
  }catch(e){ m.style.color = ""; m.textContent = "That JSON is not valid. Check the commas and quotes."; }
}

/* ---------- 7b. Add subjects from your syllabus (SYLLABUS in data.js) ---------- */
function sylHTML(){
  if(typeof SYLLABUS === "undefined") return "";
  return '<details open><summary>Add from my syllabus</summary>' + Object.keys(SYLLABUS).map(sub =>
    '<div class="syl" data-sub="' + esc(sub) + '"><b>' + esc(sub) + '</b><div class="row">' +
    Object.keys(SYLLABUS[sub]).map(u => '<label><input type="checkbox" value="' + esc(u) + '"> ' + esc(u) + '</label>').join("") +
    '</div><input type="date" class="s-date" min="' + iso(addDays(todayDate(), 1)) + '"></div>').join("") +
    '<button class="mini" data-act="addsyl">Add selected syllabus subjects</button></details>';
}
function addSyl(){
  const m = $("msg2"); m.style.color = ""; const list = []; let err = "";
  document.querySelectorAll(".syl").forEach(box => {
    const units = [...box.querySelectorAll("input[type=checkbox]:checked")].map(c => c.value);
    if(!units.length) return;                                    // nothing ticked for this subject
    const sub = box.dataset.sub, date = box.querySelector(".s-date").value;
    if(!date || daysLeft(date) < 1) err = "Pick a future exam date for " + sub + ".";
    else if(subjects.some(s => s.name === sub)) err = sub + " is already added.";
    else list.push([sub, date, [].concat(...units.map(u => SYLLABUS[sub][u]))]);
  });
  if(err) return m.textContent = err;
  if(!list.length) return m.textContent = "Tick at least one unit and pick an exam date.";
  list.forEach(x => subjects.push(makeSubject(x[0], x[1], x[2])));
  save(); render(); $("ov").classList.remove("show");
}
// When Notes opens, start on the first tab that has content
function firstTab(sub, topic){
  const n = findNotes(sub, topic);
  return ["short", "medium", "long", "pyq"].find(t => n && n[t] && n[t].length) || "short";
}

/* ---------- 8. Ask AI ----------
   Sends your question plus the 3 most relevant notes to /api/ask (server.js).
   If the server or the API key is missing, it shows the closest answers from your notes. */
function searchNotes(q, subject){
  const words = q.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const hits = [];
  [custom, LIBRARY].forEach(lib => Object.keys(lib).filter(sub => !subject || sub.toLowerCase() === subject.toLowerCase()).forEach(sub => Object.keys(lib[sub]).forEach(tp => {
    ["short", "medium", "long"].forEach(kind => (lib[sub][tp][kind] || []).forEach(it => {
      const text = (tp + " " + it.q + " " + it.a).toLowerCase();
      const score = words.filter(w => text.includes(w)).length;
      if(score) hits.push({score: score, sub: sub, tp: tp, q: it.q, a: it.a});
    }));
  })));
  return hits.sort((a, b) => b.score - a.score).slice(0, 3);
}
async function askAI(){
  const q = $("q").value.trim(), box = $("answer");
  if(!q) return;
  box.textContent = "Thinking…";
  let subject = $("askSubject")?.value || "";
  let hits = searchNotes(q, subject);
  if(!subject && hits.length){ subject = hits[0].sub; hits = hits.filter(h => h.sub === subject); }
  try{
    const r = await fetch("/api/ask", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({question: q, subject, notes: hits.map(h => "[" + h.sub + " / " + h.tp + "]\n" + h.q + "\n" + h.a).join("\n\n")})});
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || "Request failed");
    box.textContent = data.answer;
  }catch(e){
    box.textContent = hits.length
      ? "AI is offline (" + e.message + "). Closest answers from your notes:\n\n" + hits.map(h => h.sub + " / " + h.tp + "\nQ. " + h.q + "\n" + h.a).join("\n\n")
      : "AI is offline (" + e.message + ") and no matching notes were found. Start the app with node server.js and set your API key.";
  }
}
$("q").addEventListener("keydown", e => { if(e.key === "Enter") askAI(); });

render();   // first draw when the page opens


/* ---------- 9. Shared PYQ library and teacher corner ---------- */
const TEACHER_TOKEN_KEY = "examsaathi-teacher-token";
let teacherToken = "";
try { teacherToken = sessionStorage.getItem(TEACHER_TOKEN_KEY) || ""; } catch(e) {}
let sharedPyqs = [];

function builtInPyqs(){
  const out = [];
  Object.keys(LIBRARY || {}).forEach(subject => {
    Object.keys(LIBRARY[subject] || {}).forEach(topic => {
      const notes = LIBRARY[subject][topic] || {};
      (notes.pyq || []).forEach(item => out.push({
        subject, topic, question: item.q || String(item),
        year: item.y || "", answer: "", source: "Built-in"
      }));
    });
  });
  return out;
}
function allPyqs(){ return [...sharedPyqs.map(x => ({...x, source:"Teacher"})), ...builtInPyqs()]; }
function escapeHtml(value){ return esc(value == null ? "" : value); }

async function loadSharedPyqs(){
  try{
    const r = await fetch("/api/pyqs");
    if(!r.ok) throw new Error("Shared PYQs are unavailable");
    const data = await r.json();
    sharedPyqs = Array.isArray(data.pyqs) ? data.pyqs : [];
  }catch(e){ sharedPyqs = []; }
  renderPyqLibrary();
  renderTeacherPublished();
}
function renderPyqLibrary(){
  const list = $("pyqList");
  if(!list) return;
  const q = ($("pyqSearch")?.value || "").trim().toLowerCase();
  const subjectFilter = $("pyqSubject")?.value || "";
  const items = allPyqs().filter(x =>
    (!subjectFilter || x.subject === subjectFilter) &&
    (!q || [x.subject,x.topic,x.question,x.year,x.answer].join(" ").toLowerCase().includes(q))
  );
  const subjectsForSelect = [...new Set(allPyqs().map(x => x.subject))].sort();
  const select = $("pyqSubject");
  if(select){
    const old = select.value;
    select.innerHTML = '<option value="">All subjects</option>' + subjectsForSelect.map(x =>
      '<option value="' + escapeHtml(x) + '">' + escapeHtml(x) + '</option>').join("");
    select.value = subjectsForSelect.includes(old) ? old : "";
  }
  if(!items.length){
    list.innerHTML = '<p class="empty">No PYQs match your search yet. Your teacher can add questions in Teacher Corner.</p>';
    return;
  }
  list.innerHTML = items.map(x =>
    '<article class="pyq-item"><div class="pyq-meta"><span class="chip">' + escapeHtml(x.subject) +
    '</span><small>' + escapeHtml(x.topic) + '</small>' +
    (x.year ? '<small>Year: ' + escapeHtml(x.year) + '</small>' : '') +
    '<small>· ' + escapeHtml(x.source) + '</small></div><b>' + escapeHtml(x.question) + '</b>' +
    (x.answer ? '<p class="pyq-answer">' + escapeHtml(x.answer) + '</p>' : '') + '</article>'
  ).join("");
}
function setTeacherMode(on){
  $("teacherLogin").hidden = on;
  $("teacherTools").hidden = !on;
  $("teacherMsg").textContent = "";
  if(on){ renderTeacherPublished(); renderTeacherMaterials(); }
}
async function teacherSignIn(){
  const msg = $("teacherMsg");
  msg.textContent = "Signing in…";
  try{
    const r = await fetch("/api/teacher/login", {method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({password:$("teacherPassword").value})});
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || "Sign in failed");
    teacherToken = data.token;
    try { sessionStorage.setItem(TEACHER_TOKEN_KEY, teacherToken); } catch(e) {}
    $("teacherPassword").value = "";
    setTeacherMode(true);
  }catch(e){ msg.textContent = e.message; }
}
async function publishPyq(){
  const msg = $("teacherMsg2");
  const payload = {
    subject:$("teacherSubject").value, topic:$("teacherTopic").value,
    year:$("teacherYear").value, question:$("teacherQuestion").value,
    answer:$("teacherAnswer").value
  };
  msg.textContent = "Publishing…";
  try{
    const r = await fetch("/api/pyqs", {method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer " + teacherToken},
      body:JSON.stringify(payload)});
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || "Could not publish");
    $("teacherQuestion").value = "";
    $("teacherAnswer").value = "";
    msg.textContent = "Published. Students can now see this PYQ.";
    await loadSharedPyqs();
  }catch(e){
    msg.textContent = e.message;
    if(/sign-in|required|unauthorized/i.test(e.message)){ teacherToken = ""; setTeacherMode(false); }
  }
}
async function deleteTeacherPyq(id){
  if(!confirm("Delete this shared PYQ?")) return;
  try{
    const r = await fetch("/api/pyqs/" + encodeURIComponent(id), {
      method:"DELETE", headers:{"Authorization":"Bearer " + teacherToken}
    });
    const data = await r.json();
    if(!r.ok) throw new Error(data.error || "Delete failed");
    await loadSharedPyqs();
  }catch(e){ $("teacherMsg2").textContent = e.message; }
}
function renderTeacherPublished(){
  const box = $("teacherPublished");
  if(!box || !teacherToken) return;
  const mine = sharedPyqs;
  box.innerHTML = mine.length ? mine.map(x =>
    '<div class="pyq-item"><b>' + escapeHtml(x.subject) + ' / ' + escapeHtml(x.topic) +
    '</b><p>' + escapeHtml(x.question) + '</p><button class="mini" data-delete-pyq="' +
    escapeHtml(x.id) + '">Delete</button></div>'
  ).join("") : '<p class="empty">No teacher-uploaded PYQs yet.</p>';
}


let sharedMaterials = [];
function refreshAskSubjects(){
  const select = $("askSubject"); if(!select) return;
  const current = select.value;
  const names = [...new Set([...Object.keys(LIBRARY||{}), ...Object.keys(custom||{}), ...sharedMaterials.map(m=>m.subject)])].sort();
  select.innerHTML = '<option value="">Auto-detect subject</option>' + names.map(n=>'<option value="'+escapeHtml(n)+'">'+escapeHtml(n)+'</option>').join("");
  if(names.includes(current)) select.value=current;
}
async function loadTeacherMaterials(){
  try{ const r=await fetch('/api/materials'); const d=await r.json(); sharedMaterials=Array.isArray(d.materials)?d.materials:[]; }
  catch(e){ sharedMaterials=[]; }
  refreshAskSubjects(); renderTeacherMaterials();
}
function renderTeacherMaterials(){
  const box=$("teacherMaterials"); if(!box || !teacherToken) return;
  box.innerHTML=sharedMaterials.length ? sharedMaterials.map(m=>'<div class="pyq-item"><b>'+escapeHtml(m.subject)+' / '+escapeHtml(m.topic)+'</b><p><small>'+escapeHtml(m.filename)+'</small></p><button class="mini" data-delete-material="'+escapeHtml(m.id)+'">Delete</button></div>').join('') : '<p class="empty">No uploaded study photos yet.</p>';
}
async function uploadStudyImage(){
  const file=$("materialFile").files[0], subject=$("materialSubject").value.trim(), topic=$("materialTopic").value.trim() || 'General notes', msg=$("materialMsg");
  if(!subject || !file){ msg.textContent='Enter a subject and choose a photo first.'; return; }
  if(file.size>4*1024*1024){ msg.textContent='Please choose an image under 4 MB.'; return; }
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){ msg.textContent='Please use a JPG, PNG or WEBP photo.'; return; }
  msg.textContent='Uploading photo and reading its text with Gemini…';
  try{
    const imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
    const r=await fetch('/api/materials',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+teacherToken},body:JSON.stringify({subject,topic,filename:file.name,mimeType:file.type,imageData})});
    const data=await r.json(); if(!r.ok) throw new Error(data.error||'Upload failed');
    msg.textContent='Photo read and saved under '+subject+'. Students can now ask questions from these notes.';
    $("materialFile").value=''; await loadTeacherMaterials();
  }catch(e){msg.textContent=e.message;}
}
async function deleteStudyMaterial(id){
  if(!confirm('Delete this uploaded study material?')) return;
  try{const r=await fetch('/api/materials/'+encodeURIComponent(id),{method:'DELETE',headers:{'Authorization':'Bearer '+teacherToken}});const d=await r.json();if(!r.ok)throw new Error(d.error||'Delete failed');await loadTeacherMaterials();}
  catch(e){$("materialMsg").textContent=e.message;}
}

if($("teacherSignIn")) $("teacherSignIn").addEventListener("click", teacherSignIn);
if($("teacherPassword")) $("teacherPassword").addEventListener("keydown", e => { if(e.key === "Enter") teacherSignIn(); });
if($("publishPyq")) $("publishPyq").addEventListener("click", publishPyq);
if($("uploadMaterial")) $("uploadMaterial").addEventListener("click", uploadStudyImage);
if($("teacherMaterials")) $("teacherMaterials").addEventListener("click", e=>{const b=e.target.closest('[data-delete-material]');if(b)deleteStudyMaterial(b.dataset.deleteMaterial);});
if($("teacherSignOut")) $("teacherSignOut").addEventListener("click", async () => {
  try{ await fetch("/api/teacher/logout", {method:"POST", headers:{"Authorization":"Bearer " + teacherToken}}); }catch(e){}
  teacherToken = "";
  try { sessionStorage.removeItem(TEACHER_TOKEN_KEY); } catch(e) {}
  setTeacherMode(false);
});
if($("pyqSearch")) $("pyqSearch").addEventListener("input", renderPyqLibrary);
if($("pyqSubject")) $("pyqSubject").addEventListener("change", renderPyqLibrary);
if($("teacherPublished")) $("teacherPublished").addEventListener("click", e => {
  const b = e.target.closest("[data-delete-pyq]");
  if(b) deleteTeacherPyq(b.dataset.deletePyq);
});
if(teacherToken) setTeacherMode(true);
loadSharedPyqs();
loadTeacherMaterials();
