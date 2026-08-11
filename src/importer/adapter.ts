// Adapter interface and registry for importers
export type Row = { [k: string]: any };

export interface ImportAdapter {
  // inspect the initial bytes and filename to decide if adapter can handle
  canHandle(fileBuffer: Buffer, fileName: string): Promise<boolean>;
  // parse the file and yield rows (array or async iterable)
  parse(filePath: string): Promise<Row[]>;
}

export class AdapterRegistry {
  private adapters: ImportAdapter[] = [];

  register(adapter: ImportAdapter) {
    this.adapters.push(adapter);
  }

  async findAdapter(buffer: Buffer, fileName: string): Promise<ImportAdapter | null> {
    for (const a of this.adapters) {
      try {
        if (await a.canHandle(buffer, fileName)) return a;
      } catch (err) {
        // adapter threw while probing; ignore and try next
        console.warn('adapter probe error', err);
      }
    }
    return null;
  }
}
