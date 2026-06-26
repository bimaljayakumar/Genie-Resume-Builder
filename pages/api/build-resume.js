// TODO: Connect to OpenAI API to generate resume content
// TODO: Connect to a PDF generation service (e.g. puppeteer, pdf-lib)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { prompt, user } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  // Placeholder — replace with real AI + PDF generation logic
  // 1. Send prompt to OpenAI → get resume JSON
  // 2. Convert resume JSON to styled HTML
  // 3. Use puppeteer/html-pdf to generate PDF
  // 4. Return PDF URL or base64

  return res.status(200).json({
    pdfUrl: null, // replace with real PDF URL
    message: 'Resume generation not yet connected to AI',
  });
}
