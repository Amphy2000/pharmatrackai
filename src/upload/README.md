# Upload endpoint + worker

This adds a minimal binary-safe upload endpoint and a simple file-based worker that processes uploads using the importer on the feat/importer-multi-format branch.

Files added
- src/upload/server.ts — minimal HTTP server that accepts PUT /upload?filename=... and computes/validates sha256; enqueues a JSON job to data/jobs/pending
- src/worker/worker.ts — polling worker that processes jobs by calling importFile(filePath) and writes results to data/jobs/done

How it works
1. Client uploads a file with:
   - HTTP PUT to /upload?filename=thefile
   - header `x-sha256` optional (hex sha256 of the file) — server will verify if provided
   - body is the binary file (use curl --data-binary @file)
2. Server stores the raw file under data/uploads and writes a job JSON to data/jobs/pending
3. The worker polls data/jobs/pending, runs importFile(...) on the uploaded file, and writes the result to data/jobs/done/<jobid>.json

Run locally (dev)
- Install required runtime deps (if not already installed):
  npm install --save file-type mammoth xlsx csv-parse

- To run the upload server (in a terminal):
  # using ts-node (install if needed: npm i -D ts-node typescript @types/node)
  npx ts-node src/upload/server.ts

  The server listens on port 3001 by default. Upload via curl:
  SHA=$(sha256sum path/to/file | awk '{print $1}')
  curl -X PUT --data-binary @path/to/file -H "x-sha256: $SHA" "http://localhost:3001/upload?filename=$(basename path/to/file)"

- To run the worker (in another terminal):
  npx ts-node src/worker/worker.ts

Notes & next steps
- This worker is intentionally simple (file-based queue). For production use replace with Redis-backed queue (Bull, Bee-Queue) or a message broker.
- Ensure the worker runs in an isolated environment when invoking LibreOffice / converters.
- Add retention/cleanup policies for data/uploads and data/jobs.
