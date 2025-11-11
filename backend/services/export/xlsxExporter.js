import ExcelJS from "exceljs";

export async function exportXlsx({ title, content, citations }) {
  const wb = new ExcelJS.Workbook();
  const ws1 = wb.addWorksheet("Resumen");
  const ws2 = wb.addWorksheet("Citas");

  ws1.addRow([title || "Informe LitisBot"]);
  ws1.addRow([]);
  String(content || "").split("\n").forEach(line => ws1.addRow([line]));

  ws2.addRow(["#", "Título", "Fuente", "URL", "Fecha"]);
  (Array.isArray(citations) ? citations : []).forEach((c, i) =>
    ws2.addRow([i + 1, c.title, c.source, c.url, c.date || ""])
  );

  return wb.xlsx.writeBuffer();
}
