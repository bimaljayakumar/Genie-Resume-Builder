import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const config = { api: { responseLimit: '10mb' } };

function sanitize(val) {
  if (!val || typeof val !== 'string') return '';
  return val.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 2000);
}
function dedupeSkills(str) {
  if (!str) return '';
  const seen = new Set();
  return str.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
    .filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .join(', ');
}
function detectFresher(exp) {
  if (!exp) return true;
  return /^(fresher|no exp|no work|no experience|0 year|zero|intern only|fresh grad|n\/a|none|-)$/i.test(exp.trim()) || exp.trim().length < 10;
}
function detectRealProjects(extra, skills) {
  const t = `${extra} ${skills}`.toLowerCase();
  return /\bproject\b|\bbuilt\b|\bdeveloped\b|\bcreated\b|\bdeployed\b/.test(t) &&
    /html|css|react|node|python|java|flutter|android|ios|api|app|website|system|github/.test(t);
}

const SYSTEM_PROMPT = `You are a senior professional resume writer and ATS expert.
- Build accurate, professional resumes from provided candidate data
- Fix grammar/spelling errors while preserving meaning
- NEVER invent or fabricate any information
- Return ONLY valid JSON — no markdown, no extra text`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { userData } = req.body;
  if (!userData?.name || !userData?.role)
    return res.status(400).json({ error: 'Missing required fields: name and role' });

  const safe = {
    name:       sanitize(userData.name),
    email:      sanitize(userData.email),
    phone:      sanitize(userData.phone),
    location:   sanitize(userData.location),
    role:       sanitize(userData.role),
    education:  sanitize(userData.education),
    experience: sanitize(userData.experience),
    skills:     dedupeSkills(sanitize(userData.skills)),
    interests:  sanitize(userData.interests),
    extra:      sanitize(userData.extra),
  };

  const isFresher       = detectFresher(safe.experience);
  const hasRealProjects = detectRealProjects(safe.extra, safe.skills);

  let resume;
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildPrompt(safe, isFresher, hasRealProjects) },
      ],
    });
    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try { resume = JSON.parse(cleaned); }
    catch { return res.status(500).json({ error: 'AI returned invalid format. Please try again.' }); }
  } catch (err) {
    if (err.status === 429 || err.message?.includes('rate_limit_exceeded') || err.message?.includes('Rate limit'))
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a few minutes and try again.' });
    return res.status(500).json({ error: err.message || 'Failed to generate resume.' });
  }

  // Safety
  if (!hasRealProjects) resume.projects = [];
  if (isFresher)        resume.experience = [];
  if (resume.skills?.technical) resume.skills.technical = [...new Set(resume.skills.technical.map(s => s.trim()))].filter(Boolean);
  if (resume.skills?.tools)     resume.skills.tools     = [...new Set(resume.skills.tools.map(s => s.trim()))].filter(Boolean);
  if (resume.interests)         resume.interests        = [...new Set(resume.interests.map(s => s.trim()))].filter(Boolean);
  if (!Array.isArray(resume.education)) resume.education = [];
  if (resume.certifications) resume.certifications = resume.certifications.filter(c => c?.trim().length > 3);
  if (resume.achievements)   resume.achievements   = resume.achievements.filter(a => a?.trim().length > 3);
  if (!resume.languages?.length) resume.languages = ['English'];

  const html = buildResumeHTML(resume);
  return res.status(200).json({ html, resume });
}

