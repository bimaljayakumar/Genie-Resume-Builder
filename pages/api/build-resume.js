import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Sanitize input ────────────────────────────────────────────────────────────
function sanitize(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F]/g, ' ') // remove control chars
    .replace(/\s+/g, ' ')                    // normalize whitespace
    .trim()
    .slice(0, 2000);
}

// ─── Deduplicate a comma/semicolon separated skills string ────────────────────
function dedupeSkills(str) {
  if (!str) return '';
  const seen = new Set();
  return str
    .split(/[,;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .filter(s => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

// ─── Detect fresher strictly from experience field only ───────────────────────
function detectFresher(experience) {
  if (!experience) return true;
  return /^(fresher|no exp|no work|no experience|0 year|zero exp|intern only|fresh grad|n\/a|none|-)$/i.test(
    experience.trim()
  ) || experience.trim().length < 10;
}

// ─── Detect if user mentioned real specific projects ──────────────────────────
function detectRealProjects(extra, skills) {
  const text = `${extra} ${skills}`.toLowerCase();
  // Must have project keyword AND at least one tech/action signal
  const hasProjectWord = /\bproject\b|\bbuilt\b|\bdeveloped\b|\bcreated\b|\bdeployed\b/.test(text);
  const hasTechSignal  = /github\.com|\.com\/|html|css|react|node|python|java|flutter|android|ios|api|app|website|system/.test(text);
  return hasProjectWord && hasTechSignal;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userData } = req.body;
  if (!userData?.name || !userData?.role) {
    return res.status(400).json({ error: 'Missing required fields: name and role' });
  }

  // Sanitize every field
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

  const isFresher      = detectFresher(safe.experience);
  const hasRealProjects = detectRealProjects(safe.extra, safe.skills);

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // very low — factual, structured, no creativity
      max_tokens: 4000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_BUILD },
        { role: 'user',   content: buildPrompt(safe, isFresher, hasRealProjects) },
      ],
    });

    const raw     = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let resume;
    try {
      resume = JSON.parse(cleaned);
    } catch {
      console.error('Resume JSON parse failed. Raw:', raw.slice(0, 400));
      return res.status(500).json({ error: 'AI returned an invalid format. Please try again.' });
    }

    // ── POST-PARSE SAFETY ENFORCEMENT ─────────────────────────────────────────
    // These rules are enforced in code — AI cannot override them

    // 1. Never hallucinate projects
    if (!hasRealProjects) resume.projects = [];

    // 2. Never hallucinate experience for freshers
    if (isFresher) resume.experience = [];

    // 3. Remove soft skills — only keep technical + tools
    if (resume.skills && !Array.isArray(resume.skills)) {
      delete resume.skills.soft;
    }

    // 4. Deduplicate skills arrays
    if (resume.skills?.technical) {
      resume.skills.technical = [...new Set(resume.skills.technical.map(s => s.trim()))].filter(Boolean);
    }
    if (resume.skills?.tools) {
      resume.skills.tools = [...new Set(resume.skills.tools.map(s => s.trim()))].filter(Boolean);
    }

    // 5. Deduplicate interests
    if (resume.interests) {
      resume.interests = [...new Set(resume.interests.map(s => s.trim()))].filter(Boolean);
    }

    // 6. Validate education — must be an array
    if (!Array.isArray(resume.education)) resume.education = [];

    // 7. Remove empty certifications / achievements
    if (resume.certifications) {
      resume.certifications = resume.certifications.filter(c => c && c.trim().length > 3);
    }
    if (resume.achievements) {
      resume.achievements = resume.achievements.filter(a => a && a.trim().length > 3);
    }

    // 8. Ensure languages always includes at least English
    if (!resume.languages?.length) resume.languages = ['English'];

    const html = buildResumeHTML(resume);
    return res.status(200).json({ html, resume });

  } catch (err) {
    console.error('Build resume error:', err.message);
    return res.status(500).json({ error: 'Failed to generate resume. Please try again.' });
  }
}

// ─── System prompt for resume builder — separate from chat ────────────────────
const SYSTEM_PROMPT_BUILD = `You are a senior professional resume writer and ATS expert with 20 years of experience. 

Your responsibilities:
- Build accurate, professional, ATS-optimized resumes from provided candidate data
- Fix all grammar and spelling errors while preserving meaning
- Rewrite weak sentences into strong, professional, impact-driven ones
- NEVER invent, fabricate, or assume any information not explicitly provided
- Return ONLY valid JSON — no markdown, no extra text, no explanations

Anti-hallucination rules:
- If a field has no data → return empty string "" or empty array []
- Never guess company names, job titles, dates, skills, or achievements
- Never add certifications or projects unless explicitly mentioned
- The only creative freedom allowed is improving language quality of provided facts`;

