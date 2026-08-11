import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';

const DATA_DIR = path.resolve(__dirname, '../../data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const JOBS_PENDING = path.join(DATA_DIR, 'jobs', 'pending');

async function ensureDirs() {
  await fs.promises.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.promises.mkdir(JOBS_PENDING, { recursive: true });
}

function generateId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Minimal HTTP PUT handler: client should PUT file and set query ?filename=... and optional header 'x-sha256'
const server = http.createServer(async (req, res) => {
  if (req.method === 'PUT' && req.url && req.url.startsWith('/upload')) {
    try {
      await ensureDirs();
      const url = new URL(req.url, `http://${req.headers.host}`);
      const fileName = url.searchParams.get('filename') || `upload-${Date.now()}`;
      const expected = (req.headers['x-sha256'] as string) || '';

      const id = generateId();
      const outFile = path.join(UPLOAD_DIR, `${id}-${fileName}`);
      const hash = crypto.createHash('sha256');
      const writeStream = fs.createWriteStream(outFile, { flags: 'wx' });

      req.on('data', (chunk) => hash.update(chunk));
      await pipeline(req, writeStream);

      const actual = hash.digest('hex');
      if (expected && expected !== actual) {
        // integrity failure: remove file and report
        await fs.promises.unlink(outFile).catch(() => {});
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, reason: 'checksum-mismatch', expected, actual }));
        return;
      }

      // enqueue job
      const job = {
        id,
        fileName,
        filePath: outFile,
        sha256: actual,
        createdAt: new Date().toISOString(),
      };
      const jobFile = path.join(JOBS_PENDING, `${id}.json`);
      await fs.promises.writeFile(jobFile, JSON.stringify(job, null, 2), { encoding: 'utf8' });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id, path: outFile, sha256: actual }));
    } catch (err) {
      console.error('upload error', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
server.listen(PORT, () => console.log(`upload server listening on ${PORT}`));
