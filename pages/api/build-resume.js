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

// ─── System prompt ───────────────────────────────────────────────────────────────────────
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
    console.error('Build resume error:', err.message, err.stack);
    return res.status(500).json({ error: err.message || 'Failed to generate resume. Please try again.' });
  }
}


// ─── Build the prompt ──────────────────────────────────────────────────────────────────────
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

// ─── Build Resume HTML — FlowCV style template ────────────────────────────────
function buildResumeHTML(r) {

  // Skills — two column cards
  let allSkills = [];
  if (r.skills) {
    if (Array.isArray(r.skills)) {
      allSkills = r.skills;
    } else {
      if (r.skills.technical?.length) allSkills = allSkills.concat(r.skills.technical);
      if (r.skills.tools?.length)     allSkills = allSkills.concat(r.skills.tools);
    }
  }

  // Split skills into two columns
  const half = Math.ceil(allSkills.length / 2);
  const col1 = allSkills.slice(0, half);
  const col2 = allSkills.slice(half);

  const skillsHtml = allSkills.length ? `
    <div class="skills-grid">
      <div class="skills-col">
        ${col1.map(s => `<div class="skill-item">${esc(s)}</div>`).join('')}
      </div>
      <div class="skills-col">
        ${col2.map(s => `<div class="skill-item">${esc(s)}</div>`).join('')}
      </div>
    </div>` : '';

  // Contact line items
  const contactItems = [
    r.email    ? `<span>${esc(r.email)}</span>`    : '',
    r.phone    ? `<span>${esc(r.phone)}</span>`    : '',
    r.location ? `<span>${esc(r.location)}</span>` : '',
    r.linkedin ? `<span>${esc(r.linkedin)}</span>` : '',
    r.github   ? `<span>${esc(r.github)}</span>`   : '',
    r.website  ? `<span>${esc(r.website)}</span>`  : '',
  ].filter(Boolean).join('<span class="cdot"> &nbsp;&bull;&nbsp; </span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(r.name)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Zilla+Slab:wght@400;600;700&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    background: #fff;
  }

  body {
    font-family: 'Zilla Slab', 'Georgia', 'Times New Roman', serif;
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.55;
  }

  #page {
    width: 210mm;
    min-height: 297mm;
    background: #fff;
  }

  /* ═══ HEADER — light gray background bar ═══ */
  .hdr {
    background: #e6e6e4;
    width: 100%;
    padding: 14mm 18mm 11mm 18mm;
    text-align: center;
  }

  .hdr-name {
    font-family: 'Zilla Slab', 'Georgia', serif;
    font-size: 19pt;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.5px;
    line-height: 1.15;
  }

  .hdr-title {
    font-size: 10pt;
    font-weight: 400;
    color: #444;
    margin-top: 3px;
    letter-spacing: 0.3px;
  }

  .hdr-contact {
    margin-top: 8px;
    font-size: 10.5pt;
    color: #333;
    line-height: 1.7;
  }
  .hdr-contact .cdot { color: #888; }

  /* ═══ BODY AREA ═══ */
  .body-area {
    padding: 10mm 18mm 14mm 18mm;
  }

  /* ═══ SECTION ═══ */
  .sec {
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .sec:last-child { margin-bottom: 0; }

  /* Section heading — bold centered, 11.5pt, with spacing */
  .sec-title {
    font-family: 'Zilla Slab', 'Georgia', serif;
    font-size: 11.5pt;
    font-weight: 700;
    color: #1a1a1a;
    text-align: center;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #ccc;
  }

  /* ═══ PROFILE ═══ */
  .profile-text {
    font-size: 10.5pt;
    color: #222;
    line-height: 1.65;
    text-align: justify;
  }

  /* ═══ EDUCATION ENTRY ═══ */
  .edu-entry {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .edu-entry:last-child { margin-bottom: 0; }

  /* Left column: date + location */
  .edu-left {
    min-width: 88px;
    max-width: 88px;
    flex-shrink: 0;
    font-size: 10pt;
    color: #444;
    line-height: 1.55;
  }
  .edu-date {
    font-size: 10pt;
    color: #333;
    display: block;
  }
  .edu-loc {
    font-size: 9.5pt;
    color: #666;
    display: block;
    margin-top: 2px;
  }

  /* Right column: degree + school + description */
  .edu-right {
    flex: 1;
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.55;
  }
  .edu-degree {
    font-weight: 700;
    font-size: 10.5pt;
    color: #1a1a1a;
    display: block;
  }
  .edu-school {
    font-size: 10.5pt;
    color: #333;
    display: block;
    margin-top: 1px;
  }
  .edu-desc {
    font-size: 10pt;
    color: #444;
    margin-top: 4px;
    line-height: 1.6;
    text-align: justify;
  }
  .edu-grade {
    font-size: 10pt;
    color: #555;
    margin-top: 2px;
  }

  /* ═══ EXPERIENCE ENTRY ═══ */
  .exp-entry {
    margin-bottom: 13px;
    page-break-inside: avoid;
  }
  .exp-entry:last-child { margin-bottom: 0; }

  .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .exp-company {
    font-weight: 700;
    font-size: 10.5pt;
    color: #1a1a1a;
  }
  .exp-date {
    font-size: 10pt;
    color: #555;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .exp-role {
    font-size: 10pt;
    font-style: italic;
    color: #444;
    margin-top: 1px;
  }
  .exp-loc {
    font-size: 9.5pt;
    color: #777;
    margin-top: 1px;
  }
  .exp-bullets {
    margin-top: 5px;
    padding-left: 16px;
    list-style: disc;
  }
  .exp-bullets li {
    font-size: 10pt;
    color: #222;
    margin-bottom: 3px;
    line-height: 1.55;
    page-break-inside: avoid;
  }

  /* ═══ PROJECTS ═══ */
  .proj-entry {
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .proj-entry:last-child { margin-bottom: 0; }

  .proj-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .proj-name {
    font-weight: 700;
    font-size: 10.5pt;
    color: #1a1a1a;
  }
  .proj-link {
    font-size: 9pt;
    color: #444;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .proj-subtitle {
    font-size: 10pt;
    font-style: italic;
    color: #555;
    margin-top: 2px;
  }
  .proj-tech {
    font-size: 9.5pt;
    color: #555;
    font-style: italic;
    margin-top: 1px;
  }
  .proj-desc {
    font-size: 10pt;
    color: #333;
    margin-top: 5px;
    line-height: 1.62;
    text-align: justify;
  }

  /* ═══ SKILLS — two column grid ═══ */
  .skills-grid {
    display: flex;
    gap: 24px;
  }
  .skills-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .skill-item {
    font-size: 10.5pt;
    color: #1a1a1a;
    padding: 3px 0;
    border-bottom: 0.5px solid #e8e8e8;
    line-height: 1.4;
  }
  .skill-item:last-child { border-bottom: none; }

  /* Interests inline under skills */
  .interests-row {
    margin-top: 8px;
    font-size: 10pt;
    color: #444;
    line-height: 1.6;
  }
  .interests-label {
    font-weight: 700;
    color: #1a1a1a;
    margin-right: 4px;
  }

  /* ═══ PLAIN LIST — langs, certs, achievements ═══ */
  .plain-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px 32px;
  }
  .plain-list li {
    font-size: 10.5pt;
    color: #1a1a1a;
    line-height: 1.55;
    page-break-inside: avoid;
  }

  /* ═══ TWO-COL for certs + achievements ═══ */
  .two-col {
    display: flex;
    gap: 24px;
    page-break-inside: avoid;
  }
  .two-col .sec { flex: 1; margin-bottom: 0; }

  /* ═══ DECLARATION ═══ */
  .declaration {
    margin-top: 10px;
    font-size: 10pt;
    color: #333;
    line-height: 1.65;
    text-align: justify;
  }
  .declaration-sig {
    margin-top: 14px;
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a1a1a;
  }
  .declaration-place {
    font-size: 10pt;
    color: #555;
    margin-top: 3px;
  }

  @media print {
    html, body { width: 210mm; }
    #page { min-height: 297mm; }
    .sec { page-break-inside: avoid; }
    .edu-entry, .exp-entry, .proj-entry { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div id="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-name">${esc(r.name)}</div>
    ${r.title ? `<div class="hdr-title">${esc(r.title)}</div>` : ''}
    ${contactItems ? `<div class="hdr-contact">${contactItems}</div>` : ''}
  </div>

  <div class="body-area">

    <!-- PROFILE -->
    ${r.summary ? `
    <div class="sec">
      <div class="sec-title">Profile</div>
      <p class="profile-text">${esc(r.summary)}</p>
    </div>` : ''}

    <!-- EDUCATION -->
    ${r.education?.length ? `
    <div class="sec">
      <div class="sec-title">Education</div>
      ${r.education.map(e => `
      <div class="edu-entry">
        <div class="edu-left">
          ${e.year ? `<span class="edu-date">${esc(e.year)}</span>` : ''}
          ${e.location ? `<span class="edu-loc">${esc(e.location)}</span>` : ''}
        </div>
        <div class="edu-right">
          <span class="edu-degree">${esc(e.degree)}</span>
          <span class="edu-school">${esc(e.institution)}</span>
          ${e.gpa ? `<div class="edu-grade">${esc(e.gpa)}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>` : ''}

    <!-- WORK EXPERIENCE -->
    ${r.experience?.length ? `
    <div class="sec">
      <div class="sec-title">Work Experience</div>
      ${r.experience.map(e => `
      <div class="exp-entry">
        <div class="exp-header">
          <span class="exp-company">${esc(e.company)}</span>
          <span class="exp-date">${esc(e.duration)}</span>
        </div>
        <div class="exp-role">${esc(e.role)}</div>
        ${e.location ? `<div class="exp-loc">${esc(e.location)}</div>` : ''}
        <ul class="exp-bullets">
          ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
        </ul>
      </div>`).join('')}
    </div>` : ''}

    <!-- SKILLS -->
    ${skillsHtml || r.interests?.length ? `
    <div class="sec">
      <div class="sec-title">Skills</div>
      ${skillsHtml}
      ${r.interests?.length ? `
      <div class="interests-row">
        <span class="interests-label">Interests:</span>${r.interests.map(esc).join(', ')}
      </div>` : ''}
    </div>` : ''}

    <!-- PROJECTS -->
    ${r.projects?.length ? `
    <div class="sec">
      <div class="sec-title">Projects</div>
      ${r.projects.map(p => `
      <div class="proj-entry">
        <div class="proj-title-row">
          <span class="proj-name">${esc(p.name)}</span>
          ${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank">${esc(p.link)}</a>` : ''}
        </div>
        ${p.tech ? `<div class="proj-tech">${esc(p.tech)}</div>` : ''}
        <div class="proj-desc">${esc(p.description)}</div>
      </div>`).join('')}
    </div>` : ''}

    <!-- CERTIFICATIONS + ACHIEVEMENTS -->
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

    <!-- LANGUAGES -->
    ${r.languages?.length ? `
    <div class="sec">
      <div class="sec-title">Languages</div>
      <ul class="plain-list">
        ${r.languages.map(l => `<li>${esc(l)}</li>`).join('')}
      </ul>
    </div>` : ''}

    <!-- DECLARATION -->
    <div class="sec">
      <div class="sec-title">Declaration</div>
      <p class="declaration">I hereby declare that all the information provided above is true and correct to the best of my knowledge and belief. I take full responsibility for the accuracy of the details mentioned in this resume.</p>
      <div class="declaration-sig">${esc(r.name)}</div>
      <div class="declaration-place">${esc(r.location || '')}</div>
    </div>

  </div>
</div>
</body>
</html>`;
}