// ─── Build the prompt — instructions separated from JSON template ─────────────
function buildPrompt(safe, isFresher, hasRealProjects) {
  const summaryRule = isFresher
    ? `SUMMARY RULE (fresher): Write exactly 3 sentences.
  Sentence 1: State their degree/field of study and the institution (e.g. "Bachelor of Computer Applications student at Mangalam College of Arts and Science").
  Sentence 2: Highlight their top 2-3 technical skills and any hands-on work (projects, self-learning, interests).
  Sentence 3: Express their motivation and the specific value they bring to the target role.
  NEVER say "0 years", "no experience", or anything about lack of experience.`
    : `SUMMARY RULE (experienced): Write exactly 3 sentences.
  Sentence 1: State their professional role and primary domain of expertise.
  Sentence 2: Highlight 2-3 key technical skills or notable achievements.
  Sentence 3: State the value and impact they bring to employers.
  NEVER mention specific year counts.`;

  const experienceRule = isFresher
    ? `EXPERIENCE RULE: Candidate is a fresher. Set "experience" to empty array []. Do not invent any work history.`
    : `EXPERIENCE RULE: Candidate has work experience. For each job: write 3 strong bullet points starting with action verbs (Developed, Led, Built, Optimized, Delivered, Implemented, Architected). Include measurable impact where the user mentioned it. Do not invent numbers or metrics not given.`;

  const projectsRule = hasRealProjects
    ? `PROJECTS RULE: Candidate mentioned real projects. Extract project name, tech stack, and description from their data. Improve the description language but keep facts unchanged.`
    : `PROJECTS RULE: Candidate did NOT mention specific projects. Set "projects" to empty array []. Do NOT invent projects.`;

  return `Build a professional ATS-optimized resume from this verified candidate data.

CANDIDATE DATA:
Name:       ${safe.name}
Email:      ${safe.email || 'Not provided'}
Phone:      ${safe.phone || 'Not provided'}
Location:   ${safe.location || 'Not provided'}
Target Role: ${safe.role}
Education:  ${safe.education || 'Not provided'}
Experience: ${safe.experience || 'fresher'}
Skills:     ${safe.skills || 'Not provided'}
Interests:  ${safe.interests || 'Not provided'}
Extra Info: ${safe.extra || 'None'}

RULES — apply ALL of these:

${summaryRule}

EDUCATION RULE:
  Parse every education level from the education string and create a SEPARATE object for each.
  - Text containing "10th" or "SSC" or school up to year 2021 → degree: "Secondary School Certificate (SSC)"
  - Text containing "12th" or "HSC" or "Plus Two" or "Higher Secondary" → degree: "Higher Secondary Certificate (HSC)"
  - Text containing degree name (BCA, BSc, BTech, BA, BCom, etc.) → use full degree name
  - Order: most recent first (College → 12th → 10th)
  - NEVER drop any education level mentioned

${experienceRule}

${projectsRule}

SKILLS RULE:
  - Only include technical skills and tools/platforms
  - NO soft skills (Communication, Teamwork, Leadership, Problem Solving — omit all of these)
  - Extract skills from both the Skills field and Interests field
  - Each skill must be a real technology, language, framework, or tool
  - Remove duplicates

GRAMMAR RULE:
  - Fix all spelling and grammar errors
  - Rewrite short or unclear sentences into proper professional English
  - Do not over-expand — medium length, natural, professional

HALLUCINATION RULE:
  - If any data field says "Not provided" or "None" → return empty string or empty array for that section
  - Never invent anything. Only use what is in the candidate data above.

Return ONLY this exact JSON structure (no other text):
{
  "name": "Properly Capitalized Full Name",
  "title": "Target Job Title",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "location": "City, Country or empty string",
  "linkedin": "linkedin url only if explicitly provided else empty string",
  "github": "github url only if explicitly provided else empty string",
  "website": "website url only if explicitly provided else empty string",
  "summary": "Exactly 3 sentences following the summary rule above",
  "experience": [],
  "education": [
    {
      "degree": "Full degree name",
      "institution": "Full institution name",
      "location": "City, Country or empty string",
      "year": "Year or duration (e.g. 2020-2021)",
      "gpa": "Grade or GPA only if mentioned, else empty string"
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2", "skill3"],
    "tools": ["tool1", "tool2"]
  },
  "interests": ["interest1", "interest2"],
  "projects": [],
  "certifications": [],
  "achievements": [],
  "languages": ["English"]
}`;
}

