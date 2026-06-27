import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Genie, a friendly AI resume assistant. Your job is to collect resume information through natural conversation and build a great resume.

COLLECT THESE 10 THINGS:
1. Full name
2. Email address
3. Phone number
4. Location (city/country)
5. Target job role
6. Education (degree, institution, year)
7. Work experience (or "fresher" if none)
8. Skills
9. Photo on resume? (yes/no)
10. Extras: projects, certifications, LinkedIn, GitHub

HOW TO BEHAVE:
- If user pastes a resume or big text block, READ IT CAREFULLY and extract everything you can. NEVER ask for things already in the text.
- Only ask what is genuinely missing, ONE question at a time
- Be natural and conversational, not robotic
- If user wants to add/change anything, update it
- Once you have all 10 items, show a confirmation summary exactly like this:

"Here's what I have for your resume:

**Name:** ...
**Email:** ...
**Phone:** ...
**Location:** ...
**Target Role:** ...
**Education:** ...
**Experience:** ...
**Skills:** ...
**Photo:** ...
**Extras:** ...

Everything look good? Type **yes** to generate your resume, or tell me what to change."

- When user confirms (yes/ok/correct/looks good/generate), output this on its own line:
GENERATE:{"name":"...","email":"...","phone":"...","location":"...","role":"...","education":"...","experience":"...","skills":"...","photo":"yes or no","extra":"..."}

RULES:
- Name is usually the FIRST line of a resume
- Extract emails (has @ symbol) and phones (digit sequences) exactly
- If student with no work experience, set experience to "fresher"
- Keep replies short and friendly`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { history } = req.body;
  if (!history?.length) return res.status(400).json({ error: 'No history' });

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content?.trim() || '';

    // Check if AI wants to generate
    const generateMatch = raw.match(/GENERATE:(\{[\s\S]+\})/);
    if (generateMatch) {
      try {
        const userData = JSON.parse(generateMatch[1]);
        const replyText = raw.replace(/GENERATE:[\s\S]+/, '').trim() ||
          '🎉 Perfect! Building your resume now...';
        return res.status(200).json({ reply: replyText, readyToGenerate: true, userData });
      } catch { /* fall through to normal reply */ }
    }

    return res.status(200).json({ reply: raw, readyToGenerate: false });

  } catch (err) {
    console.error('Groq error:', err);
    return res.status(500).json({ error: 'AI error: ' + err.message });
  }
}
