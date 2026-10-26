import puppeteer from 'puppeteer-core';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getInvoiceHtml } from '../templates/invoiceTemplate.js';

function getBrowserCandidates() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    return [envPath];
  }

  const standardPaths = [
    // Windows - Google Chrome prioritized for headless PDF stability
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // Linux / Docker / Cloud Servers
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
  ];

  return standardPaths.filter(p => fs.existsSync(p));
}

export async function generateInvoicePdfBuffer(invoice) {
  const html = getInvoiceHtml(invoice);
  const candidates = getBrowserCandidates();

  if (candidates.length === 0) {
    throw new Error('No compatible Chrome or Edge browser found for PDF generation. Please set CHROME_PATH or PUPPETEER_EXECUTABLE_PATH in .env');
  }

  let lastError;

  for (const browserPath of candidates) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `rudhvin-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-`));
    let browser;

    try {
      browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: true,
        userDataDir: tempDir,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-extensions',
          '--disable-background-networking',
          '--disable-sync',
          '--remote-debugging-port=0'
        ]
      });

      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 20000
      });
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true
      });

      return Buffer.from(pdfBuffer);
    } catch (err) {
      console.warn(`[PDFService] Launching ${browserPath} failed:`, err.message);
      lastError = err;
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (err) {}
      }
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {}
    }
  }

  throw lastError || new Error('Failed to generate PDF with available browsers');
}