// ─── HTML escape ───────────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Build Resume HTML ─────────────────────────────────────────────────────────
function buildResumeHTML(r) {
  // Skills block
  let skillsHtml = '';
  if (r.skills) {
    const rows = [];
    if (Array.isArray(r.skills)) {
      if (r.skills.length) rows.push({ label: 'Skills', items: r.skills });
    } else {
      if (r.skills.technical?.length) rows.push({ label: 'Technical',       items: r.skills.technical });
      if (r.skills.tools?.length)     rows.push({ label: 'Tools & Platforms', items: r.skills.tools });
    }
    skillsHtml = rows.map(row =>
      `<div class="skill-row">
        <span class="skill-label">${esc(row.label)}</span>
        <span class="skill-val">${row.items.map(esc).join(', ')}</span>
      </div>`
    ).join('');
  }

  const interestsHtml = r.interests?.length
    ? `<div class="skill-row">
        <span class="skill-label">Interests</span>
        <span class="skill-val">${r.interests.map(esc).join(', ')}</span>
      </div>`
    : '';

  const contactParts = [
    r.email    ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>`                            : '',
    r.phone    ? esc(r.phone)                                                                       : '',
    r.location ? esc(r.location)                                                                    : '',
    r.linkedin ? `<a href="https://${esc(r.linkedin)}" target="_blank">${esc(r.linkedin)}</a>`     : '',
    r.github   ? `<a href="https://${esc(r.github)}" target="_blank">${esc(r.github)}</a>`         : '',
    r.website  ? `<a href="${esc(r.website)}" target="_blank">${esc(r.website)}</a>`               : '',
  ].filter(Boolean).join('<span class="sep"> | </span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(r.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    background: #fff;
  }

  body {
    font-family: 'Inter', 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
    font-size: 9.5pt;
    color: #1a1a1a;
    line-height: 1.5;
  }

  #page {
    width: 210mm;
    min-height: 297mm;
    padding: 13mm 16mm 13mm 16mm;
    background: #fff;
  }

  /* ── HEADER ── */
  .hdr {
    text-align: center;
    padding-bottom: 11px;
    margin-bottom: 14px;
    border-bottom: 2px solid #1b2a4a;
  }
  .hdr-name {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #1b2a4a;
    line-height: 1.1;
  }
  .hdr-title {
    font-size: 9pt;
    font-weight: 400;
    color: #607080;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 5px;
  }
  .hdr-contact {
    margin-top: 8px;
    font-size: 8pt;
    color: #333;
    line-height: 1.9;
  }
  .hdr-contact a { color: #1b2a4a; text-decoration: none; }
  .sep { color: #ccc; }

  /* ── SECTION ── */
  .sec {
    margin-bottom: 13px;
    page-break-inside: avoid;
  }
  .sec:last-child { margin-bottom: 0; }

  .sec-title {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #1b2a4a;
    border-bottom: 1.2px solid #1b2a4a;
    padding-bottom: 3px;
    margin-bottom: 9px;
  }

  /* ── PROFILE ── */
  .profile-text {
    font-size: 9pt;
    color: #222;
    line-height: 1.72;
    text-align: justify;
  }

  /* ── ENTRY (experience + education) ── */
  .entry {
    margin-bottom: 11px;
    page-break-inside: avoid;
  }
  .entry:last-child { margin-bottom: 0; }

  .entry-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .entry-org {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1b2a4a;
  }
  .entry-date {
    font-size: 8pt;
    color: #666;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .entry-sub {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 2px;
    gap: 8px;
  }
  .entry-role  { font-size: 9pt; font-style: italic; color: #444; }
  .entry-loc   { font-size: 8pt; color: #888; white-space: nowrap; flex-shrink: 0; }

  .entry-bullets {
    margin-top: 5px;
    padding-left: 15px;
    list-style: disc;
  }
  .entry-bullets li {
    font-size: 8.8pt;
    color: #1a1a1a;
    margin-bottom: 3px;
    line-height: 1.55;
    page-break-inside: avoid;
  }

  /* ── EDUCATION ── */
  .edu-sub  { font-size: 8.8pt; color: #444; margin-top: 2px; }
  .edu-meta { font-size: 8pt;   color: #777; margin-top: 1px; }

  /* ── PROJECTS ── */
  .proj {
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .proj:last-child { margin-bottom: 0; }
  .proj-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .proj-name { font-size: 9.5pt; font-weight: 700; color: #1b2a4a; }
  .proj-link { font-size: 7.5pt; color: #1b2a4a; text-decoration: none; white-space: nowrap; flex-shrink: 0; }
  .proj-tech { font-size: 8pt; font-style: italic; color: #555; margin-top: 2px; }
  .proj-desc { font-size: 8.8pt; color: #1a1a1a; margin-top: 3px; line-height: 1.55; text-align: justify; }

  /* ── SKILLS ── */
  .skill-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 5px;
    gap: 4px;
  }
  .skill-label {
    font-size: 8.5pt;
    font-weight: 700;
    color: #1b2a4a;
    min-width: 115px;
    flex-shrink: 0;
  }
  .skill-val { font-size: 8.8pt; color: #1a1a1a; line-height: 1.55; }

  /* ── PLAIN LIST ── */
  .plain-list { list-style: none; padding: 0; }
  .plain-list li {
    font-size: 8.8pt;
    color: #1a1a1a;
    padding-left: 12px;
    position: relative;
    margin-bottom: 3px;
    line-height: 1.5;
    page-break-inside: avoid;
  }
  .plain-list li::before { content: '-'; position: absolute; left: 0; color: #aaa; }

  /* ── TWO-COL ── */
  .two-col {
    display: flex;
    gap: 24px;
    page-break-inside: avoid;
  }
  .two-col .sec { flex: 1; margin-bottom: 0; }
</style>
</head>
<body>
<div id="page">

  <div class="hdr">
    <div class="hdr-name">${esc(r.name)}</div>
    <div class="hdr-title">${esc(r.title)}</div>
    ${contactParts ? `<div class="hdr-contact">${contactParts}</div>` : ''}
  </div>

  ${r.summary ? `
  <div class="sec">
    <div class="sec-title">Profile</div>
    <p class="profile-text">${esc(r.summary)}</p>
  </div>` : ''}

  ${r.experience?.length ? `
  <div class="sec">
    <div class="sec-title">Work Experience</div>
    ${r.experience.map(e => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-org">${esc(e.company)}</span>
        <span class="entry-date">${esc(e.duration)}</span>
      </div>
      <div class="entry-sub">
        <span class="entry-role">${esc(e.role)}</span>
        ${e.location ? `<span class="entry-loc">${esc(e.location)}</span>` : ''}
      </div>
      <ul class="entry-bullets">
        ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
      </ul>
    </div>`).join('')}
  </div>` : ''}

  ${r.education?.length ? `
  <div class="sec">
    <div class="sec-title">Education</div>
    ${r.education.map(e => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-org">${esc(e.degree)}</span>
        <span class="entry-date">${esc(e.year)}</span>
      </div>
      <div class="edu-sub">${esc(e.institution)}${e.location ? ` — ${esc(e.location)}` : ''}</div>
      ${e.gpa ? `<div class="edu-meta">Grade / GPA: ${esc(e.gpa)}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  ${r.projects?.length ? `
  <div class="sec">
    <div class="sec-title">Projects</div>
    ${r.projects.map(p => `
    <div class="proj">
      <div class="proj-top">
        <span class="proj-name">${esc(p.name)}</span>
        ${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank">${esc(p.link)}</a>` : ''}
      </div>
      ${p.tech ? `<div class="proj-tech">${esc(p.tech)}</div>` : ''}
      <div class="proj-desc">${esc(p.description)}</div>
    </div>`).join('')}
  </div>` : ''}

  ${skillsHtml || interestsHtml ? `
  <div class="sec">
    <div class="sec-title">Skills & Interests</div>
    ${skillsHtml}
    ${interestsHtml}
  </div>` : ''}

  ${r.certifications?.length || r.achievements?.length ? `
  <div class="two-col">
    ${r.certifications?.length ? `
    <div class="sec">
      <div class="sec-title">Certifications</div>
      <ul class="plain-list">
        ${r.certifications.map(c => `<li>${esc(c)}</li>`).join('')}
      </ul>
    </div>` : ''}
    ${r.achievements?.length ? `
    <div class="sec">
      <div class="sec-title">Achievements</div>
      <ul class="plain-list">
        ${r.achievements.map(a => `<li>${esc(a)}</li>`).join('')}
      </ul>
    </div>` : ''}
  </div>` : ''}

  ${r.languages?.length ? `
  <div class="sec">
    <div class="sec-title">Languages</div>
    <ul class="plain-list">
      ${r.languages.map(l => `<li>${esc(l)}</li>`).join('')}
    </ul>
  </div>` : ''}

</div>
</body>
</html>`;
}
