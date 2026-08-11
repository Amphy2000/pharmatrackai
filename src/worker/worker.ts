import fs from 'fs';
import path from 'path';

import { importFile } from '../importer';

const DATA_DIR = path.resolve(__dirname, '../../data');
const JOBS_PENDING = path.join(DATA_DIR, 'jobs', 'pending');
const JOBS_PROCESSING = path.join(DATA_DIR, 'jobs', 'processing');
const JOBS_DONE = path.join(DATA_DIR, 'jobs', 'done');

async function ensureDirs() {
  await fs.promises.mkdir(JOBS_PENDING, { recursive: true });
  await fs.promises.mkdir(JOBS_PROCESSING, { recursive: true });
  await fs.promises.mkdir(JOBS_DONE, { recursive: true });
}

async function pollOnce() {
  const files = await fs.promises.readdir(JOBS_PENDING).catch(() => []);
  if (!files || files.length === 0) return;

  // pick the oldest job file
  files.sort();
  const jobFile = files[0];
  const jobPath = path.join(JOBS_PENDING, jobFile);
  let job: any = null;
  try {
    const raw = await fs.promises.readFile(jobPath, 'utf8');
    job = JSON.parse(raw);
  } catch (err) {
    console.error('failed reading job', jobPath, err);
    await fs.promises.unlink(jobPath).catch(() => {});
    return;
  }

  const processingPath = path.join(JOBS_PROCESSING, jobFile);
  await fs.promises.rename(jobPath, processingPath).catch((e) => {
    console.warn('rename failed', e);
    return;
  });

  console.log('processing job', job.id, job.filePath);
  try {
    const result = await importFile(job.filePath).catch((e) => ({ error: String(e) }));

    const out = {
      job,
      result,
      processedAt: new Date().toISOString(),
    };
    const doneFile = path.join(JOBS_DONE, jobFile);
    await fs.promises.writeFile(doneFile, JSON.stringify(out, null, 2), 'utf8');

    // cleanup processing file
    await fs.promises.unlink(processingPath).catch(() => {});
    console.log('job done', job.id);
  } catch (err) {
    console.error('job processing error', err);
    // move back to pending so it can retry later
    const backPath = path.join(JOBS_PENDING, jobFile);
    await fs.promises.rename(processingPath, backPath).catch(() => {});
  }
}

async function runWorker() {
  await ensureDirs();
  console.log('worker started, polling jobs in', JOBS_PENDING);
  while (true) {
    try {
      await pollOnce();
    } catch (err) {
      console.error('poll error', err);
    }
    // wait a short time before next poll
    await new Promise((r) => setTimeout(r, 2000));
  }
}

runWorker().catch((e) => {
  console.error('worker fatal', e);
  process.exit(1);
});
