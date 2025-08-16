import React, { useState, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, rgb } from "pdf-lib";
import QRCode from "qrcode";

// Logo por defecto (puedes dejar vacío o personalizar)
const BUHOLEX_LOGO_BASE64 = ""; // O logo de tu plataforma

const FirmarEscritoPDF = ({
  logoOficina = BUHOLEX_LOGO_BASE64,
  sloganOficina = "Oficina Virtual Legal",
  mostrarPieInstitucional = true,
}) => {
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [signers, setSigners] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pdfPageSizes, setPdfPageSizes] = useState({}); // {pageIndex: {width, height}}

  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
    setSigners([]);
    setPdfPageSizes({});
  };

  const handleAddSigner = () => {
    setSigners((prev) => [
      ...prev,
      {
        name: "",
        image: null,
        page: 1,
        x: 0.1, // 10% del ancho
        y: 0.8, // 80% del alto
        w: 0.18, // 18% del ancho
        h: 0.09, // 9% del alto
        role: "",
      },
    ]);
  };

  const handleSignerImg = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSigners((prev) =>
        prev.map((s, i) =>
          i === idx ? { ...s, image: e.target.result } : s
        )
      );
    };
    reader.readAsDataURL(file);
  };

  // Drag ahora absoluto (x, y como porcentaje)
  const handleDrag = (idx, x, y, pageIndex, absolute = false) => {
    setSigners((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        return absolute
          ? { ...s, x, y }
          : s;
      })
    );
  };

  // Redimensionar firma (proporciones)
  const handleResize = (idx, factor) => {
    setSigners((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        let newW = s.w * factor;
        let newH = s.h * factor;
        newW = Math.max(0.05, Math.min(newW, 0.5));
        newH = Math.max(0.025, Math.min(newH, 0.3));
        return { ...s, w: newW, h: newH };
      })
    );
  };

  const handlePageChange = (idx, page) => {
    setSigners((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, page: Number(page) } : s))
    );
  };

  const handleRoleChange = (idx, role) => {
    setSigners((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, role } : s))
    );
  };

  const handlePageRenderSuccess = (pageIndex, { width, height }) => {
    setPdfPageSizes((prev) => ({
      ...prev,
      [pageIndex]: { width, height },
    }));
  };

  // EXPORTACIÓN PDF
  const handleExportPDF = async (action = "download") => {
    if (!pdfFile) return;
    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      const qrString = `https://buholex.com/verificar/${Date.now()} - Firmado electrónicamente por ${signers[0]?.name || "user"} | ${new Date().toLocaleString("es-PE")}`;
      const qrDataUrl = await QRCode.toDataURL(qrString);

      // Inserta firmas con proporciones
      for (let i = 0; i < signers.length; i++) {
        const s = signers[i];
        const page = pdfDoc.getPage(s.page - 1);
        const realW = page.getWidth();
        const realH = page.getHeight();
        if (s.image) {
          let imgEmbed;
          if (s.image.startsWith("data:image/png")) {
            imgEmbed = await pdfDoc.embedPng(s.image);
          } else if (
            s.image.startsWith("data:image/jpeg") ||
            s.image.startsWith("data:image/jpg")
          ) {
            imgEmbed = await pdfDoc.embedJpg(s.image);
          } else {
            alert("Solo se permiten imágenes PNG o JPG/JPEG para las firmas.");
            continue;
          }
          // Coordenadas proporcionales
          const imgX = s.x * realW;
          const imgY = realH - (s.y * realH) - (s.h * realH);
          const imgW = s.w * realW;
          const imgH = s.h * realH;

          // Borde dorado, fondo blanco, sombra
          const borderGold = rgb(0.87, 0.62, 0.09);
          page.drawRectangle({
            x: imgX - 10,
            y: imgY - 16,
            width: imgW + 20,
            height: imgH + 24,
            color: rgb(1, 1, 1),
            borderColor: borderGold,
            borderWidth: 2,
            opacity: 1,
          });
          page.drawRectangle({
            x: imgX - 8,
            y: imgY - 12,
            width: imgW + 16,
            height: imgH + 20,
            color: rgb(0, 0, 0),
            opacity: 0.09,
          });
          page.drawImage(imgEmbed, {
            x: imgX,
            y: imgY,
            width: imgW,
            height: imgH,
          });
          // Texto bajo firma
          let textUnder = s.name;
          if (s.role) textUnder += " - " + s.role;
          page.drawText(textUnder, {
            x: imgX + 8,
            y: imgY - 11,
            size: 11,
            color: rgb(0.62, 0.48, 0.08),
            font: undefined,
          });
        }
      }

      // Pie institucional personalizado (si aplica)
      if (mostrarPieInstitucional) {
        const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1);
        const pageWidth = lastPage.getWidth();
        const bandHeight = 72;
        const bandY = 0;
        const bandColor = rgb(1, 0.96, 0.84);
        const borderGold = rgb(0.87, 0.62, 0.09);

        lastPage.drawRectangle({
          x: 0,
          y: bandY,
          width: pageWidth,
          height: bandHeight,
          color: bandColor,
          opacity: 0.97,
          borderColor: borderGold,
          borderWidth: 2,
        });

        const qrImg = await pdfDoc.embedPng(qrDataUrl);
        lastPage.drawImage(qrImg, {
          x: 28,
          y: bandY + 14,
          width: 44,
          height: 44,
        });

        if (logoOficina) {
          const logoImg = await pdfDoc.embedPng(logoOficina);
          lastPage.drawImage(logoImg, {
            x: pageWidth - 72,
            y: bandY + 12,
            width: 48,
            height: 48,
          });
        }

        const fecha = new Date().toLocaleString("es-PE");
        const nombre = signers[0]?.name || "user";
        lastPage.drawText(
          `FIRMADO ELECTRÓNICAMENTE por ${nombre.toUpperCase()} • ${sloganOficina}`,
          {
            x: pageWidth / 2 - 160,
            y: bandY + 42,
            size: 13,
            color: rgb(0.75, 0.49, 0.03),
            font: undefined,
          }
        );
        lastPage.drawText(
          `Autenticidad validable por QR • ${fecha}`,
          {
            x: pageWidth / 2 - 95,
            y: bandY + 24,
            size: 10,
            color: rgb(0.39, 0.27, 0.10),
            font: undefined,
          }
        );
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      if (action === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = "escrito_firmado_oficina_virtual.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (action === "print") {
        const win = window.open(url, "_blank");
        setTimeout(() => {
          if (win) win.print();
        }, 800);
      }
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert("Error al generar PDF: " + err.message);
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fdf6f1]">
      {/* Sidebar */}
      <div className="md:w-1/4 w-full p-4 flex flex-col gap-4 border-r border-[#e9cba7] bg-[#fff7ee]">
        <h2 className="text-2xl font-bold text-[#b76e33] mb-2">Firmar PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button
          onClick={handleAddSigner}
          className="bg-[#b76e33] text-white rounded-xl py-2 px-3 my-2 hover:bg-[#a25423] transition"
        >
          + Añadir firmante
        </button>
        <h3 className="font-semibold text-[#a25423]">Firmantes</h3>
        {signers.map((signer, idx) => (
          <div
            key={idx}
            className="p-2 mb-2 rounded-xl border border-[#e9cba7] bg-[#fff0e2]"
          >
            <input
              type="text"
              placeholder="Nombre del firmante"
              value={signer.name}
              onChange={(e) =>
                setSigners((prev) =>
                  prev.map((s, i) =>
                    i === idx ? { ...s, name: e.target.value } : s
                  )
                )
              }
              className="block w-full mb-1 px-2 py-1 rounded-md border"
            />
            <input
              type="text"
              placeholder="Rol (opcional)"
              value={signer.role}
              onChange={(e) => handleRoleChange(idx, e.target.value)}
              className="block w-full mb-1 px-2 py-1 rounded-md border"
            />
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              onChange={(e) => handleSignerImg(idx, e.target.files[0])}
              className="mb-1"
            />
            <label className="text-xs block mb-1">
              Página:
              <select
                value={signer.page}
                onChange={(e) => handlePageChange(idx, e.target.value)}
                className="ml-1 border rounded px-1"
              >
                {Array.from(
                  { length: numPages || 1 },
                  (_, i) => i + 1
                ).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <span className="text-xs text-[#b76e33]">
              Tamaño: {(signer.w * 100).toFixed(1)}% x {(signer.h * 100).toFixed(1)}%
            </span>
          </div>
        ))}
        <div className="flex items-center mt-2">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
            className="px-2 text-lg"
          >
            -
          </button>
          <span className="mx-2 text-[#a25423] font-bold">{(zoom * 100).toFixed(0)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
            className="px-2 text-lg"
          >
            +
          </button>
        </div>
        <button
          onClick={() => handleExportPDF("download")}
          className="bg-green-700 text-white font-bold rounded-xl py-2 px-3 mt-4 hover:bg-green-900 transition"
        >
          Descargar PDF Firmado
        </button>
        <button
          onClick={() => handleExportPDF("print")}
          className="bg-blue-700 text-white font-bold rounded-xl py-2 px-3 mt-2 hover:bg-blue-900 transition"
        >
          Imprimir PDF Firmado
        </button>
      </div>
      {/* Visor PDF */}
      <div className="flex-1 flex flex-col items-center overflow-auto">
        {!pdfFile ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xl">
            Sube un archivo PDF para comenzar
          </div>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            className="mx-auto mt-4"
          >
            {Array.from({ length: numPages }, (_, pageIndex) => (
              <div key={pageIndex} className="relative my-4 mx-auto flex justify-center">
                <Page
                  pageNumber={pageIndex + 1}
                  scale={zoom}
                  width={Math.min(800, window.innerWidth * 0.98)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={({ width, height }) =>
                    handlePageRenderSuccess(pageIndex, { width, height })
                  }
                />
                {signers
                  .filter((s) => s.page === pageIndex + 1 && s.image)
                  .map((signer, idx) => (
                    <DraggableSignature
                      key={idx}
                      signer={signer}
                      idx={idx}
                      zoom={zoom}
                      pageIndex={pageIndex}
                      pdfPageSizes={pdfPageSizes}
                      handleDrag={handleDrag}
                      handleResize={handleResize}
                    />
                  ))}
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
};

const DraggableSignature = ({
  signer,
  idx,
  zoom,
  pageIndex,
  pdfPageSizes,
  handleDrag,
  handleResize,
}) => {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const size = pdfPageSizes[pageIndex] || { width: 800, height: 1000 };
  const visualX = signer.x * size.width;
  const visualY = signer.y * size.height;
  const visualW = signer.w * size.width;
  const visualH = signer.h * size.height;

  const onMouseDown = (e) => {
    setDragging(true);
    const rect = e.target.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    e.stopPropagation();
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const parent = e.target.closest(".react-pdf__Page__canvas") || e.target.parentNode;
    const parentRect = parent.getBoundingClientRect();
    let x = (e.clientX - parentRect.left - dragOffset.x) / size.width;
    let y = (e.clientY - parentRect.top - dragOffset.y) / size.height;
    x = Math.max(0, Math.min(x, 1 - signer.w));
    y = Math.max(0, Math.min(y, 1 - signer.h));
    handleDrag(idx, x, y, pageIndex, true);
  };

  const onMouseUp = () => setDragging(false);

  React.useEffect(() => {
    if (!dragging) return;
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  });

  const handleResizeBtn = (factor) => {
    handleResize(idx, factor);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: visualX,
        top: visualY,
        width: visualW,
        height: visualH,
        cursor: "grab",
        zIndex: 10,
        border: "1.5px solid #b76e33",
        background: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}
      onMouseDown={onMouseDown}
    >
      <img
        src={signer.image}
        alt="firma"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
        draggable={false}
      />
      <div className="absolute right-0 bottom-0 flex gap-1">
        <button
          className="bg-[#b76e33] text-white px-1 rounded hover:bg-[#a25423] text-xs"
          onClick={() => handleResizeBtn(1.1)}
          type="button"
        >
          +
        </button>
        <button
          className="bg-[#b76e33] text-white px-1 rounded hover:bg-[#a25423] text-xs"
          onClick={() => handleResizeBtn(0.9)}
          type="button"
        >
          -
        </button>
      </div>
    </div>
  );
};

export default FirmarEscritoPDF;
