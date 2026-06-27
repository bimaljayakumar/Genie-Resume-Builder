export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

// Strip <script> tags and dangerous attributes from HTML before passing to Puppeteer (SSRF fix)
function sanitizeHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { html, name } = req.body;
  if (!html) return res.status(400).json({ error: 'Missing html' });

  // Validate name is a plain string, not a URL or path
  const safeName = typeof name === 'string'
    ? name.replace(/[^a-zA-Z0-9 _-]/g, '').trim() || 'resume'
    : 'resume';

  const safeHtml = sanitizeHtml(html);

  let browser;
  try {
    if (process.env.NODE_ENV === 'production') {
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteerCore = (await import('puppeteer-core')).default;
      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
        defaultViewport: { width: 1240, height: 1754 },
      });
    } else {
      const puppeteer = (await import('puppeteer')).default;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        defaultViewport: { width: 1240, height: 1754 },
      });
    }

    const page = await browser.newPage();

    // Block only scripts and iframes — allow fonts/stylesheets so resume renders correctly
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const type = request.resourceType();
      const url  = request.url();
      // Block scripts and iframes, allow everything else (fonts, stylesheets)
      if (type === 'script' || type === 'media' || type === 'websocket') {
        request.abort();
      } else if (type === 'document' && url !== 'about:blank' && !url.startsWith('data:')) {
        request.abort();
      } else {
        request.continue();
      }
    });

    await page.setContent(safeHtml, { waitUntil: 'networkidle0', timeout: 30000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    const filename = safeName.replace(/\s+/g, '_') + '_Resume.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdf));

  } catch (err) {
    console.error('PDF error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    if (browser) await browser.close();
  }
}
