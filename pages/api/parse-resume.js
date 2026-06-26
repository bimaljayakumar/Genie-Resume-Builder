import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Extract resume information from the text below. Return ONLY valid JSON, no markdown, no explanation.

TEXT:
"""
${text}
"""

Return this exact JSON structure. Use null for any field you cannot find:
{
  "name": "full name or null",
  "email": "email or null",
  "phone": "phone number or null",
  "location": "city/country or null",
  "role": "target job role or current job title or null",
  "education": "degree, institution, year — all education entries as a single string or null",
  "experience": "all work experience — company, role, duration, achievements as a single descriptive string or null",
  "skills": "comma-separated skills or null",
  "photo": null,
  "extra": "projects, certifications, LinkedIn, GitHub, or any other notable info or null"
}

Rules:
- Extract EXACTLY what is in the text, do not invent anything
- For experience: if the person mentions being a fresher or student with no work experience, set it to "fresher"
- For role: infer from the most recent job title or stated objective/summary
- Return null (not empty string) for anything truly missing`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw);

    // Clean up nulls — convert to empty string so frontend can check easily
    const cleaned = {};
    for (const [k, v] of Object.entries(parsed)) {
      cleaned[k] = v && String(v).trim() !== 'null' ? String(v).trim() : '';
    }

    return res.status(200).json({ parsed: cleaned });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: 'Failed to parse resume' });
  }
}
