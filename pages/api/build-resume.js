import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, user } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    // Step 1: Generate resume JSON with Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const aiPrompt = `
You are a professional resume writer. Based on the following user description, create a complete, ATS-optimized professional resume.

User description: "${prompt}"

Return ONLY a valid JSON object with this exact structure, no extra text:
{
  "name": "Full Name (infer from context or use 'Professional')",
  "title": "Job Title",
  "email": "email@example.com",
  "phone": "+1 (555) 000-0000",
  "location": "City, Country",
  "linkedin": "linkedin.com/in/username",
  "summary": "2-3 sentence professional summary",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Jan 2022 – Present",
      "points": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Degree Name",
      "year": "2020"
    }
  ],
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5", "Skill 6"],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description of the project and impact"
    }
  ]
}

Make it highly professional, use strong action verbs, include relevant industry keywords for ATS, and tailor everything to the role described.`;

    const result = await model.generateContent(aiPrompt);
    const text = result.response.text();

    // Clean the response — remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const resume = JSON.parse(cleaned);

    // Step 2: Build styled HTML resume
    const html = buildResumeHTML(resume);

    // Step 3: Return HTML as base64 for PDF rendering on client
    const htmlBase64 = Buffer.from(html).toString('base64');

    return res.status(200).json({ html, htmlBase64, resume });

  } catch (error) {
    console.error('Resume generation error:', error);
    return res.status(500).json({ error: 'Failed to generate resume' });
  }
}

function buildResumeHTML(r) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Arial', sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 40px 48px; line-height: 1.5; }
  .name { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #0f172a; }
  .title { font-size: 13px; color: #475569; font-weight: 500; margin-top: 2px; }
  .contact { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; font-size: 10px; color: #64748b; }
  .contact span { display: flex; align-items: center; gap: 4px; }
  .divider { height: 2px; background: linear-gradient(90deg, #10b981, #06b6d4); margin: 16px 0; border-radius: 2px; }
  .section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #10b981; margin-bottom: 10px; }
  .section { margin-bottom: 20px; }
  .summary { font-size: 11px; color: #374151; line-height: 1.7; }
  .exp-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
  .exp-company { font-weight: 700; font-size: 12px; color: #0f172a; }
  .exp-role { font-size: 11px; color: #475569; font-weight: 500; }
  .exp-duration { font-size: 10px; color: #94a3b8; white-space: nowrap; }
  .exp-item { margin-bottom: 14px; }
  ul { padding-left: 16px; margin-top: 4px; }
  ul li { margin-bottom: 3px; color: #374151; font-size: 10.5px; line-height: 1.6; }
  .edu-item { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .edu-inst { font-weight: 700; font-size: 11px; color: #0f172a; }
  .edu-deg { font-size: 10.5px; color: #475569; }
  .edu-year { font-size: 10px; color: #94a3b8; }
  .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .skill-tag { background: #f0fdf4; color: #065f46; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 500; }
  .project-item { margin-bottom: 10px; }
  .project-name { font-weight: 700; font-size: 11px; color: #0f172a; }
  .project-desc { font-size: 10.5px; color: #374151; margin-top: 2px; line-height: 1.6; }
</style>
</head>
<body>

  <div class="name">${r.name}</div>
  <div class="title">${r.title}</div>
  <div class="contact">
    ${r.email ? `<span>✉ ${r.email}</span>` : ''}
    ${r.phone ? `<span>📞 ${r.phone}</span>` : ''}
    ${r.location ? `<span>📍 ${r.location}</span>` : ''}
    ${r.linkedin ? `<span>🔗 ${r.linkedin}</span>` : ''}
  </div>

  <div class="divider"></div>

  ${r.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${r.summary}</div>
  </div>` : ''}

  ${r.experience?.length ? `
  <div class="section">
    <div class="section-title">Experience</div>
    ${r.experience.map(e => `
      <div class="exp-item">
        <div class="exp-header">
          <div>
            <div class="exp-company">${e.company}</div>
            <div class="exp-role">${e.role}</div>
          </div>
          <div class="exp-duration">${e.duration}</div>
        </div>
        <ul>${e.points?.map(p => `<li>${p}</li>`).join('') || ''}</ul>
      </div>
    `).join('')}
  </div>` : ''}

  ${r.education?.length ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${r.education.map(e => `
      <div class="edu-item">
        <div>
          <div class="edu-inst">${e.institution}</div>
          <div class="edu-deg">${e.degree}</div>
        </div>
        <div class="edu-year">${e.year}</div>
      </div>
    `).join('')}
  </div>` : ''}

  ${r.skills?.length ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-grid">
      ${r.skills.map(s => `<span class="skill-tag">${s}</span>`).join('')}
    </div>
  </div>` : ''}

  ${r.projects?.length ? `
  <div class="section">
    <div class="section-title">Projects</div>
    ${r.projects.map(p => `
      <div class="project-item">
        <div class="project-name">${p.name}</div>
        <div class="project-desc">${p.description}</div>
      </div>
    `).join('')}
  </div>` : ''}

</body>
</html>`;
}
