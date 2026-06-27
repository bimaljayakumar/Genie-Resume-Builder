import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userData } = req.body;
  if (!userData?.name || !userData?.role) return res.status(400).json({ error: 'Missing required fields' });

  const isFresher = /fresher|student|no exp|0 year|zero exp|intern|fresh grad/i.test(userData.experience || '');

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 3500,
      messages: [
        {
          role: 'system',
          content: `You are a senior professional resume writer with 20 years of experience helping candidates get hired at top companies like Google, Amazon, Microsoft, and McKinsey. You write resumes that are ATS-optimized, grammatically flawless, and compelling to human recruiters. 

Your job includes:
- Fixing all grammar and spelling mistakes from the candidate's input
- Rewriting weak or short sentences into strong, professional, impactful ones
- Expanding thin bullet points into proper achievement-driven statements
- Never inventing false information — only enhance what is given
- Return ONLY valid JSON, no markdown, no extra text`,
        },
        {
          role: 'user',
          content: `Create a powerful, complete, ATS-optimized resume for this candidate. Fix all grammar issues, rewrite short or unclear sentences into professional ones, and make every section compelling.

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
  "name": "full name, properly capitalized",
  "title": "exact target job title",
  "email": "email",
  "phone": "phone",
  "location": "City, Country",
  "linkedin": "linkedin url if provided else empty string",
  "github": "github url if provided else empty string",
  "website": "website if provided else empty string",
  "summary": "3 sentences exactly. RULES: (1) NEVER say X years or 0 years of experience. (2) For freshers: open with degree and field of study, then highlight 2-3 key technical strengths, then close with a strong value statement about what they bring to the role. Example: 'Computer Science graduate with a strong foundation in cloud computing, ethical hacking, and full-stack development. Proficient in penetration testing, network security, and AWS infrastructure, with hands-on experience through academic projects and self-driven initiatives. Passionate about building secure, scalable systems and eager to contribute technical expertise to drive meaningful impact in a forward-thinking organization.' (3) For experienced candidates: open with role title and domain, then key achievements or strengths, then value statement. No year count ever. Always 3 full sentences. Fix grammar completely.",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "location": "City, Country",
      "duration": "Mon Year – Mon Year",
      "points": [
        "Strong action verb + specific task + quantified result or impact.",
        "Strong action verb + specific task + quantified result or impact.",
        "Strong action verb + specific task + quantified result or impact."
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
    "technical": ["skill1", "skill2", "skill3", "skill4", "skill5"],
    "tools": ["tool1", "tool2", "tool3"],
    "soft": ["Communication", "Problem Solving", "Team Collaboration", "Critical Thinking"]
  },
  "projects": [
    {
      "name": "Project Name",
      "tech": "Tech stack used",
      "description": "2 sentences: what it does and the outcome or impact. Make it specific and professional.",
      "link": "github or live link if provided else empty string"
    }
  ],
  "certifications": ["Certification Name – Issuing Body, Year"],
  "languages": ["English – Fluent"],
  "achievements": ["Notable award or achievement, properly written"]
}

STRICT RULES:
- NEVER write "0 years", "zero years", "X years of experience" — ever, in any field
- Fresher: experience array must be [] — write 2-3 strong projects instead
- Fix ALL grammar and spelling mistakes from the candidate input
- Rewrite short, weak, or unclear sentences into professional, medium-length ones
- Do NOT over-expand — keep it professional and concise, not verbose
- Use strong action verbs: Developed, Engineered, Architected, Designed, Implemented, Optimized, Led, Delivered, Automated, Spearheaded, Collaborated, Achieved
- Every experience bullet starts with an action verb
- Skills must be directly relevant to the target role
- Empty sections use []
- Summary must be exactly 3 sentences, grammatically perfect`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resume = JSON.parse(cleaned);
    const html = buildResumeHTML(resume);

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

function buildResumeHTML(r) {
  // Skills — plain text rows, ATS safe
  let skillsHtml = '';
  if (r.skills) {
    if (Array.isArray(r.skills)) {
      skillsHtml = `<div class="skill-row"><span class="skill-label">Skills</span><span class="skill-val">${r.skills.map(esc).join(', ')}</span></div>`;
    } else {
      const rows = [];
      if (r.skills.technical?.length) rows.push({ label: 'Technical', items: r.skills.technical });
      if (r.skills.tools?.length) rows.push({ label: 'Tools & Platforms', items: r.skills.tools });
      if (r.skills.soft?.length) rows.push({ label: 'Soft Skills', items: r.skills.soft });
      skillsHtml = rows.map(row =>
        `<div class="skill-row"><span class="skill-label">${esc(row.label)}</span><span class="skill-val">${row.items.map(esc).join(', ')}</span></div>`
      ).join('');
    }
  }

  // Contact line
  const contactParts = [
    r.email    ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : '',
    r.phone    ? `${esc(r.phone)}` : '',
    r.location ? `${esc(r.location)}` : '',
    r.linkedin ? `<a href="https://${esc(r.linkedin)}" target="_blank">${esc(r.linkedin)}</a>` : '',
    r.github   ? `<a href="https://${esc(r.github)}" target="_blank">${esc(r.github)}</a>` : '',
    r.website  ? `<a href="${esc(r.website)}" target="_blank">${esc(r.website)}</a>` : '',
  ].filter(Boolean).join(' <span class="sep">|</span> ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(r.name)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  html, body {
    width: 210mm;
    background: #fff;
  }

  body {
    font-family: 'Arial', 'Helvetica Neue', sans-serif;
    font-size: 9.5pt;
    color: #1a1a1a;
    line-height: 1.5;
  }

  #page {
    width: 210mm;
    min-height: 297mm;
    padding: 12mm 15mm 12mm 15mm;
    background: #fff;
  }

  /* ── HEADER ── */
  .hdr {
    text-align: center;
    padding-bottom: 9px;
    margin-bottom: 11px;
    border-bottom: 2px solid #1b2a4a;
  }
  .hdr-name {
    font-size: 21pt;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #1b2a4a;
    line-height: 1.1;
  }
  .hdr-title {
    font-size: 9.5pt;
    font-weight: 400;
    color: #5a6a7a;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .hdr-contact {
    margin-top: 7px;
    font-size: 8pt;
    color: #444;
    line-height: 1.7;
  }
  .hdr-contact a { color: #1b2a4a; text-decoration: none; }
  .sep { color: #bbb; margin: 0 4px; }

  /* ── SECTION ── */
  .sec {
    margin-bottom: 11px;
  }
  .sec-title {
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: #1b2a4a;
    border-bottom: 1.2px solid #1b2a4a;
    padding-bottom: 2px;
    margin-bottom: 7px;
  }

  /* ── PROFILE / SUMMARY ── */
  .profile-text {
    font-size: 9pt;
    color: #2a2a2a;
    line-height: 1.65;
    text-align: justify;
  }

  /* ── EXPERIENCE & EDUCATION ROW ── */
  .entry { margin-bottom: 10px; }
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
  .entry-mid {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-top: 1px;
    gap: 8px;
  }
  .entry-role {
    font-size: 9pt;
    font-style: italic;
    color: #444;
  }
  .entry-loc {
    font-size: 8pt;
    color: #888;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .entry-bullets {
    margin-top: 5px;
    padding-left: 14px;
    list-style-type: disc;
  }
  .entry-bullets li {
    font-size: 8.8pt;
    color: #1a1a1a;
    margin-bottom: 3px;
    line-height: 1.5;
  }

  /* ── EDUCATION specific ── */
  .edu-inst { font-size: 8.8pt; color: #444; margin-top: 2px; }
  .edu-meta { font-size: 8pt; color: #777; margin-top: 1px; }

  /* ── PROJECTS ── */
  .proj { margin-bottom: 9px; }
  .proj:last-child { margin-bottom: 0; }
  .proj-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }
  .proj-name {
    font-size: 9.5pt;
    font-weight: 700;
    color: #1b2a4a;
  }
  .proj-link {
    font-size: 7.5pt;
    color: #1b2a4a;
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .proj-tech {
    font-size: 8pt;
    color: #555;
    font-style: italic;
    margin-top: 2px;
  }
  .proj-desc {
    font-size: 8.8pt;
    color: #1a1a1a;
    margin-top: 3px;
    line-height: 1.55;
    text-align: justify;
  }

  /* ── SKILLS ── */
  .skill-row {
    display: flex;
    align-items: baseline;
    margin-bottom: 4px;
    gap: 0;
  }
  .skill-label {
    font-size: 8.5pt;
    font-weight: 700;
    color: #1b2a4a;
    min-width: 110px;
    flex-shrink: 0;
  }
  .skill-val {
    font-size: 8.8pt;
    color: #1a1a1a;
    line-height: 1.55;
  }

  /* ── PLAIN LIST (certs, langs, achievements) ── */
  .plain-list {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .plain-list li {
    font-size: 8.8pt;
    color: #1a1a1a;
    padding-left: 12px;
    position: relative;
    line-height: 1.5;
  }
  .plain-list li::before {
    content: '–';
    position: absolute;
    left: 0;
    color: #999;
  }

  /* ── TWO COLUMN (for certs + langs side by side if both exist) ── */
  .two-col {
    display: flex;
    gap: 20px;
  }
  .two-col .sec { flex: 1; margin-bottom: 0; }

</style>
</head>
<body>
<div id="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-name">${esc(r.name)}</div>
    <div class="hdr-title">${esc(r.title)}</div>
    <div class="hdr-contact">${contactParts}</div>
  </div>

  <!-- PROFILE -->
  ${r.summary ? `
  <div class="sec">
    <div class="sec-title">Profile</div>
    <p class="profile-text">${esc(r.summary)}</p>
  </div>` : ''}

  <!-- EXPERIENCE -->
  ${r.experience?.length ? `
  <div class="sec">
    <div class="sec-title">Work Experience</div>
    ${r.experience.map(e => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-org">${esc(e.company)}</span>
        <span class="entry-date">${esc(e.duration)}</span>
      </div>
      <div class="entry-mid">
        <span class="entry-role">${esc(e.role)}</span>
        ${e.location ? `<span class="entry-loc">${esc(e.location)}</span>` : ''}
      </div>
      <ul class="entry-bullets">
        ${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}
      </ul>
    </div>`).join('')}
  </div>` : ''}

  <!-- EDUCATION -->
  ${r.education?.length ? `
  <div class="sec">
    <div class="sec-title">Education</div>
    ${r.education.map(e => `
    <div class="entry">
      <div class="entry-top">
        <span class="entry-org">${esc(e.degree)}</span>
        <span class="entry-date">${esc(e.year)}</span>
      </div>
      <div class="edu-inst">${esc(e.institution)}${e.location ? ` &mdash; ${esc(e.location)}` : ''}</div>
      ${e.gpa ? `<div class="edu-meta">GPA: ${esc(e.gpa)}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  <!-- PROJECTS -->
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

  <!-- SKILLS -->
  ${skillsHtml ? `
  <div class="sec">
    <div class="sec-title">Skills</div>
    ${skillsHtml}
  </div>` : ''}

  <!-- CERTIFICATIONS + ACHIEVEMENTS side by side if both exist, else full width -->
  ${(r.certifications?.length || r.achievements?.length) ? `
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

</div>
</body>
</html>`;
}
