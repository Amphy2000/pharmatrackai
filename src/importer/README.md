# Importer: multi-format import service

This directory adds an initial multi-format importer that:

- Provides an adapter interface + registry for pluggable format handlers
- Includes adapters for CSV, XLSX, and DOCX (.docx via mammoth)
- Detects file type via magic bytes (file-type)
- Falls back to LibreOffice headless conversion to TXT when needed

Files added
- src/importer/adapter.ts — adapter interfaces and registry
- src/importer/converters.ts — file-type detection and LibreOffice/mammoth helpers
- src/importer/adapters/csvAdapter.ts — CSV adapter (csv-parse)
- src/importer/adapters/xlsxAdapter.ts — XLSX adapter (xlsx)
- src/importer/adapters/docxAdapter.ts — DOCX (.docx) adapter (mammoth)
- src/importer/index.ts — top-level importFile(filePath) function and registry export

How to install

In the repository root run:

```bash
# install runtime deps used by the new importer
npm install --save file-type mammoth xlsx csv-parse
# if you plan to use LibreOffice fallback you need soffice in PATH (libreoffice package)
# on Debian/Ubuntu:
sudo apt-get update && sudo apt-get install -y libreoffice
```

Recommended next steps
- Add tests and CI jobs that run the importer on representative sample files (CSV, XLSX, DOCX, Atrex sample if you can get one).
- Add a Docker image for a conversion-worker with LibreOffice installed and run conversions in a sandbox.
- Implement a custom Atrex adapter (register it with adapterRegistry.register(myAtrexAdapter)) once you have a sample file.

Security & ops
- Run conversions in isolated containers and virus-scan uploads before conversion.
- Set timeouts and disk quotas for conversions.

Operational fallback policy
- Automatic attempts: detect -> best adapter -> fallback converters -> text extraction -> OCR
- If all fail: mark file as “requires vendor export” and show instructions for user to export CSV/Excel from Atrex/others, or submit file to support for custom adapter.
