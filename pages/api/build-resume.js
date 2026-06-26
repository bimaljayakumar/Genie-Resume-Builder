import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userData } = req.body;
  if (!userData?.name || !userData?.role) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const aiPrompt = `You are an expert resume writer. Using the candidate info below, create a highly professional, ATS-optimized resume.

CANDIDATE DATA:
- Full Name: ${userData.name}
- Email: ${userData.email}
- Phone: ${userData.phone}
- Location: ${userData.location}
- Target Role: ${userData.role}
- Education: ${userData.education}
- Work Experience: ${userData.experience}
- Skills: ${userData.skills}
- Extra (projects/certs/links): ${userData.extra || 'none'}

Return ONLY valid JSON, no markdown, no extra text:
{
  "name": "string",
  "title": "string — the target role",
  "email": "string",
  "phone": "string",
  "location": "string",
  "linkedin": "string or empty",
  "github": "string or empty",
  "summary": "3 sentences, strong professional summary tailored to the role",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "duration": "string",
      "points": ["strong action-verb bullet", "quantified achievement", "technical contribution"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "year": "string"
    }
  ],
  "skills": ["skill1","skill2","...at least 8 relevant skills"],
  "projects": [
    {
      "name": "string",
      "description": "string"
    }
  ],
  "certifications": ["cert1","cert2"]
}

Rules:
- Use strong action verbs (Led, Built, Optimized, Designed, etc.)
- Include industry-relevant ATS keywords for the target role
- If the person is a fresher, generate realistic academic projects as experience
- Keep everything concise and impactful`;

    const result = await model.generateContent(aiPrompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resume = JSON.parse(cleaned);

    const html = buildResumeHTML(resume, userData.photo?.toLowerCase().startsWith('y'));

    return res.status(200).json({ html, resume });

  } catch (error) {
    console.error('Resume generation error:', error);
    return res.status(500).json({ error: 'Failed to generate resume' });
  }
}

function buildResumeHTML(r, showPhoto) {
  const photoPlaceholder = showPhoto ? `
    <div style="width:90px;height:110px;border-radius:8px;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:10px;color:#94a3b8;text-align:center;border:2px solid #e2e8f0;">
      Photo<br/>Here
    </div>` : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:36px 44px;line-height:1.55;max-width:800px;margin:0 auto;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px;}
  .header-left{flex:1;}
  .name{font-size:24px;font-weight:800;letter-spacing:-0.3px;color:#0f172a;}
  .title{font-size:12.5px;color:#0ea5e9;font-weight:600;margin-top:3px;}
  .contact{display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:8px;font-size:9.5px;color:#64748b;}
  .contact a{color:#64748b;text-decoration:none;}
  .divider{height:2.5px;background:linear-gradient(90deg,#0ea5e9,#10b981,#0ea5e9);margin:14px 0 16px;border-radius:2px;opacity:0.8;}
  .two-col{display:flex;gap:24px;}
  .main-col{flex:1.6;}
  .side-col{flex:1;min-width:0;}
  .section{margin-bottom:18px;}
  .section-title{font-size:9px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0ea5e9;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #e0f2fe;}
  .summary{font-size:10.5px;color:#374151;line-height:1.7;}
  .exp-item{margin-bottom:13px;}
  .exp-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:3px;}
  .exp-company{font-weight:700;font-size:11.5px;color:#0f172a;}
  .exp-role{font-size:10.5px;color:#0ea5e9;font-weight:600;margin-top:1px;}
  .exp-duration{font-size:9.5px;color:#94a3b8;white-space:nowrap;padding-top:1px;}
  ul{padding-left:14px;margin-top:4px;}
  ul li{margin-bottom:3px;color:#374151;font-size:10px;line-height:1.6;}
  .edu-item{margin-bottom:9px;}
  .edu-inst{font-weight:700;font-size:10.5px;color:#0f172a;}
  .edu-deg{font-size:10px;color:#475569;margin-top:1px;}
  .edu-year{font-size:9.5px;color:#94a3b8;margin-top:1px;}
  .skills-list{display:flex;flex-direction:column;gap:4px;}
  .skill-tag{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;padding:3px 8px;border-radius:4px;font-size:9.5px;font-weight:500;display:inline-block;}
  .skills-wrap{display:flex;flex-wrap:wrap;gap:5px;}
  .project-item{margin-bottom:10px;}
  .project-name{font-weight:700;font-size:10.5px;color:#0f172a;}
  .project-desc{font-size:10px;color:#374151;margin-top:2px;line-height:1.6;}
  .cert-item{font-size:10px;color:#374151;padding:2px 0;}
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div class="name">${esc(r.name)}</div>
    <div class="title">${esc(r.title)}</div>
    <div class="contact">
      ${r.email ? `<span>✉ ${esc(r.email)}</span>` : ''}
      ${r.phone ? `<span>📞 ${esc(r.phone)}</span>` : ''}
      ${r.location ? `<span>📍 ${esc(r.location)}</span>` : ''}
      ${r.linkedin ? `<span>🔗 ${esc(r.linkedin)}</span>` : ''}
      ${r.github ? `<span>⌨ ${esc(r.github)}</span>` : ''}
    </div>
  </div>
  ${showPhoto ? photoPlaceholder : ''}
</div>

<div class="divider"></div>

${r.summary ? `
<div class="section">
  <div class="section-title">Professional Summary</div>
  <div class="summary">${esc(r.summary)}</div>
</div>` : ''}

<div class="two-col">
  <div class="main-col">

    ${r.experience?.length ? `
    <div class="section">
      <div class="section-title">Work Experience</div>
      ${r.experience.map(e => `
        <div class="exp-item">
          <div class="exp-header">
            <div>
              <div class="exp-company">${esc(e.company)}</div>
              <div class="exp-role">${esc(e.role)}</div>
            </div>
            <div class="exp-duration">${esc(e.duration)}</div>
          </div>
          <ul>${(e.points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>
        </div>
      `).join('')}
    </div>` : ''}

    ${r.projects?.length ? `
    <div class="section">
      <div class="section-title">Projects</div>
      ${r.projects.map(p => `
        <div class="project-item">
          <div class="project-name">${esc(p.name)}</div>
          <div class="project-desc">${esc(p.description)}</div>
        </div>
      `).join('')}
    </div>` : ''}

  </div>
  <div class="side-col">

    <div class="section">
      <div class="section-title">Education</div>
      ${(r.education || []).map(e => `
        <div class="edu-item">
          <div class="edu-inst">${esc(e.institution)}</div>
          <div class="edu-deg">${esc(e.degree)}</div>
          <div class="edu-year">${esc(e.year)}</div>
        </div>
      `).join('')}
    </div>

    ${r.skills?.length ? `
    <div class="section">
      <div class="section-title">Skills</div>
      <div class="skills-wrap">
        ${r.skills.map(s => `<span class="skill-tag">${esc(s)}</span>`).join('')}
      </div>
    </div>` : ''}

    ${r.certifications?.length ? `
    <div class="section">
      <div class="section-title">Certifications</div>
      ${r.certifications.map(c => `<div class="cert-item">• ${esc(c)}</div>`).join('')}
    </div>` : ''}

  </div>
</div>

</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
