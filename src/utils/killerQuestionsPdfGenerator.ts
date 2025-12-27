import jsPDF from 'jspdf';

const COLORS = {
  navy: [15, 23, 42] as const,
  emerald: [16, 185, 129] as const,
  red: [239, 68, 68] as const,
  gold: [245, 158, 11] as const,
  slate: [100, 116, 139] as const,
  white: [255, 255, 255] as const,
};

export const generateKillerQuestionsPdf = (): jsPDF => {
  // A5 format for a flyer
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let y = 10;

  // === HEADER ===
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('6 Questions Your', pageWidth / 2, 14, { align: 'center' });
  doc.text('Current App Can\'t Answer', pageWidth / 2, 22, { align: 'center' });

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Ask Your POS Vendor These Today', pageWidth / 2, 30, { align: 'center' });

  y = 42;

  // === QUESTIONS ===
  const questions = [
    {
      question: 'Can it generate a NAFDAC Batch Traceability Report?',
      why: 'Required for 2024/2025 regulatory compliance. Failure = license risk.',
      icon: '📋',
    },
    {
      question: 'Can staff change selling prices during a sale?',
      why: 'If yes, that\'s how your profit disappears. Staff theft costs 2-5% of revenue.',
      icon: '🔒',
    },
    {
      question: 'Does it warn about dangerous drug interactions?',
      why: 'Patient safety at checkout. Protects your license from malpractice.',
      icon: '⚠️',
    },
    {
      question: 'Can it predict which items will expire in 60 days?',
      why: 'AI prediction vs basic date alerts. 70% of expiring stock can be saved.',
      icon: '🤖',
    },
    {
      question: 'Can it scan an invoice and stock 50 items in 30 seconds?',
      why: 'Manual entry = 40+ hours/month wasted. Our AI does it in seconds.',
      icon: '📸',
    },
    {
      question: 'Does it track controlled drugs with a legal audit trail?',
      why: 'Narcotics require strict documentation. PCN inspectors check this.',
      icon: '💊',
    },
  ];

  doc.setFontSize(9);
  questions.forEach((item, index) => {
    // Question number and text
    doc.setTextColor(...COLORS.navy);
    doc.setFont('helvetica', 'bold');
    const qLines = doc.splitTextToSize(`${index + 1}. ${item.question}`, pageWidth - 2 * margin);
    doc.text(qLines, margin, y);
    y += qLines.length * 4 + 2;

    // Why it matters
    doc.setTextColor(...COLORS.slate);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    const whyLines = doc.splitTextToSize(`→ ${item.why}`, pageWidth - 2 * margin - 5);
    doc.text(whyLines, margin + 3, y);
    y += whyLines.length * 3.5 + 5;
    doc.setFontSize(9);
  });

  // === ANSWER BOX ===
  y = pageHeight - 50;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 20, 2, 2, 'F');

  doc.setTextColor(...COLORS.emerald);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PharmaTrack AI answers YES to ALL 6.', pageWidth / 2, y + 8, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Can your current app?', pageWidth / 2, y + 14, { align: 'center' });

  // === CTA ===
  y = pageHeight - 25;
  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 18, 2, 2, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Start Free Trial Today', pageWidth / 2, y + 7, { align: 'center' });

  doc.setTextColor(...COLORS.gold);
  doc.setFontSize(9);
  doc.text('WhatsApp: +2349169153129', pageWidth / 2, y + 13, { align: 'center' });

  return doc;
};

export const downloadKillerQuestionsPdf = (): void => {
  const doc = generateKillerQuestionsPdf();
  doc.save('PharmaTrack-6-Killer-Questions.pdf');
};