function buildPrompt(safe, isFresher, hasRealProjects) {
  return `Build a professional ATS resume from this data.

Name: ${safe.name}
Email: ${safe.email || 'Not provided'}
Phone: ${safe.phone || 'Not provided'}
Location: ${safe.location || 'Not provided'}
Target Role: ${safe.role}
Education: ${safe.education || 'Not provided'}
Experience: ${safe.experience || 'fresher'}
Skills: ${safe.skills || 'Not provided'}
Interests: ${safe.interests || 'Not provided'}
Extra: ${safe.extra || 'None'}

RULES:
SUMMARY: 3 sentences. ${isFresher ? 'S1: degree+institution. S2: top skills+hands-on work. S3: motivation+value. Never mention lack of experience.' : 'S1: role+domain. S2: key skills/achievements. S3: value to employers.'}
EDUCATION: separate object per level. 10th→"Secondary School Certificate (SSC)", 12th→"Higher Secondary Certificate (HSC)". Most recent first. Never drop any level mentioned.
EXPERIENCE: ${isFresher ? 'fresher — set "experience" to [].' : '3 bullet points per job with action verbs. Include measurable impact if mentioned.'}
PROJECTS: ${hasRealProjects ? 'extract name, tech, description. Improve language, keep facts.' : 'set "projects" to []. Do NOT invent.'}
SKILLS: technical + tools only. No soft skills. No duplicates.
HALLUCINATION: "Not provided" fields → empty string or [].

Return ONLY this JSON:
{
  "name": "", "title": "", "email": "", "phone": "", "location": "",
  "linkedin": "", "github": "", "website": "", "summary": "",
  "experience": [{"company":"","role":"","duration":"","location":"","points":[]}],
  "education": [{"degree":"","institution":"","location":"","year":"","gpa":""}],
  "skills": {"technical":[],"tools":[]},
  "interests": [], "projects": [{"name":"","tech":"","description":"","link":""}],
  "certifications": [], "achievements": [], "languages": ["English"]
}`;
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── RenderCV Classic Theme — exact replica ────────────────────────────────────
function buildResumeHTML(r) {

  // Connections row (header) — same icons as rendercv
  const connParts = [
    r.location && `<span class="conn"><svg class="icon" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192 384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>${esc(r.location)}</span>`,
    r.phone    && `<span class="conn"><svg class="icon" viewBox="0 0 512 512"><path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C11.2 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-11.2 38.6-27.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z"/></svg>${esc(r.phone)}</span>`,
    r.email    && `<span class="conn"><svg class="icon" viewBox="0 0 512 512"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>${esc(r.email)}</span>`,
    r.website  && `<span class="conn"><svg class="icon" viewBox="0 0 640 512"><path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C75 372 75 321 106.5 289.5L217.7 178.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.8l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z"/></svg>${esc(r.website)}</span>`,
    r.linkedin && `<span class="conn"><svg class="icon" viewBox="0 0 448 512"><path d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>${esc(r.linkedin)}</span>`,
    r.github   && `<span class="conn"><svg class="icon" viewBox="0 0 496 512"><path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 389.5 8 244.8 8z"/></svg>${esc(r.github)}</span>`,
  ].filter(Boolean);

  // Section builder — rendercv style: title + full-width line
  const section = (title, content) => !content ? '' : `
  <div class="section">
    <div class="section-title">${title}<span class="section-line"></span></div>
    ${content}
  </div>`;

  // Education entries
  const eduHTML = (r.education || []).map(e => `
    <div class="entry">
      <div class="entry-right">
        <div class="entry-date">${esc(e.year)}</div>
        ${e.location ? `<div class="entry-loc">${esc(e.location)}</div>` : ''}
      </div>
      <div class="entry-main">
        <div class="entry-title"><strong>${esc(e.institution)}</strong>, ${esc(e.degree)}</div>
        ${e.gpa ? `<ul class="highlights"><li>Grade: ${esc(e.gpa)}</li></ul>` : ''}
      </div>
    </div>`).join('');

  // Experience entries
  const expHTML = (r.experience || []).map(e => `
    <div class="entry">
      <div class="entry-right">
        <div class="entry-date">${esc(e.duration)}</div>
        ${e.location ? `<div class="entry-loc">${esc(e.location)}</div>` : ''}
      </div>
      <div class="entry-main">
        <div class="entry-title"><strong>${esc(e.company)}</strong>, ${esc(e.role)}</div>
        ${(e.points||[]).length ? `<ul class="highlights">${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('');

  // Project entries
  const projHTML = (r.projects || []).map(p => `
    <div class="entry">
      <div class="entry-right">
        ${p.link ? `<div class="entry-date-link"><a href="${esc(p.link)}">${esc(p.link)}</a></div>` : ''}
      </div>
      <div class="entry-main">
        <div class="entry-title"><strong>${esc(p.name)}</strong></div>
        ${p.tech ? `<div class="entry-sub">${esc(p.tech)}</div>` : ''}
        ${p.description ? `<ul class="highlights"><li>${esc(p.description)}</li></ul>` : ''}
      </div>
    </div>`).join('');

  // Skills — one-line entries: "Label: details"
  const skillLines = [];
  if (r.skills?.technical?.length) skillLines.push({ label: 'Technical Skills', details: r.skills.technical.join(', ') });
  if (r.skills?.tools?.length)     skillLines.push({ label: 'Tools & Platforms', details: r.skills.tools.join(', ') });
  const skillsHTML = skillLines.map(s =>
    `<div class="oneline"><strong>${esc(s.label)}:</strong> ${esc(s.details)}</div>`
  ).join('');

  // Certifications & Achievements as bullet entries
  const certsHTML = (r.certifications||[]).map(c => `<div class="bullet">• ${esc(c)}</div>`).join('');
  const achvHTML  = (r.achievements||[]).map(a => `<div class="bullet">• ${esc(a)}</div>`).join('');

  // Languages & Interests as one-line
  const langHTML = r.languages?.length
    ? `<div class="oneline"><strong>Languages:</strong> ${r.languages.map(esc).join(', ')}</div>` : '';
  const intHTML  = r.interests?.length
    ? `<div class="oneline"><strong>Interests:</strong> ${r.interests.map(esc).join(', ')}</div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 8.5in;
    background: #fff;
  }

  body {
    font-family: 'Source Sans 3', sans-serif;
    font-size: 10pt;
    color: #000;
    line-height: 1.4;
  }

  #page {
    width: 8.5in;
    min-height: 11in;
    padding: 0.7in;
  }

  /* ── HEADER ── */
  .header {
    text-align: left;
    margin-bottom: 0.4cm;
  }

  .header-name {
    font-size: 30pt;
    font-weight: 700;
    color: rgb(0,79,144);
    line-height: 1.1;
    margin-bottom: 0.2cm;
  }

  .header-headline {
    font-size: 10pt;
    color: rgb(0,79,144);
    margin-bottom: 0.25cm;
  }

  .connections {
    display: flex;
    flex-wrap: wrap;
    gap: 0 0.5cm;
    font-size: 10pt;
    color: rgb(0,79,144);
    margin-bottom: 0.1cm;
  }

  .conn {
    display: flex;
    align-items: center;
    gap: 0.15cm;
    color: rgb(0,79,144);
  }

  .icon {
    width: 9pt;
    height: 9pt;
    fill: rgb(0,79,144);
    flex-shrink: 0;
  }

  /* ── SECTION ── */
  .section {
    margin-bottom: 0.3cm;
  }

  .section-title {
    font-size: 1.4em;
    font-weight: 700;
    color: rgb(0,79,144);
    display: flex;
    align-items: center;
    gap: 0.2cm;
    margin-top: 0.5cm;
    margin-bottom: 0.3cm;
    line-height: 1;
  }

  .section-line {
    flex: 1;
    display: inline-block;
    height: 0.5pt;
    background: rgb(0,79,144);
    margin-left: 0.2cm;
  }

  /* ── ENTRY: two-column layout (main left, date+loc right) ── */
  .entry {
    display: flex;
    flex-direction: row-reverse;  /* date column on right */
    gap: 0.1cm;
    margin-bottom: 1.2em;
  }
  .entry:last-child { margin-bottom: 0; }

  .entry-right {
    width: 4.15cm;
    flex-shrink: 0;
    text-align: right;
    font-size: 10pt;
    color: #000;
    line-height: 1.4;
  }

  .entry-date {
    font-size: 10pt;
    color: #000;
  }

  .entry-date-link a {
    font-size: 9pt;
    color: rgb(0,79,144);
    text-decoration: none;
  }

  .entry-loc {
    font-size: 10pt;
    color: #000;
    margin-top: 1pt;
  }

  .entry-main {
    flex: 1;
    padding-left: 0.2cm;
    padding-right: 0.2cm;
  }

  .entry-title {
    font-size: 10pt;
    line-height: 1.4;
    color: #000;
  }

  .entry-sub {
    font-size: 10pt;
    color: #444;
    margin-top: 1pt;
    font-style: italic;
  }

  .highlights {
    margin-top: 0.12cm;
    padding-left: 0.15cm;
    list-style: none;
  }

  .highlights li {
    font-size: 10pt;
    color: #000;
    line-height: 1.4;
    padding-left: 0.65em;
    position: relative;
    margin-bottom: 0;
  }

  .highlights li::before {
    content: "•";
    position: absolute;
    left: 0;
    color: #000;
  }

  /* ── ONE-LINE ENTRY (skills, languages) ── */
  .oneline {
    font-size: 10pt;
    color: #000;
    line-height: 1.6;
    padding-left: 0.2cm;
  }

  /* ── BULLET ENTRY ── */
  .bullet {
    font-size: 10pt;
    color: #000;
    line-height: 1.5;
    padding-left: 0.2cm;
  }

  @media print {
    html, body { width: 8.5in; }
    #page { min-height: 11in; }
    .section, .entry { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div id="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-name">${esc(r.name)}</div>
    ${r.title ? `<div class="header-headline">${esc(r.title)}</div>` : ''}
    ${connParts.length ? `<div class="connections">${connParts.join('')}</div>` : ''}
  </div>

  ${r.summary ? section('Summary', `<div class="oneline">${esc(r.summary)}</div>`) : ''}
  ${eduHTML   ? section('Education', eduHTML) : ''}
  ${expHTML   ? section('Experience', expHTML) : ''}
  ${projHTML  ? section('Projects', projHTML) : ''}
  ${skillsHTML ? section('Skills', skillsHTML) : ''}
  ${(certsHTML || achvHTML) ? `
  <div class="two-col-sections" style="display:flex;gap:1cm">
    ${certsHTML ? section('Certifications', certsHTML) : ''}
    ${achvHTML  ? section('Achievements', achvHTML) : ''}
  </div>` : ''}
  ${(langHTML || intHTML) ? section('Languages & Interests', langHTML + intHTML) : ''}

</div>
</body>
</html>`;
}
