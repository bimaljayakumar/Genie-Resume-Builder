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
          content: `You are an expert resume writer who crafts resumes that get people hired at top companies. You write ATS-optimized, human-approved resumes. Return ONLY valid JSON, no markdown, no extra text.`,
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
  "summary": "Write 2-3 sentences. CRITICAL RULES: (1) NEVER mention years of experience or say 'X years'. (2) For freshers/students: open with their degree/field and key technical strengths, then mention what they bring to the role — e.g. 'Computer Science graduate specializing in cloud security and full-stack development. Proficient in ethical hacking, penetration testing, and AWS. Passionate about building secure, scalable systems and solving real-world challenges.' (3) For experienced: open with the role title and domain expertise only, no year count.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "duration": "Month Year – Month Year",
      "points": [
        "Action verb + task + measurable impact.",
        "Action verb + task + measurable impact.",
        "Action verb + task + measurable impact."
      ]
    }
  ],
  "education": [
    {
      "degree": "Full Degree Name",
      "institution": "Full Institution Name",
      "location": "City, Country",
      "year": "Graduation year or Expected Year",
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
      "tech": "Tech stack used",
      "description": "What it does and the impact or outcome.",
      "link": "github or live link if provided else empty string"
    }
  ],
  "certifications": ["Certification Name – Issuing Body, Year"],
  "languages": ["English – Fluent"],
  "achievements": ["Notable award or achievement"]
}

