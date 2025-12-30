import jsPDF from "jspdf";

let cached: { regular: string; bold: string } | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

/**
 * Ensures Noto Sans is registered in jsPDF so currency symbols like ₦ render correctly.
 * Fonts are loaded from /public/fonts and cached in-memory for this session.
 */
export const ensureNotoSansFonts = async (doc: jsPDF): Promise<void> => {
  const anyDoc = doc as any;
  if (anyDoc.__notoSansFontsLoaded) return;

  try {
    if (!cached) {
      const [regularRes, boldRes] = await Promise.all([
        fetch("/fonts/NotoSans-Regular.ttf"),
        fetch("/fonts/NotoSans-Bold.ttf"),
      ]);

      if (!regularRes.ok || !boldRes.ok) return;

      const [regularBuf, boldBuf] = await Promise.all([
        regularRes.arrayBuffer(),
        boldRes.arrayBuffer(),
      ]);

      cached = {
        regular: arrayBufferToBase64(regularBuf),
        bold: arrayBufferToBase64(boldBuf),
      };
    }

    doc.addFileToVFS("NotoSans-Regular.ttf", cached.regular);
    doc.addFileToVFS("NotoSans-Bold.ttf", cached.bold);
    doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    doc.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");

    anyDoc.__notoSansFontsLoaded = true;
  } catch {
    // If fonts fail to load, jsPDF will fall back to built-in fonts.
  }
};
