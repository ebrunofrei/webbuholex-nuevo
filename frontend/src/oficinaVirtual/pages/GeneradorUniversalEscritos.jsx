import React, { useState } from "react";
import VistaPreviaEscritoPJ from "../componentes/VistaPreviaEscritoPJ";
import PerfilFirmaEscaneada from "../componentes/PerfilFirmaEscaneada";
import jsPDF from "jspdf";

// Configura tus tipos y plantillas
const PLANTILLAS = {
  judicial: {
    membrete: "EXPEDIENTE DIGITAL - PODER JUDICIAL DEL PERÚ",
    subtitulo: "Sistema de Escritos Judiciales Electrónicos",
    color: "#b03a1a",
    texto: `SEÑOR JUEZ DEL JUZGADO MIXTO DE BARRANCA\n\nYo, Dr. Eduardo Frei Bruno Gómez, identificado con DNI N° __________, en el proceso seguido con __________, a Ud. respetuosamente digo:\n\n(Escribe aquí tu petición...)\n\nAtentamente,`
  },
  administrativo: {
    membrete: "COMUNICACIÓN OFICIAL - PLATAFORMA BUHOLEX",
    subtitulo: "Sistema de Escritos Digitales Administrativos",
    color: "#3a53b0",
    texto: `SEÑOR DIRECTOR DE LA ENTIDAD ________\n\nYo, Dr. Eduardo Frei Bruno Gómez, identificado con DNI N° __________, a Ud. respetuosamente digo:\n\n(Escriba aquí su solicitud, carta, memorial, etc...)\n\nAtentamente,`
  },
  libre: {
    membrete: "DOCUMENTO PRIVADO / CARTA / MEMORIAL",
    subtitulo: "Generador de Escritos Personalizados",
    color: "#333",
    texto: `A QUIEN CORRESPONDA\n\nYo, Dr. Eduardo Frei Bruno Gómez, identificado con DNI N° __________:\n\n(Escriba aquí su documento libre, carta, declaración, etc...)\n\nAtentamente,`
  }
};

const USUARIO_ACTUAL = "Dr. Eduardo Frei Bruno Gómez";

export default function GeneradorUniversalEscritos() {
  const [tipo, setTipo] = useState("judicial");
  const [texto, setTexto] = useState(PLANTILLAS.judicial.texto);
  const [firmaUrl, setFirmaUrl] = useState("");

  // Al cambiar tipo, carga la plantilla por defecto
  const handleTipo = t => {
    setTipo(t);
    setTexto(PLANTILLAS[t].texto);
  };

  // Exportar PDF con membrete y formato
  const handleDescargarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    // Cabecera/membrete
    doc.setFontSize(13);
    doc.setTextColor(...hexToRgb(PLANTILLAS[tipo].color));
    doc.text(PLANTILLAS[tipo].membrete, 35, 46);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(PLANTILLAS[tipo].subtitulo, 35, 62);
    doc.setDrawColor(...hexToRgb(PLANTILLAS[tipo].color));
    doc.line(35, 70, 560, 70);

    // Cuerpo
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    const splitText = doc.splitTextToSize(texto, 500);
    doc.text(splitText, 40, 100);

    // Firma escaneada (si hay)
    if (firmaUrl) {
      doc.addImage(firmaUrl, "PNG", 360, 660, 180, 60, undefined, "FAST");
      doc.setFontSize(10);
      doc.text(460, 725, USUARIO_ACTUAL, { align: "center" });
    }

    // Advertencia
    doc.setFontSize(9);
    doc.setTextColor(180, 140, 20);
    doc.text(
      "Advertencia: La firma escaneada es declarativa. Para escritos judiciales o administrativos con valor legal, utilice firma digital con certificado oficial.",
      38, 790, { maxWidth: 500 }
    );
    doc.save(`Escrito-${tipo}-${Date.now()}.pdf`);
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: PLANTILLAS[tipo].color }}>
        Generador Universal de Escritos
      </h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleTipo("judicial")}
          className={`px-3 py-2 rounded font-semibold ${tipo === "judicial" ? "bg-[#b03a1a] text-white" : "bg-white border text-[#b03a1a]"}`}>
          Judicial
        </button>
        <button
          onClick={() => handleTipo("administrativo")}
          className={`px-3 py-2 rounded font-semibold ${tipo === "administrativo" ? "bg-[#3a53b0] text-white" : "bg-white border text-[#3a53b0]"}`}>
          Administrativo
        </button>
        <button
          onClick={() => handleTipo("libre")}
          className={`px-3 py-2 rounded font-semibold ${tipo === "libre" ? "bg-[#555] text-white" : "bg-white border text-[#555]"}`}>
          Libre
        </button>
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-2 text-sm" style={{ color: PLANTILLAS[tipo].color }}>
          Escriba su escrito:
        </label>
        <textarea
          className="w-full border rounded p-2 h-52 font-mono text-base"
          value={texto}
          onChange={e => setTexto(e.target.value)}
        />
      </div>
      {/* Firma escaneada */}
      <PerfilFirmaEscaneada firmaUrl={firmaUrl} setFirmaUrl={setFirmaUrl} />
      {/* Vista previa PRO */}
      <VistaPreviaEscritoPJ
        contenido={texto}
        firmaUrl={firmaUrl}
        abogado={USUARIO_ACTUAL}
        membrete={PLANTILLAS[tipo].membrete}
        subtitulo={PLANTILLAS[tipo].subtitulo}
        color={PLANTILLAS[tipo].color}
      />
      {/* Botón descargar */}
      <div className="flex gap-3 mt-6 mb-12">
        <button
          className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-2 rounded font-bold"
          onClick={handleDescargarPDF}
        >
          Descargar como PDF
        </button>
      </div>
    </div>
  );
}

// Utilidad para convertir color HEX a RGB array
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
