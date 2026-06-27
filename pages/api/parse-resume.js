import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a resume parser. Read the resume text carefully and extract every field you can find. Return ONLY valid JSON, no markdown, no explanation.

RESUME TEXT:
"""
${text}
"""

Extract and return this exact JSON:
{
  "name": "The person's full name. It is usually the FIRST prominent text at the top of the resume, often in large/bold letters. Look for it carefully.",
  "email": "Email address — look for @ symbol",
  "phone": "Phone/mobile number — any sequence of digits",
  "location": "Address, city, state, country, or PIN code area",
  "role": "Their target role or current designation. If student, use their course like 'BCA Student' or 'Software Developer'",
  "education": "All education: degree, institution name, year. Combine all into one string.",
  "experience": "All work experience. If no work experience or they are a student/fresher, write exactly: fresher",
  "skills": "All skills, interests, technologies mentioned — comma separated",
  "photo": null,
  "extra": "Any extra info: projects, certifications, LinkedIn, GitHub, hobbies, achievements"
}

CRITICAL RULES:
- The NAME is almost always the very first line or heading of the resume — extract it
- Email always contains @ — extract it exactly as written
- Phone is a sequence of 7+ digits — extract it exactly
- NEVER return the string "null" — use actual null for missing fields
- Do not skip fields that are clearly present in the text
- If person is a student with no job experience, set experience to "fresher"`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(raw);

    // Convert null/"null"/undefined to empty string, keep everything else
    const cleaned = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === null || v === undefined || String(v).trim() === 'null' || String(v).trim() === '') {
        cleaned[k] = '';
      } else {
        cleaned[k] = String(v).trim();
      }
    }

    return res.status(200).json({ parsed: cleaned });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ error: 'Failed to parse resume' });
  }
}
