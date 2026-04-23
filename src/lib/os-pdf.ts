import jsPDF from "jspdf";
import QRCode from "qrcode";

interface OSItem {
  posicao_codigo: string;
  tipo_servico: string;
  categoria_servico: string;
  custo_unitario: number;
  tempo_estimado_minutos: number;
  tecnico_responsavel?: string;
  observacoes_tecnicas?: string;
}

interface OSData {
  numero_os: string;
  veiculo_placa: string;
  veiculo_modelo?: string;
  responsavel?: string;
  hodometro_km?: number;
  tipo_os: string;
  local_execucao: string;
  status: string;
  custo_total: number;
  tempo_total_minutos: number;
  observacoes?: string;
  aberta_em: string;
  itens: OSItem[];
}

export async function gerarPDFOrdemServico(os: OSData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(56, 189, 248);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("RASTRO INSIGHTS", margin, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(226, 232, 240);
  doc.text("Ordem de Serviço — Manutenção de Frota", margin, 22);

  // QR Code
  try {
    const qrUrl = `${window.location.origin}/manutencao/os/${os.numero_os}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 80, margin: 0, color: { dark: "#0f172a", light: "#ffffff" } });
    doc.addImage(qrDataUrl, "PNG", pageW - margin - 22, 5, 22, 22);
  } catch {}

  y = 38;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(os.numero_os, margin, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Aberta em: ${new Date(os.aberta_em).toLocaleString("pt-BR")}`, pageW - margin, y, { align: "right" });

  // Box de dados
  y += 6;
  doc.setDrawColor(220);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - 2 * margin, 32, 2, 2, "FD");
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);

  const col1X = margin + 4;
  const col2X = pageW / 2 + 4;
  let yy = y + 6;
  const linha = (label: string, val: string, x: number, yL: number) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, x, yL);
    doc.setFont("helvetica", "normal");
    doc.text(val, x + 32, yL);
  };

  linha("Veículo:", `${os.veiculo_placa}${os.veiculo_modelo ? " — " + os.veiculo_modelo : ""}`, col1X, yy);
  linha("Tipo OS:", os.tipo_os, col2X, yy);
  yy += 6;
  linha("Responsável:", os.responsavel || "—", col1X, yy);
  linha("Local:", os.local_execucao.replace(/_/g, " "), col2X, yy);
  yy += 6;
  linha("Hodômetro:", os.hodometro_km ? `${os.hodometro_km.toLocaleString()} km` : "—", col1X, yy);
  linha("Status:", os.status, col2X, yy);
  yy += 6;
  linha("Custo Total:", `R$ ${os.custo_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, col1X, yy);
  linha("Tempo:", `${os.tempo_total_minutos} min`, col2X, yy);

  y += 38;

  // Tabela de serviços
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Serviços", margin, y);
  y += 4;

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, pageW - 2 * margin, 7, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.text("Pos.", margin + 2, y + 5);
  doc.text("Serviço", margin + 18, y + 5);
  doc.text("Categoria", margin + 75, y + 5);
  doc.text("Técnico", margin + 105, y + 5);
  doc.text("Tempo", margin + 140, y + 5);
  doc.text("Valor", pageW - margin - 2, y + 5, { align: "right" });
  y += 7;

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  os.itens.forEach((it, idx) => {
    if (y > 260) {
      doc.addPage();
      y = margin;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, pageW - 2 * margin, 6, "F");
    }
    doc.text(it.posicao_codigo, margin + 2, y + 4);
    doc.text(it.tipo_servico, margin + 18, y + 4);
    doc.text(it.categoria_servico, margin + 75, y + 4);
    doc.text(it.tecnico_responsavel || "—", margin + 105, y + 4);
    doc.text(`${it.tempo_estimado_minutos}min`, margin + 140, y + 4);
    doc.text(`R$ ${it.custo_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pageW - margin - 2, y + 4, { align: "right" });
    y += 6;
  });

  // Totais
  y += 4;
  doc.setDrawColor(15, 23, 42);
  doc.line(margin, y, pageW - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Total: R$ ${os.custo_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: "right" });

  // Observações
  if (os.observacoes) {
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Observações:", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(os.observacoes, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 4;
  }

  // Assinaturas
  y = Math.max(y + 20, 240);
  doc.setDrawColor(120);
  doc.line(margin, y, margin + 70, y);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("Responsável Técnico", margin, y + 4);
  doc.text("Aprovação Frota", pageW - margin - 70, y + 4);

  doc.save(`${os.numero_os}.pdf`);
}