STRICT RULES:
- NEVER write "0 years", "zero years", "X years of experience" in summary — ever
- For freshers: leave experience array as [] and write 2-3 strong projects instead
- Summary must highlight skills and education, not lack of experience
- Use strong action verbs: Developed, Built, Engineered, Designed, Implemented, Optimized, Led, Delivered, Architected, Automated
- Every bullet must start with an action verb
- Skills must match the target role closely
- If no certifications or achievements exist, use []
- Keep summary under 65 words`,
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
  let skillsHtml = '';
  if (r.skills) {
    if (Array.isArray(r.skills)) {
      skillsHtml = `<div class="skill-row">${r.skills.map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>`;
    } else {
      const cats = [];
      if (r.skills.technical?.length) cats.push({ label: 'Technical', items: r.skills.technical });
      if (r.skills.tools?.length) cats.push({ label: 'Tools & Platforms', items: r.skills.tools });
      if (r.skills.soft?.length) cats.push({ label: 'Soft Skills', items: r.skills.soft });
      skillsHtml = cats.map(c =>
        `<div class="skill-row"><span class="skill-cat">${esc(c.label)}:</span>${c.items.map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}</div>`
      ).join('');
    }
  }

  const contactParts = [
    r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '',
    r.phone ? `<span>${esc(r.phone)}</span>` : '',
    r.location ? `<span>${esc(r.location)}</span>` : '',
    r.linkedin ? `<a href="https://${esc(r.linkedin)}" target="_blank">${esc(r.linkedin)}</a>` : '',
    r.github ? `<a href="https://${esc(r.github)}" target="_blank">${esc(r.github)}</a>` : '',
    r.website ? `<a href="${esc(r.website)}" target="_blank">${esc(r.website)}</a>` : '',
  ].filter(Boolean);

  const contactItems = contactParts.join('<span class="sep">|</span>');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${esc(r.name)} — Resume</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  html { font-size: 10.5pt; }
  body {
    font-family: 'Arial', 'Helvetica Neue', Helvetica, sans-serif;
    color: #1a1a1a;
    background: #fff;
    line-height: 1.55;
  }

  #resume-content {
    max-width: 210mm;
    margin: 0 auto;
    padding: 16mm 18mm 16mm 18mm;
    background: #fff;
  }

  @media print {
    .no-print { display: none !important; }
    a { color: inherit !important; text-decoration: none !important; }
    #resume-content { padding: 0; }
  }

  /* Header */
  .header { text-align: center; margin-bottom: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .name { font-size: 20pt; font-weight: 700; letter-spacing: 0.5px; color: #0a0a0a; line-height: 1.15; text-transform: uppercase; }
  .job-title { font-size: 10pt; color: #444; font-weight: 600; margin-top: 3px; letter-spacing: 0.5px; }
  .contact-line {
    display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
    gap: 0; margin-top: 7px; font-size: 8.5pt; color: #333;
  }
  .contact-line a { color: #1a1a1a; text-decoration: none; }
  .sep { margin: 0 7px; color: #aaa; }

  /* Section */
  .section { margin-bottom: 14px; }
  .section-heading {
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #111;
    border-bottom: 1.5px solid #111;
    padding-bottom: 2px;
    margin-bottom: 9px;
  }

  /* Summary */
  .summary-text { font-size: 9.5pt; color: #222; line-height: 1.65; }

  /* Experience */
  .exp-item { margin-bottom: 12px; }
  .exp-item:last-child { margin-bottom: 0; }
  .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
  .exp-company { font-weight: 700; font-size: 9.5pt; color: #0a0a0a; }
  .exp-duration { font-size: 8.5pt; color: #555; white-space: nowrap; }
  .exp-sub { display: flex; justify-content: space-between; align-items: baseline; margin-top: 1px; }
  .exp-role { font-size: 9pt; font-style: italic; color: #444; }
  .exp-loc { font-size: 8.5pt; color: #777; }
  .exp-bullets { margin-top: 5px; padding-left: 15px; }
  .exp-bullets li { font-size: 9pt; color: #222; margin-bottom: 3px; line-height: 1.55; }

  /* Education */
  .edu-item { margin-bottom: 10px; }
  .edu-item:last-child { margin-bottom: 0; }
  .edu-header { display: flex; justify-content: space-between; align-items: baseline; }
  .edu-degree { font-weight: 700; font-size: 9.5pt; color: #0a0a0a; }
  .edu-year { font-size: 8.5pt; color: #555; white-space: nowrap; }
  .edu-inst { font-size: 9pt; color: #444; margin-top: 2px; }
  .edu-meta { font-size: 8.5pt; color: #666; margin-top: 1px; }

  /* Skills */
  .skill-row { margin-bottom: 5px; font-size: 9pt; line-height: 1.65; display: flex; flex-wrap: wrap; align-items: center; gap: 3px 0; }
  .skill-cat { font-weight: 700; color: #111; margin-right: 6px; white-space: nowrap; }
  .skill-chip {
    display: inline-block;
    font-size: 8.5pt;
    color: #1a1a1a;
    margin: 1px 3px 1px 0;
  }
  .skill-chip::after { content: ','; }
  .skill-chip:last-child::after { content: ''; }

  /* Projects */
  .project-item { margin-bottom: 10px; }
  .project-item:last-child { margin-bottom: 0; }
  .project-header { display: flex; justify-content: space-between; align-items: baseline; }
  .project-name { font-weight: 700; font-size: 9.5pt; color: #0a0a0a; }
  .project-link { font-size: 8pt; color: #1a56db; text-decoration: none; }
  .project-tech { font-size: 8.5pt; color: #555; margin-top: 1px; }
  .project-tech span { font-weight: 600; }
  .project-desc { font-size: 9pt; color: #222; margin-top: 3px; line-height: 1.55; }

  /* Lists (certs, achievements, languages) */
  .list-items { display: flex; flex-direction: column; gap: 3px; }
  .list-item { font-size: 9pt; color: #222; padding-left: 13px; position: relative; line-height: 1.55; }
  .list-item::before { content: '•'; position: absolute; left: 0; color: #555; }

  /* Photo layout */
  .header-with-photo { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .photo-box {
    width: 75px; height: 90px; border-radius: 3px;
    background: #e5e7eb; border: 1px solid #ccc;
    display: flex; align-items: center; justify-content: center;
    font-size: 7.5pt; color: #9ca3af; text-align: center; flex-shrink: 0;
  }
  .header-text { flex: 1; }
  .header-text .header { border: none; margin: 0; padding: 0; text-align: left; }
  .header-text .contact-line { justify-content: flex-start; }

</style>
</head>
<body>

<div id="resume-content">

${showPhoto ? `
<div class="header-with-photo">
  <div class="photo-box">Photo<br/>Here</div>
  <div class="header-text">
    <div class="header">
      <div class="name">${esc(r.name)}</div>
      <div class="job-title">${esc(r.title)}</div>
      <div class="contact-line">${contactItems}</div>
    </div>
  </div>
</div>` : `
<div class="header">
  <div class="name">${esc(r.name)}</div>
  <div class="job-title">${esc(r.title)}</div>
  <div class="contact-line">${contactItems}</div>
</div>`}

${r.summary ? `
<div class="section">
  <div class="section-heading">Professional Summary</div>
  <div class="summary-text">${esc(r.summary)}</div>
</div>` : ''}

${r.experience?.length ? `
<div class="section">
  <div class="section-heading">Work Experience</div>
  ${r.experience.map(e => `
  <div class="exp-item">
    <div class="exp-header">
      <div class="exp-company">${esc(e.company)}</div>
      <div class="exp-duration">${esc(e.duration)}</div>
    </div>
    <div class="exp-sub">
      <div class="exp-role">${esc(e.role)}</div>
      ${e.location ? `<div class="exp-loc">${esc(e.location)}</div>` : ''}
    </div>
    <ul class="exp-bullets">
      ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
    </ul>
  </div>`).join('')}
</div>` : ''}

${r.education?.length ? `
<div class="section">
  <div class="section-heading">Education</div>
  ${r.education.map(e => `
  <div class="edu-item">
    <div class="edu-header">
      <div class="edu-degree">${esc(e.degree)}</div>
      <div class="edu-year">${esc(e.year)}</div>
    </div>
    <div class="edu-inst">${esc(e.institution)}${e.location ? ` &mdash; ${esc(e.location)}` : ''}</div>
    ${e.gpa ? `<div class="edu-meta">GPA: ${esc(e.gpa)}</div>` : ''}
  </div>`).join('')}
</div>` : ''}

${r.projects?.length ? `
<div class="section">
  <div class="section-heading">Projects</div>
  ${r.projects.map(p => `
  <div class="project-item">
    <div class="project-header">
      <div class="project-name">${esc(p.name)}</div>
      ${p.link ? `<a class="project-link" href="${esc(p.link)}" target="_blank">${esc(p.link)}</a>` : ''}
    </div>
    ${p.tech ? `<div class="project-tech"><span>Tech:</span> ${esc(p.tech)}</div>` : ''}
    <div class="project-desc">${esc(p.description)}</div>
  </div>`).join('')}
</div>` : ''}

${skillsHtml ? `
<div class="section">
  <div class="section-heading">Skills</div>
  ${skillsHtml}
</div>` : ''}

${r.certifications?.length ? `
<div class="section">
  <div class="section-heading">Certifications</div>
  <div class="list-items">
    ${r.certifications.map(c => `<div class="list-item">${esc(c)}</div>`).join('')}
  </div>
</div>` : ''}

${r.achievements?.length ? `
<div class="section">
  <div class="section-heading">Achievements</div>
  <div class="list-items">
    ${r.achievements.map(a => `<div class="list-item">${esc(a)}</div>`).join('')}
  </div>
</div>` : ''}

${r.languages?.length ? `
<div class="section">
  <div class="section-heading">Languages</div>
  <div class="list-items">
    ${r.languages.map(l => `<div class="list-item">${esc(l)}</div>`).join('')}
  </div>
</div>` : ''}

</div><!-- end #resume-content -->



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
