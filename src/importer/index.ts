import path from 'path';
import os from 'os';
import fs from 'fs';
import { AdapterRegistry } from './adapter';
import { detectFileType, convertWithLibreOffice } from './converters';
import { CsvAdapter } from './adapters/csvAdapter';
import { XlsxAdapter } from './adapters/xlsxAdapter';
import { DocxAdapter } from './adapters/docxAdapter';

const registry = new AdapterRegistry();
registry.register(CsvAdapter);
registry.register(XlsxAdapter);
registry.register(DocxAdapter);

export async function importFile(filePath: string) {
  const fileName = path.basename(filePath);
  const buffer = await fs.promises.readFile(filePath).catch(() => Buffer.alloc(0));

  // 1) try to find a direct adapter
  const adapter = await registry.findAdapter(buffer, fileName);
  if (adapter) {
    const rows = await adapter.parse(filePath);
    return { source: 'adapter', rows };
  }

  // 2) detect file type and try again
  const ft = await detectFileType(filePath);
  if (ft) {
    // re-run probe - some adapters check mime/extension
    const adapter2 = await registry.findAdapter(buffer, fileName);
    if (adapter2) {
      const rows = await adapter2.parse(filePath);
      return { source: 'adapter-detected', ft, rows };
    }
  }

  // 3) fallback: try LibreOffice convert-to-text
  const outDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'conv-'));
  try {
    const converted = await convertWithLibreOffice(filePath, outDir).catch((e) => {
      console.warn('libreoffice convert failed', e);
      return [] as string[];
    });
    if (converted.length) {
      // try adapters on converted files
      for (const c of converted) {
        const buf = await fs.promises.readFile(c);
        const a = await registry.findAdapter(buf, path.basename(c));
        if (a) {
          const rows = await a.parse(c);
          return { source: 'libreoffice+' + a.constructor.name, converted: c, rows };
        }
        // if converted to txt, return lines
        const text = buf.toString('utf8');
        const rows = text
          .split(/\r?\n/)
          .map((r) => r.trim())
          .filter((r) => r.length)
          .map((r) => ({ text: r }));
        if (rows.length) return { source: 'libreoffice-txt', converted: c, rows };
      }
    }
  } finally {
    // leave cleanup for now - in production remove temp dirs
  }

  // 4) final fallback: return raw bytes as a single record and instruct manual processing
  return { source: 'unknown', rows: [{ fileName, size: buffer.length }] };
}

// export registry for registering custom adapters (e.g., Atrex)
export { registry as adapterRegistry };
