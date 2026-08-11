import fs from 'fs';
import { spawn } from 'child_process';
import FileType from 'file-type';
import mammoth from 'mammoth';

// Detect file type using magic bytes
export async function detectFileType(path: string) {
  const fd = await fs.promises.open(path, 'r');
  try {
    const buf = Buffer.alloc(4100);
    await fd.read(buf, 0, buf.length, 0);
    const ft = await FileType.fromBuffer(buf);
    return ft; // may be undefined
  } finally {
    await fd.close();
  }
}

// Convert with LibreOffice (soffice) to TXT. Requires soffice in PATH or inside a worker container.
export async function convertWithLibreOffice(inputPath: string, outDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const soffice = spawn('soffice', [
      '--headless',
      '--convert-to',
      'txt:Text',
      '--outdir',
      outDir,
      inputPath,
    ]);

    let stderr = '';
    soffice.stderr.on('data', (b) => (stderr += b.toString()));
    soffice.on('close', (code) => {
      if (code === 0) {
        // look for converted file(s)
        const base = require('path').basename(inputPath, require('path').extname(inputPath));
        const files = fs.readdirSync(outDir).filter((f) => f.startsWith(base) && f.endsWith('.txt'));
        resolve(files.map((f) => require('path').join(outDir, f)));
      } else {
        reject(new Error('soffice failed with code ' + code + '\n' + stderr));
      }
    });
  });
}

// Extract text from docx using mammoth (fast, pure JS for .docx)
export async function extractTextWithMammoth(path: string): Promise<string> {
  const result = await mammoth.extractRawText({ path });
  return result.value; // plain text
}
