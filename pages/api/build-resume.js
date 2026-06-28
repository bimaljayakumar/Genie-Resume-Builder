import Groq from 'groq-sdk';
import { execFile } from 'child_process';
import path from 'path';

export const config = {
  api: {
    responseLimit: '10mb',
  },
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Sanitize input ────────────────────────────────────────────────────────────
function sanitize(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);
}

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

function detectFresher(experience) {
  if (!experience) return true;
  return /^(fresher|no exp|no work|no experience|0 year|zero exp|intern only|fresh grad|n\/a|none|-)$/i.test(
    experience.trim()
  ) || experience.trim().length < 10;
}

function detectRealProjects(extra, skills) {
  const text = `${extra} ${skills}`.toLowerCase();
  const hasProjectWord = /\bproject\b|\bbuilt\b|\bdeveloped\b|\bcreated\b|\bdeployed\b/.test(text);
  const hasTechSignal  = /github\.com|\.com\/|html|css|react|node|python|java|flutter|android|ios|api|app|website|system/.test(text);
  return hasProjectWord && hasTechSignal;
}

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
        { role: 'system', content: SYSTEM_PROMPT_BUILD },
        { role: 'user',   content: buildPrompt(safe, isFresher, hasRealProjects) },
      ],
    });

    const raw     = completion.choices[0]?.message?.content?.trim() || '';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      resume = JSON.parse(cleaned);
    } catch {
      console.error('Resume JSON parse failed. Raw:', raw.slice(0, 400));
      return res.status(500).json({ error: 'AI returned an invalid format. Please try again.' });
    }
  } catch (err) {
    console.error('Groq error:', err.message);
    if (err.status === 429 || err.message?.includes('rate_limit_exceeded') || err.message?.includes('Rate limit')) {
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a few minutes and try again.' });
    }
    return res.status(500).json({ error: err.message || 'Failed to generate resume. Please try again.' });
  }

  // ── POST-PARSE SAFETY ─────────────────────────────────────────────────────
  if (!hasRealProjects) resume.projects = [];
  if (isFresher)        resume.experience = [];

  if (resume.skills?.technical) {
    resume.skills.technical = [...new Set(resume.skills.technical.map(s => s.trim()))].filter(Boolean);
  }
  if (resume.skills?.tools) {
    resume.skills.tools = [...new Set(resume.skills.tools.map(s => s.trim()))].filter(Boolean);
  }
  if (resume.interests) {
    resume.interests = [...new Set(resume.interests.map(s => s.trim()))].filter(Boolean);
  }
  if (!Array.isArray(resume.education)) resume.education = [];
  if (resume.certifications) {
    resume.certifications = resume.certifications.filter(c => c && c.trim().length > 3);
  }
  if (resume.achievements) {
    resume.achievements = resume.achievements.filter(a => a && a.trim().length > 3);
  }
  if (!resume.languages?.length) resume.languages = ['English'];

  // ── RENDER PDF via Python/RenderCV ────────────────────────────────────────
  try {
    const pdfBytes = await renderWithRenderCV(resume);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.name.replace(/\s+/g, '_')}_Resume.pdf"`);
    return res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('RenderCV error:', err.message);
    return res.status(500).json({ error: 'Failed to render PDF: ' + err.message });
  }
}

// ─── Call Python render script ────────────────────────────────────────────────
function renderWithRenderCV(resumeData) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'render_resume.py');
    const input      = JSON.stringify(resumeData);

    const child = execFile(
      'python',
      [scriptPath],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000, encoding: 'buffer' },
      (error, stdout, stderr) => {
        if (error) {
          const msg = stderr?.toString() || error.message;
          return reject(new Error(msg.slice(0, 500)));
        }
        if (!stdout || stdout.length === 0) {
          return reject(new Error('Python script returned empty output. ' + (stderr?.toString() || '')));
        }
        resolve(stdout);
      }
    );

    child.stdin.write(input);
    child.stdin.end();
  });
}

// ─── Build the AI prompt ──────────────────────────────────────────────────────
function buildPrompt(safe, isFresher, hasRealProjects) {
  const summaryRule = isFresher
    ? `SUMMARY RULE (fresher): Write exactly 3 sentences.
  Sentence 1: State their degree/field of study and the institution.
  Sentence 2: Highlight their top 2-3 technical skills and any hands-on work.
  Sentence 3: Express their motivation and the specific value they bring to the target role.
  NEVER say "0 years", "no experience", or anything about lack of experience.`
    : `SUMMARY RULE (experienced): Write exactly 3 sentences.
  Sentence 1: State their professional role and primary domain of expertise.
  Sentence 2: Highlight 2-3 key technical skills or notable achievements.
  Sentence 3: State the value and impact they bring to employers.
  NEVER mention specific year counts.`;

  const experienceRule = isFresher
    ? `EXPERIENCE RULE: Candidate is a fresher. Set "experience" to empty array [].`
    : `EXPERIENCE RULE: For each job write 3 strong bullet points starting with action verbs. Include measurable impact where mentioned.`;

  const projectsRule = hasRealProjects
    ? `PROJECTS RULE: Extract project name, tech stack, and description. Improve language but keep facts.`
    : `PROJECTS RULE: Set "projects" to empty array []. Do NOT invent projects.`;

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

RULES:

${summaryRule}

EDUCATION RULE:
  Parse every education level and create a SEPARATE object for each.
  - "10th" or "SSC" → degree: "Secondary School Certificate (SSC)"
  - "12th" or "HSC" or "Plus Two" → degree: "Higher Secondary Certificate (HSC)"
  - Use full degree name for college (BCA, BSc, BTech, MBA, etc.)
  - Order: most recent first
  - NEVER drop any education level mentioned

${experienceRule}

${projectsRule}

SKILLS RULE:
  - Only technical skills and tools/platforms
  - NO soft skills
  - Remove duplicates

HALLUCINATION RULE:
  - If any field says "Not provided" → return empty string or empty array
  - Never invent anything.

Return ONLY this exact JSON (no other text):
{
  "name": "Properly Capitalized Full Name",
  "title": "Target Job Title",
  "email": "email or empty string",
  "phone": "phone or empty string",
  "location": "City, Country or empty string",
  "linkedin": "linkedin url only if explicitly provided else empty string",
  "github": "github url only if explicitly provided else empty string",
  "website": "website url only if explicitly provided else empty string",
  "summary": "Exactly 3 sentences",
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
    "technical": ["skill1", "skill2"],
    "tools": ["tool1", "tool2"]
  },
  "interests": ["interest1"],
  "projects": [],
  "certifications": [],
  "achievements": [],
  "languages": ["English"]
}`;
}
