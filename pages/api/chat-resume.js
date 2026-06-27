import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Genie, a friendly AI resume assistant. Collect resume info through conversation, then generate a resume.

STEPS:
1. If user pastes text (resume, LinkedIn, notes), extract everything: name, email, phone, location, ALL education levels (10th/SSC, 12th/HSC, college), experience, skills, interests, projects, certifications, GitHub, LinkedIn.
2. Only ask for genuinely MISSING required info (name, target role, contact, education, skills) — one question at a time.
3. Once you have everything, show a confirmation summary:

Here's what I have for your resume:
**Name:** ...
**Email:** ...
**Phone:** ...
**Location:** ...
**Target Role:** ...
**Education:** (list all levels)
**Experience:** ...
**Skills:** ...
**Interests:** ...
**Extras:** ...

Everything look good? Type yes to generate, or tell me what to change.

4. When user confirms, output this EXACTLY at the end on its own line:
GENERATE:{"name":"...","email":"...","phone":"...","location":"...","role":"...","education":"College: [name, degree, year] | 12th: [school, year] | 10th: [school, year]","experience":"...","skills":"...","interests":"...","extra":"..."}

RULES:
- NEVER invent skills, companies, dates, projects or achievements
- Include ALL education levels in education field — never drop any
- If student/no job experience, set experience to fresher
- JSON values must use single quotes inside strings to avoid breaking JSON
- Be warm, concise, one question at a time`;


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { history } = req.body;
  if (!history?.length) return res.status(400).json({ error: 'No history' });

  // Validate history entries
  const validHistory = history
    .filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0)
    .slice(-30); // cap at last 30 messages to avoid token overflow

  if (!validHistory.length) return res.status(400).json({ error: 'No valid history' });

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...validHistory.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text.slice(0, 4000), // cap each message
      })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';

    if (!raw) {
      return res.status(200).json({ reply: "I didn't get a response. Could you try again?", readyToGenerate: false });
    }

    // Extract GENERATE block — handle multiline JSON safely
    const generateMatch = raw.match(/GENERATE:(\{[\s\S]+?\})\s*$/);
    if (generateMatch) {
      try {
        const userData = JSON.parse(generateMatch[1]);

        // Validate required fields before proceeding
        if (!userData.name || !userData.role) {
          return res.status(200).json({
            reply: "I'm missing your name or target role. Could you confirm those?",
            readyToGenerate: false,
          });
        }

        const replyText = raw.replace(/GENERATE:[\s\S]+$/, '').trim() || '🎉 Perfect! Building your resume now...';
        return res.status(200).json({ reply: replyText, readyToGenerate: true, userData });

      } catch (parseErr) {
        console.error('GENERATE JSON parse error:', parseErr.message, generateMatch[1]?.slice(0, 200));
        // Don't crash — ask user to confirm again
        return res.status(200).json({
          reply: "I had trouble reading the final data. Could you type **yes** again to confirm and generate?",
          readyToGenerate: false,
        });
      }
    }

    return res.status(200).json({ reply: raw, readyToGenerate: false });

  } catch (err) {
    console.error('Groq error:', err.message);
    return res.status(500).json({ error: 'AI service error. Please try again in a moment.' });
  }
}
