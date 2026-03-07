import jsPDF from "jspdf";

export function generateLabelPdf(pneu: any) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [70, 40],
  });

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(pneu.rg_code || pneu.id_unico || "—", 35, 5, { align: "center" });

  // QR Code area placeholder (we draw a bordered box — actual QR rendered via canvas)
  const qrSize = 22;
  const qrX = 35 - qrSize / 2;
  const qrY = 7;

  // Draw QR code using canvas
  const canvas = document.createElement("canvas");
  const qrSvg = document.querySelector(`[data-label-qr="${pneu.rg_code || pneu.id_unico}"]`) as SVGElement | null;
  
  // Fallback: generate QR via text
  doc.setDrawColor(0);
  doc.rect(qrX, qrY, qrSize, qrSize);
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.text("QR CODE", 35, qrY + qrSize / 2 + 1, { align: "center" });

  // Info below QR
  const infoY = qrY + qrSize + 3;
  doc.setFontSize(6);
  doc.text(`Medida: ${pneu.medida || "—"}`, 3, infoY);
  doc.text(`Marca: ${pneu.marca || "—"}`, 3, infoY + 3.5);
  doc.text(`DOT: ${pneu.dot || "—"}`, 40, infoY);
  doc.text(new Date().toLocaleDateString("pt-BR"), 40, infoY + 3.5);

  doc.save(`etiqueta-${pneu.rg_code || pneu.id_unico}.pdf`);
}

export function generateBatchLabelsPdf(pneus: any[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const cols = 3;
  const rows = 8;
  const labelW = 60;
  const labelH = 30;
  const marginX = (210 - cols * labelW) / 2;
  const marginY = (297 - rows * labelH) / 2;

  pneus.forEach((pneu, idx) => {
    if (idx > 0 && idx % (cols * rows) === 0) doc.addPage();
    const pageIdx = idx % (cols * rows);
    const col = pageIdx % cols;
    const row = Math.floor(pageIdx / cols);
    const x = marginX + col * labelW;
    const y = marginY + row * labelH;

    doc.setDrawColor(200);
    doc.rect(x, y, labelW, labelH);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text(pneu.rg_code || pneu.id_unico || "—", x + labelW / 2, y + 4, { align: "center" });

    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.text(`${pneu.medida || "—"} | ${pneu.marca || "—"}`, x + labelW / 2, y + 8, { align: "center" });

    // QR placeholder
    const qrS = 14;
    doc.rect(x + (labelW - qrS) / 2, y + 10, qrS, qrS);
    doc.setFontSize(4);
    doc.text("QR", x + labelW / 2, y + 17.5, { align: "center" });

    doc.setFontSize(5);
    doc.text(`DOT: ${pneu.dot || "—"}`, x + 2, y + 27);
    doc.text(new Date().toLocaleDateString("pt-BR"), x + labelW - 2, y + 27, { align: "right" });
  });

  doc.save(`etiquetas-lote-${pneus.length}-pneus.pdf`);
}
