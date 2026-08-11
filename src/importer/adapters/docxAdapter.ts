import { ImportAdapter, Row } from '../adapter';
import { extractTextWithMammoth } from '../converters';

export const DocxAdapter: ImportAdapter = {
  async canHandle(fileBuffer: Buffer, fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.docx')) return true;
    // basic heuristic for docx: PK zip header and [Content_Types].xml inside - skip heavy checks here
    if (fileBuffer.slice(0, 2).toString() === 'PK' && lower.endsWith('.doc')) return false;
    return false;
  },

  async parse(filePath: string) {
    const text = await extractTextWithMammoth(filePath);
    // simple strategy: split into lines and return single-column rows
    const rows: Row[] = text
      .split(/\r?\n/) // split lines
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => ({ text: r }));
    return rows;
  },
};
