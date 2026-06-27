import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const isDev = process.env.NODE_ENV !== 'production';

// Common Chrome paths for local development
const LOCAL_CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
];

async function getExecPath() {
  if (!isDev) return await chromium.executablePath();
  const fs = await import('fs');
  for (const p of LOCAL_CHROME_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome not found. Install Google Chrome on your machine.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { html, name } = req.body;
  if (!html) return res.status(400).json({ error: 'Missing html' });

  let browser;
  try {
    const executablePath = await getExecPath();

    browser = await puppeteer.launch({
      args: isDev
        ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        : chromium.args,
      executablePath,
      headless: true,
      defaultViewport: { width: 1200, height: 900 },
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    const filename = (name || 'resume').replace(/\s+/g, '_') + '_Resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdf));

  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
