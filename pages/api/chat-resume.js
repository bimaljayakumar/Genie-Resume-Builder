import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are Genie, a professional AI resume writing assistant and ATS optimizer. Your role is to help the user write high-quality resume content, improve their English phrasing, and clarify doubts.

GUIDELINES:
1. ALWAYS help the user write professional ATS-optimized summaries, experience descriptions, project bullet points, and select skills.
2. The user has a dynamic form on the screen. You can automatically fill or update fields in their form by outputting a special UPDATE JSON instruction.
3. If you write or suggest any content (like a summary, experience details, or skills) and the user wants to add it, or if they tell you their role, contact details, or other info and ask you to update the form:
   - Ask the user: "Do you need to add this to your resume?" (or "Do you need to add in resume?")
   - If they say "yes" (or if they explicitly tell you to fill/update it directly), you MUST append this instruction on its own line at the very end of your response:
     UPDATE:{"profile":{"name":"Bimal","summary":"A passionate software engineer..."},"workExperiences":[{"company":"UST","jobTitle":"Associate Developer","date":"2024","descriptions":["Improved latency by 20%","Led team of 3"]}],"educations":[{"school":"CUSAT","degree":"B.Tech","gpa":"8.5","date":"2023"}],"projects":[{"project":"E-commerce site","date":"2023","descriptions":["Built with React"]}],"skills":{"descriptions":["React","Node.js","TypeScript"]}}
   - Keep the update JSON minimal: only include keys/fields that are being added or updated. Do not send unchanged fields.
   - Keys in the UPDATE JSON:
     * "profile": object with optional fields: "name", "email", "phone", "location", "url", "summary"
     * "workExperiences": array of objects with optional fields: "company", "jobTitle", "date", "descriptions" (array of strings)
     * "educations": array of objects with optional fields: "school", "degree", "gpa", "date", "descriptions" (array of strings)
     * "projects": array of objects with optional fields: "project", "date", "descriptions" (array of strings)
     * "skills": object with optional field: "descriptions" (array of strings)

4. Be warm, professional, clean, and guide the user through clear and polite messages.`;


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { history } = req.body;
  if (!history?.length) return res.status(400).json({ error: 'No history' });

  // Decode HTML entities from user messages (e.g. when user pastes rendered resume text)
  function decodeEntities(str) {
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  // Validate history entries
  const validHistory = history
    .filter(m => m && typeof m.text === 'string' && m.text.trim().length > 0)
    .map(m => ({ ...m, text: m.role === 'user' ? decodeEntities(m.text) : m.text }))
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
      return res.status(200).json({ reply: "I didn't get a response. Could you try again?" });
    }

    // Extract UPDATE block — handle multiline JSON safely
    const updateMatch = raw.match(/UPDATE:(\{[\s\S]+?\})\s*$/);
    if (updateMatch) {
      try {
        const updateData = JSON.parse(updateMatch[1]);
        const replyText = raw.replace(/UPDATE:[\s\S]+$/, '').trim() || 'I have updated the fields in your resume form!';
        return res.status(200).json({ reply: replyText, updateData });
      } catch (parseErr) {
        console.error('UPDATE JSON parse error:', parseErr.message, updateMatch[1]?.slice(0, 200));
        return res.status(200).json({ reply: raw });
      }
    }

    return res.status(200).json({ reply: raw });

  } catch (err) {
    console.error('Groq error:', err.message);
    if (err.status === 429 || err.message?.includes('rate_limit_exceeded') || err.message?.includes('Rate limit')) {
      return res.status(429).json({ error: 'AI rate limit reached. Please wait a few minutes and try again.' });
    }
    return res.status(500).json({ error: 'AI service error. Please try again in a moment.' });
  }
}
