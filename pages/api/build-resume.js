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

  // Safety enforcement
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
EDUCATION: one object per level. 10th→"Secondary School Certificate (SSC)", 12th→"Higher Secondary Certificate (HSC)". Most recent first. Never drop any level.
EXPERIENCE: ${isFresher ? 'set "experience" to [].' : '3 bullet points per job starting with action verbs. Include measurable impact if mentioned.'}
PROJECTS: ${hasRealProjects ? 'extract name, tech, description. Improve language, keep facts.' : 'set "projects" to []. Do NOT invent.'}
SKILLS: technical + tools only. No soft skills. No duplicates.
HALLUCINATION: "Not provided" → empty string or [].

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

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildResumeHTML(r) {
  // Contact line
  const contacts = [
    r.phone,
    r.email,
    r.location,
    r.linkedin,
    r.github,
    r.website,
  ].filter(Boolean).map(esc).join('  |  ');

  // Section: title with horizontal rule underneath
  const section = (title, body) => !body?.trim() ? '' : `
    <div class="sec">
      <div class="sec-head">
        <span class="sec-title">${title.toUpperCase()}</span>
        <hr class="sec-rule"/>
      </div>
      ${body}
    </div>`;

  // Education
  const eduHTML = (r.education || []).map(e => `
    <div class="row">
      <div class="row-left">
        <div class="row-primary"><strong>${esc(e.institution)}</strong></div>
        <div class="row-secondary">${esc(e.degree)}</div>
        ${e.gpa ? `<div class="row-secondary">Grade: ${esc(e.gpa)}</div>` : ''}
      </div>
      <div class="row-right">
        <div class="row-date">${esc(e.year)}</div>
        ${e.location ? `<div class="row-loc">${esc(e.location)}</div>` : ''}
      </div>
    </div>`).join('');

  // Experience
  const expHTML = (r.experience || []).map(e => `
    <div class="row">
      <div class="row-left">
        <div class="row-primary"><strong>${esc(e.company)}</strong>, <em>${esc(e.role)}</em></div>
        ${(e.points||[]).length ? `<ul class="bullets">${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="row-right">
        <div class="row-date">${esc(e.duration)}</div>
        ${e.location ? `<div class="row-loc">${esc(e.location)}</div>` : ''}
      </div>
    </div>`).join('');

  // Projects
  const projHTML = (r.projects || []).map(p => `
    <div class="row">
      <div class="row-left">
        <div class="row-primary"><strong>${esc(p.name)}</strong>${p.link ? ` — <span class="link-text">${esc(p.link)}</span>` : ''}</div>
        ${p.tech ? `<div class="row-secondary">${esc(p.tech)}</div>` : ''}
        ${p.description ? `<ul class="bullets"><li>${esc(p.description)}</li></ul>` : ''}
      </div>
      <div class="row-right"></div>
    </div>`).join('');

  // Skills
  const allSkills = [
    ...(r.skills?.technical || []),
    ...(r.skills?.tools || []),
  ];
  const skillsHTML = allSkills.length
    ? `<div class="skills-wrap">${allSkills.map(s => `<span class="skill">${esc(s)}</span>`).join('')}</div>`
    : '';

  // Certifications & Achievements
  const certsHTML = (r.certifications||[]).length
    ? `<ul class="bullets">${r.certifications.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>` : '';
  const achvHTML = (r.achievements||[]).length
    ? `<ul class="bullets">${r.achievements.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>` : '';

  // Languages & Interests
  const extraLines = [
    r.languages?.length && `<div class="extra-row"><span class="extra-label">Languages:</span> ${r.languages.map(esc).join(', ')}</div>`,
    r.interests?.length && `<div class="extra-row"><span class="extra-label">Interests:</span> ${r.interests.map(esc).join(', ')}</div>`,
  ].filter(Boolean).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    background: #fff;
  }

  body {
    font-family: 'Inter', sans-serif;
    font-size: 9.5pt;
    color: #111;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  #page {
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 18mm 15mm 18mm;
  }

  /* ── HEADER ── */
  .hdr {
    text-align: center;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 2px solid #111;
  }

  .hdr-name {
    font-family: 'EB Garamond', serif;
    font-size: 26pt;
    font-weight: 700;
    color: #111;
    letter-spacing: 1px;
    line-height: 1.1;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .hdr-title {
    font-size: 10pt;
    font-weight: 500;
    color: #333;
    margin-bottom: 5px;
    letter-spacing: 0.5px;
  }

  .hdr-contacts {
    font-size: 8.5pt;
    color: #222;
    letter-spacing: 0.2px;
  }

  /* ── SECTION ── */
  .sec {
    margin-bottom: 13px;
  }

  .sec-head {
    margin-bottom: 6px;
  }

  .sec-title {
    font-family: 'EB Garamond', serif;
    font-size: 11pt;
    font-weight: 700;
    color: #111;
    letter-spacing: 1.5px;
  }

  .sec-rule {
    border: none;
    border-top: 1px solid #111;
    margin-top: 2px;
  }

  /* ── ROW: two-column (content left, date right) ── */
  .row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .row:last-child { margin-bottom: 0; }

  .row-left { flex: 1; }
  .row-right {
    min-width: 90px;
    max-width: 110px;
    text-align: right;
    flex-shrink: 0;
  }

  .row-primary {
    font-size: 9.5pt;
    color: #111;
    line-height: 1.45;
  }

  .row-secondary {
    font-size: 9pt;
    color: #333;
    margin-top: 1px;
  }

  .row-date {
    font-size: 9pt;
    color: #111;
    font-weight: 500;
    line-height: 1.45;
  }

  .row-loc {
    font-size: 8.5pt;
    color: #444;
    margin-top: 1px;
  }

  .link-text {
    font-size: 8.5pt;
    color: #333;
  }

  /* ── BULLETS ── */
  .bullets {
    list-style: none;
    padding: 0;
    margin-top: 3px;
  }

  .bullets li {
    font-size: 9pt;
    color: #111;
    line-height: 1.5;
    padding-left: 12px;
    position: relative;
    margin-bottom: 1px;
  }

  .bullets li::before {
    content: "–";
    position: absolute;
    left: 0;
    color: #111;
  }

  /* ── SKILLS ── */
  .skills-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 6px;
    padding: 2px 0;
  }

  .skill {
    font-size: 9pt;
    color: #111;
    background: #f2f2f2;
    border: 1px solid #ccc;
    padding: 2px 8px;
    border-radius: 2px;
    line-height: 1.4;
  }

  /* ── EXTRA (langs, interests) ── */
  .extra-row {
    font-size: 9pt;
    color: #111;
    line-height: 1.6;
  }

  .extra-label {
    font-weight: 600;
  }

  @media print {
    html, body { width: 210mm; }
    #page { min-height: 297mm; }
    .sec, .row { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div id="page">

  <div class="hdr">
    <div class="hdr-name">${esc(r.name)}</div>
    ${r.title ? `<div class="hdr-title">${esc(r.title)}</div>` : ''}
    ${contacts ? `<div class="hdr-contacts">${contacts}</div>` : ''}
  </div>

  ${r.summary ? section('Profile', `<div style="font-size:9.5pt;color:#111;line-height:1.6;text-align:justify">${esc(r.summary)}</div>`) : ''}
  ${eduHTML   ? section('Education', eduHTML) : ''}
  ${expHTML   ? section('Experience', expHTML) : ''}
  ${projHTML  ? section('Projects', projHTML) : ''}
  ${skillsHTML ? section('Skills', skillsHTML) : ''}
  ${certsHTML ? section('Certifications', certsHTML) : ''}
  ${achvHTML  ? section('Achievements', achvHTML) : ''}
  ${extraLines ? section('Additional Information', extraLines) : ''}

</div>
</body>
</html>`;
}
