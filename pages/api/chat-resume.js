import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Genie, a friendly and professional AI resume assistant. Your job is to collect all the information needed to build a great resume through natural conversation.

YOUR GOAL: Collect these details from the user:
1. Full name
2. Email address
3. Phone number
4. Location (city/country)
5. Target job role
6. Education (degree, institution, year)
7. Work experience (or "fresher" if none)
8. Skills
9. Whether they want a photo on their resume (yes/no)
10. Any extras: projects, certifications, LinkedIn, GitHub

HOW YOU WORK:
- If the user pastes their resume or a big block of text, READ IT CAREFULLY and extract every piece of information you can find. Do NOT ask for things that are already clearly in the text.
- Be conversational and natural — don't sound like a form
- After extracting from their text, only ask about what's genuinely missing, ONE question at a time
- If the user wants to ADD or CHANGE something, update accordingly
- Once you have all 10 pieces of information, show a friendly CONFIRMATION SUMMARY like:
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
  
  Does everything look correct? Type **yes** to generate your resume, or let me know what to change."
- When the user confirms (says yes/ok/looks good/correct/generate/etc.), respond with EXACTLY this JSON on its own line and nothing after it:
  GENERATE:{"name":"...","email":"...","phone":"...","location":"...","role":"...","education":"...","experience":"...","skills":"...","photo":"yes or no","extra":"..."}

IMPORTANT:
- Extract names from the TOP of any pasted resume text
- Extract emails (look for @ symbol), phones (digit sequences), addresses, skills sections, education sections
- Be warm and helpful, not robotic
- Keep responses concise — don't write essays
- Never ask for something already provided`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { history } = req.body;
  if (!history?.length) return res.status(400).json({ error: 'No history' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Build the full prompt with system context + conversation history
    const conversationText = history.map(m =>
      `${m.role === 'user' ? 'User' : 'Genie'}: ${m.text}`
    ).join('\n\n');

    const fullPrompt = `${SYSTEM_PROMPT}

---
CONVERSATION SO FAR:
${conversationText}

---
Now respond as Genie. If you have all the information and the user has confirmed, output the GENERATE: line. Otherwise reply naturally.`;

    const result = await model.generateContent(fullPrompt);
    const raw = result.response.text().trim();

    // Check if AI wants to generate
    const generateMatch = raw.match(/GENERATE:(\{[\s\S]+\})/);
    if (generateMatch) {
      try {
        const userData = JSON.parse(generateMatch[1]);
        // Get the reply text before the GENERATE line
        const replyText = raw.replace(/GENERATE:[\s\S]+/, '').trim() ||
          "🎉 Perfect! Everything looks good. Building your resume now...";
        return res.status(200).json({ reply: replyText, readyToGenerate: true, userData });
      } catch {
        // JSON parse failed, just reply normally
      }
    }

    return res.status(200).json({ reply: raw, readyToGenerate: false });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'AI error' });
  }
}
