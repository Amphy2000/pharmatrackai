import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { ImportAdapter, Row } from '../adapter';

export const CsvAdapter: ImportAdapter = {
  async canHandle(fileBuffer: Buffer, fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) return true;
    // quick heuristic: if the buffer contains commas+newlines in first 2KB
    const sample = fileBuffer.slice(0, 2048).toString('utf8');
    return /[,\t].+\n/.test(sample);
  },

  async parse(filePath: string) {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const records = parse(raw, {
      columns: true,
      skip_empty_lines: true,
    });
    return records as Row[];
  },
};
