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
  return str.split(/[,;]+/).map(s => s.trim()).filter(s => s.length > 0)
    .filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .join(', ');
}

function detectFresher(experience) {
  if (!experience) return true;
  return /^(fresher|no exp|no work|no experience|0 year|zero exp|intern only|fresh grad|n\/a|none|-)$/i.test(experience.trim()) || experience.trim().length < 10;
}

function detectRealProjects(extra, skills) {
  const text = `${extra} ${skills}`.toLowerCase();
  return /\bproject\b|\bbuilt\b|\bdeveloped\b|\bcreated\b|\bdeployed\b/.test(text) &&
    /github\.com|html|css|react|node|python|java|flutter|android|ios|api|app|website|system/.test(text);
}

const SYSTEM_PROMPT = `You are a senior professional resume writer and ATS expert.
- Build accurate, professional, ATS-optimized resumes from provided candidate data
- Fix grammar and spelling errors while preserving meaning
- NEVER invent or fabricate any information not explicitly provided
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

    const raw     = completion.choices[0]?.message?.content?.trim() || '';
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
  const summaryRule = isFresher
    ? `SUMMARY (fresher): 3 sentences. S1: degree/field + institution. S2: top 2-3 skills + hands-on work. S3: motivation + value for target role. NEVER mention lack of experience.`
    : `SUMMARY (experienced): 3 sentences. S1: role + domain. S2: key skills/achievements. S3: value to employers.`;

  const expRule = isFresher
    ? `EXPERIENCE: fresher — set "experience" to [].`
    : `EXPERIENCE: 3 bullet points per job starting with action verbs. Include measurable impact if mentioned.`;

  const projRule = hasRealProjects
    ? `PROJECTS: extract name, tech, description from data. Improve language, keep facts.`
    : `PROJECTS: set "projects" to []. Do NOT invent.`;

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
${summaryRule}
EDUCATION: separate object per level. 10th→"Secondary School Certificate (SSC)", 12th→"Higher Secondary Certificate (HSC)". Most recent first. Never drop any level.
${expRule}
${projRule}
SKILLS: technical + tools only. No soft skills. No duplicates.
HALLUCINATION: "Not provided" fields → empty string or [].

Return ONLY this JSON:
{
  "name": "", "title": "", "email": "", "phone": "", "location": "",
  "linkedin": "", "github": "", "website": "",
  "summary": "",
  "experience": [{"company":"","role":"","duration":"","location":"","points":[]}],
  "education": [{"degree":"","institution":"","location":"","year":"","gpa":""}],
  "skills": {"technical": [], "tools": []},
  "interests": [], "projects": [{"name":"","tech":"","description":"","link":""}],
  "certifications": [], "achievements": [], "languages": ["English"]
}`;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function buildResumeHTML(r) {
  const allSkills = [
    ...(r.skills?.technical || []),
    ...(r.skills?.tools || []),
  ];

  const contacts = [
    r.email    && `<span>${esc(r.email)}</span>`,
    r.phone    && `<span>${esc(r.phone)}</span>`,
    r.location && `<span>${esc(r.location)}</span>`,
    r.linkedin && `<span>${esc(r.linkedin)}</span>`,
    r.github   && `<span>${esc(r.github)}</span>`,
    r.website  && `<span>${esc(r.website)}</span>`,
  ].filter(Boolean).join('<span class="sep"> | </span>');

  const section = (title, content) => content ? `
    <div class="sec">
      <div class="sec-title">${title}</div>
      <div class="sec-line"></div>
      ${content}
    </div>` : '';

  // Summary
  const summaryHtml = r.summary ? `<p class="summary">${esc(r.summary)}</p>` : '';

  // Education
  const educationHtml = r.education?.length ? r.education.map(e => `
    <div class="entry">
      <div class="entry-left">
        <div class="entry-date">${esc(e.year)}</div>
        ${e.location ? `<div class="entry-loc">${esc(e.location)}</div>` : ''}
      </div>
      <div class="entry-right">
        <div class="entry-head"><span class="entry-bold">${esc(e.institution)}</span></div>
        <div class="entry-sub">${esc(e.degree)}</div>
        ${e.gpa ? `<div class="entry-sub">Grade: ${esc(e.gpa)}</div>` : ''}
      </div>
    </div>`).join('') : '';

  // Experience
  const experienceHtml = r.experience?.length ? r.experience.map(e => `
    <div class="entry">
      <div class="entry-left">
        <div class="entry-date">${esc(e.duration)}</div>
        ${e.location ? `<div class="entry-loc">${esc(e.location)}</div>` : ''}
      </div>
      <div class="entry-right">
        <div class="entry-head"><span class="entry-bold">${esc(e.company)}</span><span class="entry-role">, ${esc(e.role)}</span></div>
        ${(e.points||[]).length ? `<ul class="bullets">${e.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>` : ''}
      </div>
    </div>`).join('') : '';

  // Projects
  const projectsHtml = r.projects?.length ? r.projects.map(p => `
    <div class="entry">
      <div class="entry-left"></div>
      <div class="entry-right">
        <div class="entry-head">
          <span class="entry-bold">${esc(p.name)}</span>
          ${p.link ? `<span class="entry-link"> — ${esc(p.link)}</span>` : ''}
        </div>
        ${p.tech ? `<div class="entry-sub">${esc(p.tech)}</div>` : ''}
        ${p.description ? `<p class="entry-desc">${esc(p.description)}</p>` : ''}
      </div>
    </div>`).join('') : '';

  // Skills
  const skillsHtml = allSkills.length ? `
    <div class="skills-wrap">
      ${allSkills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}
    </div>` : '';

  // One-line sections helper
  const listHtml = arr => arr?.length
    ? `<p class="oneline">${arr.map(esc).join(' &nbsp;•&nbsp; ')}</p>`
    : '';

  // Certifications + Achievements side by side
  const certsAchv = (r.certifications?.length || r.achievements?.length) ? `
    <div class="two-col">
      ${r.certifications?.length ? `<div class="two-col-item">
        <div class="sec"><div class="sec-title">Certifications</div><div class="sec-line"></div>
          <ul class="plain-list">${r.certifications.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>
        </div></div>` : ''}
      ${r.achievements?.length ? `<div class="two-col-item">
        <div class="sec"><div class="sec-title">Achievements</div><div class="sec-line"></div>
          <ul class="plain-list">${r.achievements.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>
        </div></div>` : ''}
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
  *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:210mm; background:#fff; }
  body {
    font-family: 'Source Sans 3', 'Arial', sans-serif;
    font-size: 10pt;
    color: #1a1a1a;
    line-height: 1.5;
  }
  #page { width:210mm; min-height:297mm; padding: 12mm 16mm 14mm 16mm; }

  /* Header */
  .hdr { text-align:center; margin-bottom: 10px; }
  .hdr-name { font-size:22pt; font-weight:700; color:#1a1a1a; letter-spacing:0.5px; }
  .hdr-title { font-size:10.5pt; color:#444; margin-top:2px; }
  .hdr-contact { margin-top:6px; font-size:9.5pt; color:#333; }
  .hdr-contact .sep { color:#aaa; margin:0 2px; }

  /* Section */
  .sec { margin-bottom:12px; }
  .sec-title {
    font-size:10.5pt; font-weight:700; text-transform:uppercase;
    letter-spacing:1.2px; color:#004f90; margin-bottom:2px;
  }
  .sec-line { height:1px; background:#004f90; margin-bottom:7px; }

  /* Summary */
  .summary { font-size:10pt; color:#222; line-height:1.65; text-align:justify; }

  /* Entry layout */
  .entry { display:flex; gap:10px; margin-bottom:10px; }
  .entry:last-child { margin-bottom:0; }
  .entry-left { min-width:82px; max-width:82px; flex-shrink:0; }
  .entry-date { font-size:9.5pt; color:#444; line-height:1.4; }
  .entry-loc  { font-size:9pt; color:#777; margin-top:1px; }
  .entry-right { flex:1; }
  .entry-head { font-size:10.5pt; color:#1a1a1a; line-height:1.4; }
  .entry-bold { font-weight:700; }
  .entry-role { font-style:italic; color:#444; }
  .entry-link { font-size:9pt; color:#555; }
  .entry-sub  { font-size:9.5pt; color:#555; margin-top:1px; }
  .entry-desc { font-size:9.5pt; color:#333; margin-top:3px; line-height:1.6; text-align:justify; }
  .bullets { padding-left:14px; margin-top:4px; list-style:disc; }
  .bullets li { font-size:9.5pt; color:#222; margin-bottom:2px; line-height:1.5; }

  /* Skills */
  .skills-wrap { display:flex; flex-wrap:wrap; gap:4px 6px; }
  .skill-tag {
    font-size:9.5pt; color:#1a1a1a; padding:2px 8px;
    border:0.75px solid #ccc; border-radius:3px;
    background:#f7f7f7;
  }

  /* Interests / Languages inline */
  .oneline { font-size:10pt; color:#222; line-height:1.6; }

  /* Plain list */
  .plain-list { list-style:none; padding:0; }
  .plain-list li { font-size:10pt; color:#1a1a1a; margin-bottom:2px; padding-left:10px; position:relative; }
  .plain-list li::before { content:"•"; position:absolute; left:0; color:#004f90; }

  /* Two column */
  .two-col { display:flex; gap:20px; }
  .two-col-item { flex:1; }

  /* Declaration */
  .declaration { font-size:9.5pt; color:#444; line-height:1.65; text-align:justify; }
  .decl-sig { margin-top:10px; font-size:10pt; font-weight:700; }
  .decl-place { font-size:9.5pt; color:#666; }

  @media print {
    html, body { width:210mm; }
    #page { min-height:297mm; }
  }
</style>
</head>
<body>
<div id="page">

  <div class="hdr">
    <div class="hdr-name">${esc(r.name)}</div>
    ${r.title ? `<div class="hdr-title">${esc(r.title)}</div>` : ''}
    ${contacts ? `<div class="hdr-contact">${contacts}</div>` : ''}
  </div>

  ${section('Profile', summaryHtml)}
  ${section('Education', educationHtml)}
  ${section('Work Experience', experienceHtml)}
  ${section('Projects', projectsHtml)}
  ${section('Skills', skillsHtml)}
  ${r.interests?.length ? section('Interests', listHtml(r.interests)) : ''}
  ${certsAchv}
  ${r.languages?.length ? section('Languages', listHtml(r.languages)) : ''}

  <div class="sec">
    <div class="sec-title">Declaration</div>
    <div class="sec-line"></div>
    <p class="declaration">I hereby declare that all the information provided above is true and correct to the best of my knowledge and belief.</p>
    <div class="decl-sig">${esc(r.name)}</div>
    ${r.location ? `<div class="decl-place">${esc(r.location)}</div>` : ''}
  </div>

</div>
</body>
</html>`;
}
