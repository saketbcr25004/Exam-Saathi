# ExamSaathi — Futuristic Edition

A complete source project for the ExamSaathi study planner, AI tutor, teacher corner, PYQ sharing and subject-wise study library.

## Included
- Complete website source: `index.html`, `style.css`, `app.js`, `data.js`, `server.js`, `package.json`.
- Futuristic dark glass / neon interface with responsive layout and light-mode toggle.
- Gemini API backend: `gemini-3.5-flash-lite` primary and `gemini-3.8-flash` fallback, bounded per-model timeout and limited retries.
- Existing study planner, topic checklist, progress, explain/quiz interactions, Ask AI, teacher login, PYQs and photo upload routes.
- `materials/` folder with uploaded source files grouped by subject, `materials.json` with extracted searchable text where extraction worked, and `materials/catalog.json` inventory.
- `pyqs.json` starter file and `.env.example` template.

## Start on a new Windows laptop
1. Install **Node.js 20 LTS or newer** from https://nodejs.org/ (choose the LTS download).
2. Download and extract this ZIP to a simple folder, for example `C:\ExamSaathi`.
3. Open that extracted folder in File Explorer.
4. Click the address bar, type `cmd`, and press Enter. This opens Command Prompt in the project folder.
5. Run `npm start`.
6. Open http://localhost:3000 in Chrome or Edge.
7. Copy `.env.example` and rename the copy to `.env`. Open `.env` in Notepad and add your Gemini API key and a teacher password. The server reads this file automatically. Do not put the real `.env` file in GitHub or share screenshots containing it.

No `npm install` is needed for the current project because it uses Node's built-in modules only.

## Deploy to Render / GitHub
1. Extract the ZIP and upload the complete project contents to the root of the GitHub repository connected to Render.
2. Include the `materials` folder and `materials.json` in the repository root.
3. Commit the changes and wait for Render to deploy.
4. In Render → Environment, set `GEMINI_API_KEY` and `TEACHER_PASSWORD`. Keep secrets out of GitHub.
5. Optional model settings: `GEMINI_MODEL=gemini-3.5-flash-lite` and `GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.8-flash`.

## Subject-wise material inventory
- `materials/DBMS/`: DBMS Unit 1, DBMS Unit 4 (NoSQL/Big Data/Security), SQL Joins, SQL Aggregate Functions, Relational Model (two versions kept separately), DBMS introduction second copy, DBMS Transactions.
- `materials/Feature_Engineering/`: Feature Engineering Unit 1 and Binning notes.
- `materials/Practical_Indexes/`: Feature Engineering practical index.
- `materials/Software_Engineering/`: Software Engineering Unit 1 and Software Requirements Specification notes.
- `materials/Statistics_BCA305/`: Correlation notes and Unit 6 Statistical Quality Control DOCX (subject label provisional from file context).
- `materials/Python/`: Python Applications and Functions notes.
- `materials/Unclassified_BCA305/`: BCA 305 Unit 1 Part 2 Numerical Part; subject needs confirmation.

Potential duplicate copies are retained, not deleted. Check `materials/catalog.json` for the full file inventory and review flags.

## Important notes
- Original PDFs/DOCX files are retained. `materials.json` includes extracted text only where text extraction succeeded. Scanned pages may require OCR and manual review; consult the original PDF for diagrams and image-only pages.
- Some BCA 305 content remains provisionally categorized; confirm its exact subject before using it as a subject-specific AI source.
- The Feature Engineering practical file is an index of experiments, not full practical solutions.
- This build reduces long retry chains but cannot guarantee instant responses during Gemini outages, rate limits or network problems. It does not yet stream tokens progressively.
- Render local disk can be ephemeral. To keep teacher uploads after redeploys/restarts, configure a persistent disk or external database/object storage.

## Security
Never commit API keys or teacher passwords. If either was exposed in a screenshot or repository, rotate it and update the Render Environment variables.


## Learning features update
- Explain Simply and Quiz Me use the subject-specific `/api/learn` endpoint.
- AI output is required to be English only; offline fallback is also English.
- Study PDFs and DOCX notes are indexed in `materials.json` and stored under `materials/`.
- Keep `GEMINI_API_KEY` and `TEACHER_PASSWORD` in Render Environment Variables; never commit `.env`.


## Out-of-syllabus AI support
- Ask AI answers questions even when they are outside the uploaded notes or syllabus, using Gemini general knowledge.
- Explain Simply and Quiz Me can also cover topics not present in the uploaded notes.
- Uploaded notes are used as supporting context, not as a restriction. The tutor should state uncertainty instead of inventing facts.


## Automatic English exam answers
- Ask AI, Explain Simply, Quiz Me, and generated answers are instructed to respond in English only.
- Short, Medium, Long, and PYQ tabs automatically generate exam-style questions with model answers when the local notes library has no matching content.
- The generator uses uploaded study notes when relevant and falls back to general knowledge for missing or out-of-syllabus topics.
- Generated PYQ-style questions are practice questions, not claims about actual previous exam papers.
- Set `GEMINI_API_KEY` in Render Environment Variables. The server tries `gemini-3.5-flash-lite` first and `gemini-3.8-flash` as a fallback. An API key and available Gemini quota are required; no app can call a paid/hosted AI model without valid credentials.
