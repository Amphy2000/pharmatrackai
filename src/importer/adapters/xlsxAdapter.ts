import fs from 'fs';
import XLSX from 'xlsx';
import { ImportAdapter, Row } from '../adapter';

export const XlsxAdapter: ImportAdapter = {
  async canHandle(fileBuffer: Buffer, fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) return true;
    // quick magic: XLSX files are zip archives starting with PK
    if (fileBuffer.slice(0, 2).toString() === 'PK') return true;
    return false;
  },

  async parse(filePath: string) {
    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Row[];
    return rows;
  },
};
