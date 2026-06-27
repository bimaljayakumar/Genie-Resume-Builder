import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userData } = req.body;
  if (!userData?.name || !userData?.role) return res.status(400).json({ error: 'Missing required fields' });

  const isFresher = /fresher|student|no exp|0 year|zero exp|intern/i.test(userData.experience || '');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer who crafts resumes that get people hired at top companies like Google, Amazon, and McKinsey. You write ATS-optimized, human-approved resumes. Return ONLY valid JSON, no markdown, no extra text.`,
        },
        {
          role: 'user',
          content: `Create a powerful ATS-optimized resume for this candidate.

CANDIDATE DATA:
- Name: ${userData.name}
- Email: ${userData.email}
- Phone: ${userData.phone}
- Location: ${userData.location}
- Target Role: ${userData.role}
- Education: ${userData.education}
- Work Experience: ${userData.experience}
- Skills: ${userData.skills}
- Extra Info: ${userData.extra || 'none'}
- Is Fresher/Student: ${isFresher ? 'YES' : 'NO'}

Return ONLY this exact JSON:
{
  "name": "full name",
  "title": "exact target job title",
  "email": "email",
  "phone": "phone",
  "location": "city, country",
  "linkedin": "linkedin url if provided else empty string",
  "github": "github url if provided else empty string",
  "website": "website if provided else empty string",
  "summary": "2-3 sentences. RULES: (1) NEVER say X years or 0 years. (2) Fresher: start with degree and field, then top 2-3 skills, then value statement. (3) Experienced: start with role and domain expertise. No year count ever.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "duration": "Mon Year – Mon Year",
      "points": [
        "Action verb + what you did + measurable result.",
        "Action verb + what you did + measurable result.",
        "Action verb + what you did + measurable result."
      ]
    }
  ],
  "education": [
    {
      "degree": "Full Degree Name",
      "institution": "Full Institution Name",
      "location": "City, Country",
      "year": "Graduation or Expected Year",
      "gpa": "GPA if known else empty string"
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2", "skill3"],
    "tools": ["tool1", "tool2"],
    "soft": ["Communication", "Problem Solving", "Team Collaboration"]
  },
  "projects": [
    {
      "name": "Project Name",
      "tech": "Tech stack",
      "description": "What it does and the outcome or impact.",
      "link": "github or live link if provided else empty string"
    }
  ],
  "certifications": ["Certification – Issuing Body, Year"],
  "languages": ["English – Fluent"],
  "achievements": ["Notable award or achievement"]
}

