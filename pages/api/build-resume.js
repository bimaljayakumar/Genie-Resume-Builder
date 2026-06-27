import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userData } = req.body;
  if (!userData?.name || !userData?.role) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        {
          role: 'system',
          content: `You are a professional resume writer with 15 years of experience. You write resumes that pass ATS systems and impress hiring managers. Return ONLY valid JSON, no markdown, no extra text whatsoever.`,
        },
        {
          role: 'user',
          content: `Create a complete ATS-optimized professional resume for this candidate.

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

Return ONLY this exact JSON (no markdown, no extra text):
{
  "name": "full name",
  "title": "exact target job title",
  "email": "email",
  "phone": "phone",
  "location": "city, country",
  "linkedin": "linkedin url if provided else empty string",
  "github": "github url if provided else empty string",
  "website": "website if provided else empty string",
  "summary": "A 2-3 sentence professional summary. Start with job title and years of experience. Include 2-3 key skills and a value statement. Make it ATS-friendly with role-specific keywords.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "duration": "Month Year – Month Year",
      "points": [
        "Started with action verb. Quantify impact with numbers/percentages where possible.",
        "Another strong achievement with measurable result.",
        "Third bullet showing technical skill or leadership."
      ]
    }
  ],
  "education": [
    {
      "degree": "Full Degree Name e.g. Bachelor of Technology in Computer Science",
      "institution": "Full Institution Name",
      "location": "City, Country",
      "year": "Year of graduation or expected year",
      "gpa": "GPA or grade if known else empty string"
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2", "skill3"],
    "tools": ["tool1", "tool2"],
    "soft": ["Communication", "Problem Solving", "Teamwork"]
  },
  "projects": [
    {
      "name": "Project Name",
      "tech": "Technologies used",
      "description": "One sentence describing what it does and its impact.",
      "link": "github or live link if provided else empty string"
    }
  ],
  "certifications": ["Certification Name – Issuing Body, Year"],
  "languages": ["English – Fluent"],
  "achievements": ["Any notable award or achievement"]
}

IMPORTANT RULES:
- If experience is "fresher" or student, leave experience array empty and make projects section strong instead
- Use STRONG action verbs: Developed, Engineered, Designed, Led, Built, Optimized, Implemented, Achieved, Delivered, Increased, Reduced
- Add ATS keywords specific to the target role throughout
- Make bullets impactful and quantified where possible
- Skills must be relevant to the target role
- Keep summary under 60 words
- If any section has no data, use empty array []`,
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

function buildResumeHTML(r, showPhoto) {
  // Flatten skills — handle both object and array format
  let skillsHtml = '';
  if (r.skills) {
    if (Array.isArray(r.skills)) {
      skillsHtml = r.skills.map(s => `<span class="skill-chip">${esc(s)}</span>`).join('');
    } else {
      const cats = [];
      if (r.skills.technical?.length) cats.push({ label: 'Technical', items: r.skills.technical });
      if (r.skills.tools?.length) cats.push({ label: 'Tools & Platforms', items: r.skills.tools });
      if (r.skills.soft?.length) cats.push({ label: 'Soft Skills', items: r.skills.soft });
      skillsHtml = cats.map(c =>
        `<div class="skill-row"><span class="skill-cat">${esc(c.label)}:</span> ${c.items.map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>`
      ).join('');
    }
  }

  const contactItems = [
    r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '',
    r.phone ? `<span>${esc(r.phone)}</span>` : '',
    r.location ? `<span>${esc(r.location)}</span>` : '',
    r.linkedin ? `<a href="https://${esc(r.linkedin)}" target="_blank">${esc(r.linkedin)}</a>` : '',
    r.github ? `<a href="https://${esc(r.github)}" target="_blank">${esc(r.github)}</a>` : '',
    r.website ? `<a href="${esc(r.website)}" target="_blank">${esc(r.website)}</a>` : '',
  ].filter(Boolean).join('<span class="sep">|</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(r.name)} — Resume</title>
<style>
  /* ── Reset ── */
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  /* ── Page / Print ── */
  html { font-size: 10.5pt; }
  body {
    font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.6;
    max-width: 210mm;
    margin: 0 auto;
    padding: 18mm 18mm 18mm 18mm;
  }
  @page { size: A4; margin: 18mm 18mm; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    a { color: inherit !important; text-decoration: none !important; }
  }

  /* ── Header ── */
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; }
  .name { font-size: 22pt; font-weight: 700; letter-spacing: 0.5px; color: #0a0a0a; line-height: 1.2; }
  .job-title { font-size: 10.5pt; color: #444; font-weight: 500; margin-top: 4px; letter-spacing: 0.3px; }
  .contact-line {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 4px 0; margin-top: 8px; font-size: 8.5pt; color: #333;
  }
  .contact-line a { color: #333; text-decoration: none; }
  .contact-line a:hover { text-decoration: underline; }
  .sep { margin: 0 8px; color: #999; }

  /* ── Section ── */
  .section { margin-bottom: 18px; }
  .section-heading {
    font-size: 9.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #0a0a0a;
    border-bottom: 1.5px solid #1a1a1a;
    padding-bottom: 3px;
    margin-bottom: 10px;
  }

  /* ── Summary ── */
  .summary-text { font-size: 9.5pt; color: #222; line-height: 1.7; }

  /* ── Experience ── */
  .exp-item { margin-bottom: 14px; }
  .exp-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .exp-company { font-weight: 700; font-size: 10pt; color: #0a0a0a; }
  .exp-duration { font-size: 8.5pt; color: #555; white-space: nowrap; padding-top: 1px; }
  .exp-role-line { display: flex; justify-content: space-between; margin-top: 2px; }
  .exp-role { font-size: 9.5pt; font-style: italic; color: #333; }
  .exp-loc { font-size: 8.5pt; color: #777; }
  .exp-bullets { margin-top: 6px; padding-left: 16px; }
  .exp-bullets li { font-size: 9pt; color: #222; margin-bottom: 4px; line-height: 1.6; }

  /* ── Education ── */
  .edu-item { margin-bottom: 12px; }
  .edu-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .edu-degree { font-weight: 700; font-size: 9.5pt; color: #0a0a0a; }
  .edu-year { font-size: 8.5pt; color: #555; white-space: nowrap; }
  .edu-inst { font-size: 9pt; color: #444; margin-top: 2px; }
  .edu-meta { font-size: 8.5pt; color: #777; margin-top: 2px; }

  /* ── Skills ── */
  .skill-row { margin-bottom: 6px; font-size: 9pt; line-height: 1.7; }
  .skill-cat { font-weight: 700; color: #0a0a0a; margin-right: 4px; }
  .skill-chip {
    display: inline-block;
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 3px;
    padding: 2px 7px;
    font-size: 8.5pt;
    color: #1a1a1a;
    margin: 2px 2px;
  }

  /* ── Projects ── */
  .project-item { margin-bottom: 12px; }
  .project-top { display: flex; justify-content: space-between; align-items: baseline; }
  .project-name { font-weight: 700; font-size: 9.5pt; color: #0a0a0a; }
  .project-link { font-size: 8pt; color: #555; text-decoration: none; }
  .project-tech { font-size: 8.5pt; font-style: italic; color: #555; margin-top: 2px; }
  .project-desc { font-size: 9pt; color: #222; margin-top: 3px; line-height: 1.6; }

  /* ── Certs / Awards ── */
  .list-item { font-size: 9pt; color: #222; margin-bottom: 4px; padding-left: 14px; position: relative; line-height: 1.6; }
  .list-item::before { content: '•'; position: absolute; left: 0; color: #555; }

  /* ── Photo ── */
  .photo-box {
    width: 80px; height: 95px; border-radius: 4px;
    background: #e5e7eb; border: 1px solid #d1d5db;
    display: flex; align-items: center; justify-content: center;
    font-size: 8pt; color: #9ca3af; text-align: center;
    flex-shrink: 0;
  }
  .header-inner { display: flex; gap: 14px; align-items: flex-start; }
  .header-text { flex: 1; text-align: left; }
  .header-text .contact-line { justify-content: flex-start; }

  /* ── Print button ── */
  .print-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    background: #1a1a1a; padding: 10px 20px;
    display: flex; justify-content: center; gap: 12px;
    z-index: 100;
  }
  .print-btn {
    background: #fff; color: #1a1a1a; border: none;
    padding: 8px 28px; border-radius: 6px; font-weight: 700;
    font-size: 13px; cursor: pointer; font-family: inherit;
  }
  .print-btn:hover { background: #f3f4f6; }
  .print-btn.primary { background: #16a34a; color: #fff; }
  .print-btn.primary:hover { background: #15803d; }
</style>
</head>
<body>

<!-- ── HEADER ── -->
${showPhoto ? `
<div class="header-inner" style="margin-bottom:10px;border-bottom:2px solid #1a1a1a;padding-bottom:10px;">
  <div class="photo-box">Photo<br/>Here</div>
  <div class="header-text">
    <div class="name">${esc(r.name)}</div>
    <div class="job-title">${esc(r.title)}</div>
    <div class="contact-line">${contactItems}</div>
  </div>
</div>` : `
<div class="header">
  <div class="name">${esc(r.name)}</div>
  <div class="job-title">${esc(r.title)}</div>
  <div class="contact-line">${contactItems}</div>
</div>`}

<!-- ── PROFESSIONAL SUMMARY ── -->
${r.summary ? `
<div class="section">
  <div class="section-heading">Professional Summary</div>
  <div class="summary-text">${esc(r.summary)}</div>
</div>` : ''}

<!-- ── WORK EXPERIENCE ── -->
${r.experience?.length ? `
<div class="section">
  <div class="section-heading">Work Experience</div>
  ${r.experience.map(e => `
  <div class="exp-item">
    <div class="exp-top">
      <div class="exp-company">${esc(e.company)}</div>
      <div class="exp-duration">${esc(e.duration)}</div>
    </div>
    <div class="exp-role-line">
      <div class="exp-role">${esc(e.role)}</div>
      ${e.location ? `<div class="exp-loc">${esc(e.location)}</div>` : ''}
    </div>
    <ul class="exp-bullets">
      ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
    </ul>
  </div>`).join('')}
</div>` : ''}

<!-- ── EDUCATION ── -->
${r.education?.length ? `
<div class="section">
  <div class="section-heading">Education</div>
  ${r.education.map(e => `
  <div class="edu-item">
    <div class="edu-top">
      <div class="edu-degree">${esc(e.degree)}</div>
      <div class="edu-year">${esc(e.year)}</div>
    </div>
    <div class="edu-inst">${esc(e.institution)}${e.location ? ` — ${esc(e.location)}` : ''}</div>
    ${e.gpa ? `<div class="edu-meta">GPA: ${esc(e.gpa)}</div>` : ''}
  </div>`).join('')}
</div>` : ''}

<!-- ── PROJECTS ── -->
${r.projects?.length ? `
<div class="section">
  <div class="section-heading">Projects</div>
  ${r.projects.map(p => `
  <div class="project-item">
    <div class="project-top">
      <div class="project-name">${esc(p.name)}</div>
      ${p.link ? `<a class="project-link" href="${esc(p.link)}" target="_blank">${esc(p.link)}</a>` : ''}
    </div>
    ${p.tech ? `<div class="project-tech">Tech: ${esc(p.tech)}</div>` : ''}
    <div class="project-desc">${esc(p.description)}</div>
  </div>`).join('')}
</div>` : ''}

<!-- ── SKILLS ── -->
${skillsHtml ? `
<div class="section">
  <div class="section-heading">Skills</div>
  ${skillsHtml}
</div>` : ''}

<!-- ── CERTIFICATIONS ── -->
${r.certifications?.length ? `
<div class="section">
  <div class="section-heading">Certifications</div>
  ${r.certifications.map(c => `<div class="list-item">${esc(c)}</div>`).join('')}
</div>` : ''}

<!-- ── ACHIEVEMENTS ── -->
${r.achievements?.length ? `
<div class="section">
  <div class="section-heading">Achievements</div>
  ${r.achievements.map(a => `<div class="list-item">${esc(a)}</div>`).join('')}
</div>` : ''}

<!-- ── LANGUAGES ── -->
${r.languages?.length ? `
<div class="section">
  <div class="section-heading">Languages</div>
  ${r.languages.map(l => `<div class="list-item">${esc(l)}</div>`).join('')}
</div>` : ''}

<!-- ── PRINT BAR ── -->
<div class="print-bar no-print">
  <button class="print-btn" onclick="window.close()">Close</button>
  <button class="print-btn primary" onclick="window.print()">Download PDF</button>
</div>
<div style="height:52px" class="no-print"></div>

</body>
</html>`;
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
