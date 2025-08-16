import React, { useRef } from "react";
import Draggable from "react-draggable";
import html2canvas from "html2canvas";
// Puedes agregar más fuentes o paletas aquí
import "@fontsource/roboto";           // Sans Serif elegante
import "@fontsource/merriweather";     // Serif clásica

const FONTS = [
  { name: "Roboto", fontFamily: "'Roboto', sans-serif" },
  { name: "Merriweather", fontFamily: "'Merriweather', serif" },
  { name: "Arial", fontFamily: "Arial, sans-serif" },
  { name: "Times", fontFamily: "Times New Roman, serif" }
];

export default function TarjetaPresentacionPro({
  nombre = "Nombre Completo",
  profesion = "Profesión / Grado",
  especialidad = "Especialidad",
  registro = "",
  eslogan = "",
  direccion = "",
  email = "",
  celular = "",
  whatsapp = "",
  telegram = "",
  logo = "",
  icono = "",
  plantilla = "doradoNegro",
  colorPrincipal = "#bdaa71",
  fondo = "#232323",
  qrData = ""
}) {
  const cardRef = useRef(null);

  // Estructura editable
  const [fields, setFields] = React.useState([
    {
      id: "nombre",
      text: nombre,
      font: FONTS[0].fontFamily,
      color: plantilla === "doradoNegro" ? "#232323" : "#0c2340",
      size: 26,
      top: 40, left: 50, editing: false
    },
    {
      id: "profesion",
      text: profesion,
      font: FONTS[0].fontFamily,
      color: plantilla === "doradoNegro" ? "#232323" : "#0c2340",
      size: 20,
      top: 80, left: 50, editing: false
    },
    {
      id: "eslogan",
      text: eslogan,
      font: FONTS[1].fontFamily,
      color: "#757575",
      size: 15,
      top: 110, left: 50, editing: false
    },
    {
      id: "contacto",
      text: `${celular ? `Cel: ${celular}  ` : ""}${email ? `Email: ${email}` : ""}`,
      font: FONTS[0].fontFamily,
      color: plantilla === "doradoNegro" ? "#232323" : "#0c2340",
      size: 15,
      top: 170, left: 50, editing: false
    },
    {
      id: "direccion",
      text: direccion,
      font: FONTS[0].fontFamily,
      color: "#757575",
      size: 13,
      top: 200, left: 50, editing: false
    },
  ]);
  // Logo/símbolo (max 2)
  const [images, setImages] = React.useState([
    ...(logo ? [{ src: logo, top: 20, left: 300, size: 55, id: "logo" }] : []),
    ...(icono ? [{ src: icono, top: 20, left: 20, size: 40, id: "icono" }] : [])
  ]);
  // Control fuente global
  const [selectedField, setSelectedField] = React.useState(null);

  // Mover campos
  const handleDrag = (i, e, data) => {
    setFields(f =>
      f.map((field, idx) =>
        idx === i ? { ...field, top: data.y, left: data.x } : field
      )
    );
  };
  // Mover imágenes
  const handleImgDrag = (i, e, data) => {
    setImages(imgs =>
      imgs.map((img, idx) =>
        idx === i ? { ...img, top: data.y, left: data.x } : img
      )
    );
  };
  // Editar texto in-place
  const handleTextChange = (i, value) => {
    setFields(f =>
      f.map((field, idx) =>
        idx === i ? { ...field, text: value } : field
      )
    );
  };
  // Cambiar fuente/estilo/tamaño
  const handleFontChange = (i, prop, value) => {
    setFields(f =>
      f.map((field, idx) =>
        idx === i ? { ...field, [prop]: value } : field
      )
    );
  };

  // Eliminar campo
  const removeField = i => setFields(f => f.filter((_, idx) => idx !== i));
  const removeImg = i => setImages(imgs => imgs.filter((_, idx) => idx !== i));

  // Descargar imagen
  const handleDownload = async () => {
    const el = cardRef.current;
    if (!el) return;
    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "tarjeta-buholex.png";
    link.click();
  };

  // Añadir campo nuevo
  const addField = () =>
    setFields([
      ...fields,
      {
        id: `nuevo${Date.now()}`,
        text: "Texto nuevo",
        font: FONTS[0].fontFamily,
        color: plantilla === "doradoNegro" ? "#232323" : "#0c2340",
        size: 15,
        top: 240,
        left: 80,
        editing: true
      }
    ]);
  // Añadir imagen nueva (por ejemplo usando un input en el formulario padre)

  // Selector de fuente visual
  const FontSelector = ({ idx }) => (
    <select
      value={fields[idx].font}
      onChange={e => handleFontChange(idx, "font", e.target.value)}
      className="rounded border p-1 text-xs"
    >
      {FONTS.map(f => (
        <option key={f.name} value={f.fontFamily}>{f.name}</option>
      ))}
    </select>
  );

  // Selector color texto
  const ColorInput = ({ idx }) => (
    <input
      type="color"
      value={fields[idx].color}
      onChange={e => handleFontChange(idx, "color", e.target.value)}
      style={{ width: 30, height: 30, border: "none", background: "none" }}
    />
  );

  // Selector tamaño
  const SizeInput = ({ idx }) => (
    <input
      type="number"
      min={10}
      max={60}
      value={fields[idx].size}
      onChange={e => handleFontChange(idx, "size", Number(e.target.value))}
      className="w-12 ml-2 text-xs rounded border"
    />
  );

  return (
    <div>
      <div className="mb-3 flex gap-2 items-center">
        <button onClick={addField} className="px-2 py-1 bg-[#bdaa71] text-white rounded text-xs">+ Texto</button>
        <button onClick={handleDownload} className="px-2 py-1 bg-[#3a99d7] text-white rounded text-xs">Descargar</button>
        {selectedField !== null && (
          <div className="flex gap-2 items-center ml-4">
            <FontSelector idx={selectedField} />
            <ColorInput idx={selectedField} />
            <span className="text-xs ml-2">Tamaño</span>
            <SizeInput idx={selectedField} />
            <button className="text-red-600 text-xs ml-2"
              onClick={() => removeField(selectedField)}>Eliminar</button>
          </div>
        )}
      </div>
      <div
        ref={cardRef}
        className="relative mx-auto"
        style={{
          width: 370,
          height: 220,
          background: `linear-gradient(120deg, ${fondo}, #ffe690 90%)`,
          borderRadius: 20,
          border: `4px solid ${colorPrincipal}`,
          boxShadow: "0 8px 28px #3334",
          overflow: "hidden"
        }}
      >
        {/* Drag-n-drop campos */}
        {fields.map((f, i) => (
          <Draggable
            key={f.id}
            bounds="parent"
            position={{ x: f.left, y: f.top }}
            onDrag={(e, data) => handleDrag(i, e, data)}
          >
            <div
              style={{
                position: "absolute",
                fontFamily: f.font,
                color: f.color,
                fontSize: f.size,
                cursor: "move",
                userSelect: "none",
                padding: 2,
                background: selectedField === i ? "#fff5" : "transparent",
                borderRadius: 6
              }}
              onClick={e => setSelectedField(i)}
              onDoubleClick={e => handleFontChange(i, "editing", true)}
            >
              {f.editing ? (
                <input
                  value={f.text}
                  onChange={ev => handleTextChange(i, ev.target.value)}
                  onBlur={() => handleFontChange(i, "editing", false)}
                  autoFocus
                  style={{
                    fontFamily: f.font,
                    color: f.color,
                    fontSize: f.size,
                    background: "#fff8",
                    border: "1px solid #bbb",
                    borderRadius: 5,
                    padding: 2,
                  }}
                />
              ) : (
                f.text
              )}
            </div>
          </Draggable>
        ))}

        {/* Imágenes arrastrables */}
        {images.map((img, i) => (
          <Draggable
            key={img.id}
            bounds="parent"
            position={{ x: img.left, y: img.top }}
            onDrag={(e, data) => handleImgDrag(i, e, data)}
          >
            <div
              style={{
                position: "absolute",
                width: img.size,
                height: img.size,
                cursor: "move"
              }}
              onClick={e => setSelectedField(null)}
            >
              <img
                src={img.src}
                alt="logo"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 10,
                  boxShadow: "0 2px 8px #3333"
                }}
              />
              <button
                onClick={ev => { ev.stopPropagation(); removeImg(i); }}
                style={{
                  position: "absolute",
                  top: -15,
                  right: -10,
                  background: "#fff8",
                  color: "#e00",
                  border: "none",
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  fontWeight: "bold",
                  cursor: "pointer",
                  fontSize: 15
                }}
                title="Eliminar"
              >×</button>
            </div>
          </Draggable>
        ))}
        {/* Puedes añadir aquí QR, decoraciones, etc */}
      </div>
    </div>
  );
}