STRICT RULES:
- NEVER write "0 years", "zero years", "X years of experience" — ever
- Fresher: experience array must be [] — strong projects instead
- Summary: highlight skills and education, never lack of experience
- Action verbs: Developed, Built, Engineered, Designed, Implemented, Optimized, Led, Delivered, Architected, Automated
- Every bullet starts with an action verb
- Skills must match the target role
- Empty sections use []
- Summary under 65 words`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resume = JSON.parse(cleaned);
    const html = buildResumeHTML(resume, userData.photo?.toLowerCase().startsWith('y'));

    return res.status(200).json({ html, resume });

  } catch (err) {
    console.error('Build resume error:', err);
    return res.status(500).json({ error: 'Failed to generate resume: ' + err.message });
  }
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildResumeHTML(r, showPhoto) {
  // Skills block — plain text, ATS safe
  let skillsHtml = '';
  if (r.skills) {
    if (Array.isArray(r.skills)) {
      skillsHtml = `<p class="skills-plain">${r.skills.map(s => esc(s)).join(' &nbsp;·&nbsp; ')}</p>`;
    } else {
      const cats = [];
      if (r.skills.technical?.length) cats.push({ label: 'Technical', items: r.skills.technical });
      if (r.skills.tools?.length) cats.push({ label: 'Tools & Platforms', items: r.skills.tools });
      if (r.skills.soft?.length) cats.push({ label: 'Soft Skills', items: r.skills.soft });
      skillsHtml = cats.map(c =>
        `<div class="skill-row">
          <span class="skill-label">${esc(c.label)}:</span>
          <span class="skill-values">${c.items.map(s => esc(s)).join(', ')}</span>
        </div>`
      ).join('');
    }
  }

  const contactParts = [
    r.email    ? `<span>&#9993;&nbsp;<a href="mailto:${esc(r.email)}">${esc(r.email)}</a></span>` : '',
    r.phone    ? `<span>&#9742;&nbsp;${esc(r.phone)}</span>` : '',
    r.location ? `<span>&#9679;&nbsp;${esc(r.location)}</span>` : '',
    r.linkedin ? `<span>in&nbsp;<a href="https://${esc(r.linkedin)}" target="_blank">${esc(r.linkedin)}</a></span>` : '',
    r.github   ? `<span>&#9654;&nbsp;<a href="https://${esc(r.github)}" target="_blank">${esc(r.github)}</a></span>` : '',
    r.website  ? `<span><a href="${esc(r.website)}" target="_blank">${esc(r.website)}</a></span>` : '',
  ].filter(Boolean);

  const contactLine = contactParts.join('<span class="cdot"> | </span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(r.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 10pt;
    color: #1c1c1c;
    background: #fff;
    line-height: 1.5;
  }

  #page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 14mm 16mm 14mm 16mm;
    background: #fff;
  }

  /* ── HEADER ── */
  .header {
    border-bottom: 2.5px solid #1a1a2e;
    padding-bottom: 10px;
    margin-bottom: 14px;
    text-align: center;
  }
  .name {
    font-family: 'Arial', sans-serif;
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #1a1a2e;
    line-height: 1.1;
  }
  .title {
    font-family: 'Arial', sans-serif;
    font-size: 10pt;
    font-weight: 400;
    color: #555;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .contact-bar {
    margin-top: 8px;
    font-family: 'Arial', sans-serif;
    font-size: 8pt;
    color: #444;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 2px 0;
  }
  .contact-bar a { color: #1a1a2e; text-decoration: none; }
  .cdot { margin: 0 6px; color: #bbb; }

  /* ── SECTION ── */
  .section { margin-bottom: 13px; }

  .section-title {
    font-family: 'Arial', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: #1a1a2e;
    border-bottom: 1px solid #1a1a2e;
    padding-bottom: 2px;
    margin-bottom: 8px;
  }

  /* ── SUMMARY ── */
  .summary {
    font-size: 9.5pt;
    color: #333;
    line-height: 1.65;
    font-style: italic;
  }

  /* ── EXPERIENCE ── */
  .entry { margin-bottom: 11px; }
  .entry:last-child { margin-bottom: 0; }

  .entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .entry-org {
    font-family: 'Arial', sans-serif;
    font-weight: 700;
    font-size: 10pt;
    color: #1a1a2e;
  }
  .entry-date {
    font-family: 'Arial', sans-serif;
    font-size: 8.5pt;
    color: #666;
    white-space: nowrap;
  }
  .entry-sub {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 1px;
  }
  .entry-role {
    font-size: 9.5pt;
    font-style: italic;
    color: #444;
  }
  .entry-loc {
    font-family: 'Arial', sans-serif;
    font-size: 8pt;
    color: #888;
  }
  .bullets {
    margin-top: 5px;
    padding-left: 14px;
    list-style: disc;
  }
  .bullets li {
    font-size: 9pt;
    color: #222;
    margin-bottom: 3px;
    line-height: 1.55;
    padding-left: 2px;
  }

  /* ── EDUCATION ── */
  .edu-entry { margin-bottom: 9px; }
  .edu-entry:last-child { margin-bottom: 0; }
  .edu-degree {
    font-family: 'Arial', sans-serif;
    font-weight: 700;
    font-size: 9.5pt;
    color: #1a1a2e;
  }
  .edu-inst {
    font-size: 9pt;
    color: #444;
    margin-top: 1px;
  }
  .edu-meta {
    font-family: 'Arial', sans-serif;
    font-size: 8pt;
    color: #777;
    margin-top: 1px;
  }

  /* ── PROJECTS ── */
  .proj-entry { margin-bottom: 9px; }
  .proj-entry:last-child { margin-bottom: 0; }
  .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .proj-name {
    font-family: 'Arial', sans-serif;
    font-weight: 700;
    font-size: 9.5pt;
    color: #1a1a2e;
  }
  .proj-link {
    font-family: 'Arial', sans-serif;
    font-size: 7.5pt;
    color: #1a1a2e;
    text-decoration: none;
  }
  .proj-tech {
    font-size: 8.5pt;
    color: #555;
    margin-top: 1px;
    font-style: italic;
  }
  .proj-desc {
    font-size: 9pt;
    color: #222;
    margin-top: 3px;
    line-height: 1.55;
  }

  /* ── SKILLS ── */
  .skill-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 4px;
    font-size: 9pt;
    line-height: 1.55;
  }
  .skill-label {
    font-family: 'Arial', sans-serif;
    font-weight: 700;
    color: #1a1a2e;
    min-width: 120px;
    flex-shrink: 0;
    font-size: 8.5pt;
  }
  .skill-values { color: #333; }
  .skills-plain { font-size: 9pt; color: #333; line-height: 1.7; }

  /* ── LISTS ── */
  .plain-list { list-style: none; padding: 0; }
  .plain-list li {
    font-size: 9pt;
    color: #333;
    padding-left: 12px;
    position: relative;
    margin-bottom: 3px;
    line-height: 1.55;
  }
  .plain-list li::before { content: '–'; position: absolute; left: 0; color: #aaa; }

  /* ── DIVIDER ── */
  .divider { border: none; border-top: 0.5px solid #ddd; margin: 3px 0 8px 0; }

</style>
</head>
<body>
<div id="page">

  <!-- HEADER -->
  <div class="header">
    <div class="name">${esc(r.name)}</div>
    <div class="title">${esc(r.title)}</div>
    <div class="contact-bar">${contactLine}</div>
  </div>

  <!-- SUMMARY -->
  ${r.summary ? `
  <div class="section">
    <div class="section-title">Profile</div>
    <p class="summary">${esc(r.summary)}</p>
  </div>` : ''}

  <!-- EXPERIENCE -->
  ${r.experience?.length ? `
  <div class="section">
    <div class="section-title">Work Experience</div>
    ${r.experience.map(e => `
    <div class="entry">
      <div class="entry-header">
        <span class="entry-org">${esc(e.company)}</span>
        <span class="entry-date">${esc(e.duration)}</span>
      </div>
      <div class="entry-sub">
        <span class="entry-role">${esc(e.role)}</span>
        ${e.location ? `<span class="entry-loc">${esc(e.location)}</span>` : ''}
      </div>
      <ul class="bullets">
        ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
      </ul>
    </div>`).join('')}
  </div>` : ''}

  <!-- EDUCATION -->
  ${r.education?.length ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${r.education.map(e => `
    <div class="edu-entry">
      <div class="entry-header">
        <span class="edu-degree">${esc(e.degree)}</span>
        <span class="entry-date">${esc(e.year)}</span>
      </div>
      <div class="edu-inst">${esc(e.institution)}${e.location ? ` &mdash; ${esc(e.location)}` : ''}</div>
      ${e.gpa ? `<div class="edu-meta">GPA: ${esc(e.gpa)}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  <!-- PROJECTS -->
  ${r.projects?.length ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${r.projects.map(p => `
    <div class="proj-entry">
      <div class="proj-header">
        <span class="proj-name">${esc(p.name)}</span>
        ${p.link ? `<a class="proj-link" href="${esc(p.link)}" target="_blank">${esc(p.link)}</a>` : ''}
      </div>
      ${p.tech ? `<div class="proj-tech">${esc(p.tech)}</div>` : ''}
      <div class="proj-desc">${esc(p.description)}</div>
    </div>`).join('')}
  </div>` : ''}

  <!-- SKILLS -->
  ${skillsHtml ? `
  <div class="section">
    <div class="section-title">Skills</div>
    ${skillsHtml}
  </div>` : ''}

  <!-- CERTIFICATIONS -->
  ${r.certifications?.length ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    <ul class="plain-list">
      ${r.certifications.map(c => `<li>${esc(c)}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- ACHIEVEMENTS -->
  ${r.achievements?.length ? `
  <div class="section">
    <div class="section-title">Achievements</div>
    <ul class="plain-list">
      ${r.achievements.map(a => `<li>${esc(a)}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- LANGUAGES -->
  ${r.languages?.length ? `
  <div class="section">
    <div class="section-title">Languages</div>
    <ul class="plain-list">
      ${r.languages.map(l => `<li>${esc(l)}</li>`).join('')}
    </ul>
  </div>` : ''}

</div>
</body>
</html>`;
}
