import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export async function exportDocx({ title, content, citations }) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: "" }),
        ...String(content || "").split("\n").map(p => new Paragraph(p)),
        new Paragraph({ text: "" }),
        new Paragraph({ text: "Citas", heading: HeadingLevel.HEADING_2 }),
        ...(Array.isArray(citations) ? citations : []).map((c, i) =>
          new Paragraph(new TextRun({
            text: `${i + 1}. ${c.title} (${c.source}) – ${c.url}`,
            underline: {},
          }))
        ),
      ],
    }],
  });
  return Packer.toBuffer(doc);
}
