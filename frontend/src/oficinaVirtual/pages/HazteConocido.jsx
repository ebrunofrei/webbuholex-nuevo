import React, { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";

// FUENTES Y PLANTILLAS
const FUENTES = [
  { name: "Roboto Slab", family: "'Roboto Slab', serif" },
  { name: "Merriweather", family: "'Merriweather', serif" },
  { name: "Montserrat", family: "'Montserrat', sans-serif" },
  { name: "Oswald", family: "'Oswald', sans-serif" },
  { name: "Lato", family: "'Lato', sans-serif" },
  { name: "DM Serif Display", family: "'DM Serif Display', serif" },
];

const COLORES = [
  "#232323", "#fff", "#d6b655", "#15548a", "#14442b", "#a32525", "#6d6d6d", "#6a4d12"
];

const PLANTILLAS = [
  {
    name: "Buffete Dorada",
    bg: "linear-gradient(135deg,#f0e0b4 60%,#d1b163 100%)",
    border: "3px solid #d1b163",
    radius: 26,
    sombra: "0 6px 32px #cba20022",
    logoCorners: 18
  },
  {
    name: "Corporativo Gold",
    bg: "linear-gradient(135deg,#191919 0%, #c8b377 85%)",
    border: "3px solid #ffe08a",
    radius: 22,
    sombra: "0 4px 16px #c1a00022",
    logoCorners: 12
  },
  {
    name: "Clásica Azul",
    bg: "linear-gradient(135deg,#253147 65%,#5b98d4 100%)",
    border: "3px solid #375985",
    radius: 18,
    sombra: "0 6px 26px #21487a55",
    logoCorners: 8
  },
  {
    name: "Abogacía Verde",
    bg: "linear-gradient(120deg,#224534 60%,#73cba2 100%)",
    border: "3px solid #388363",
    radius: 18,
    sombra: "0 6px 26px #187e5735",
    logoCorners: 8
  }
];

// CAMPO PREDETERMINADO PARA CAMPOS DE TEXTO
function campoTexto(txt) {
  return {
    type: "field",
    text: txt || "Nuevo texto",
    font: "Roboto Slab", color: "#232323", fontSize: 18, bold: false, align: "center",
    x: 30 + Math.random() * 90, y: 40 + Math.random() * 80, w: 320, h: 32
  };
}

export default function HazteConocido() {
  // --- ESTADOS
  const [plantillaIdx, setPlantillaIdx] = useState(0);
  const [fondo, setFondo] = useState(COLORES[2]);
  const [fields, setFields] = useState([
    { ...campoTexto("NOMBRE COMPLETO"), x: 42, y: 35, fontSize: 23, bold: true, w: 350, h: 32 },
    { ...campoTexto("ESPECIALIDAD O CARGO"), x: 55, y: 85, fontSize: 18, bold: false, w: 280, h: 30 },
  ]);
  const [logos, setLogos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editIdx, setEditIdx] = useState(null);
  const cardRef = useRef();
  const [titulo, setTitulo] = useState("Crea aquí tu tarjeta de presentación");
  const [nombreTarjeta, setNombreTarjeta] = useState("");
  const [guardadas, setGuardadas] = useState([]);

  // --- CARGA GUARDADO AUTOMÁTICO
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("tarjeta_buholex_v2") || "{}");
    if (saved && saved.fields) {
      setPlantillaIdx(saved.plantillaIdx || 0);
      setFondo(saved.fondo || COLORES[2]);
      setFields(saved.fields || []);
      setLogos(saved.logos || []);
      setTitulo(saved.titulo || "Crea aquí tu tarjeta de presentación");
    }
    setGuardadas(JSON.parse(localStorage.getItem("tarjetas_guardadas") || "[]"));
  }, []);

  // --- GUARDADO AUTOMÁTICO
  useEffect(() => {
    localStorage.setItem("tarjeta_buholex_v2", JSON.stringify({
      plantillaIdx, fondo, fields, logos, titulo
    }));
  }, [plantillaIdx, fondo, fields, logos, titulo]);

  // --- GUARDAR MANUAL (A BIBLIOTECA)
  const guardarTarjeta = () => {
    const nombre = nombreTarjeta.trim() || `Tarjeta ${new Date().toLocaleString()}`;
    const data = { plantillaIdx, fondo, fields, logos, titulo, nombre };
    const actualizadas = [...guardadas.filter(t => t.nombre !== nombre), data];
    setGuardadas(actualizadas);
    localStorage.setItem("tarjetas_guardadas", JSON.stringify(actualizadas));
    setNombreTarjeta("");
    alert("¡Tarjeta guardada!");
  };

  // --- RECUPERAR MANUAL
  const cargarTarjeta = idx => {
    const t = guardadas[idx];
    if (!t) return;
    setPlantillaIdx(t.plantillaIdx);
    setFondo(t.fondo);
    setFields(t.fields);
    setLogos(t.logos || []);
    setTitulo(t.titulo || "Crea aquí tu tarjeta de presentación");
  };

  // --- CAMBIAR FONDO
  const setFondoColor = c => setFondo(c);

  // --- AGREGAR TEXTO / LOGO
  const addField = () => setFields(flds => [...flds, campoTexto()]);
  const addLogo = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogos(lgs =>
      lgs.length < 2 ? [...lgs, { src: ev.target.result, x: 22 + 100 * lgs.length, y: 18, w: 60, h: 60 }] : lgs
    );
    reader.readAsDataURL(file);
  };

  // --- CAMBIO EN CAMPO
  const updateField = (idx, prop, value) => setFields(flds => {
    const n = [...flds];
    n[idx] = { ...n[idx], [prop]: value };
    return n;
  });
  // --- MOVER O REDIMENSIONAR
  const startDrag = (e, tipo, idx) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const obj = tipo === "logo" ? logos[idx] : fields[idx];
    const startObj = { ...obj };
    const move = moveEv => {
      const dx = moveEv.clientX - startX, dy = moveEv.clientY - startY;
      if (tipo === "logo") {
        setLogos(lgs => {
          const n = [...lgs];
          n[idx] = { ...n[idx], x: startObj.x + dx, y: startObj.y + dy };
          return n;
        });
      } else {
        setFields(flds => {
          const n = [...flds];
          n[idx] = { ...n[idx], x: startObj.x + dx, y: startObj.y + dy };
          return n;
        });
      }
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  const startResize = (e, tipo, idx) => {
    e.stopPropagation();
    const startX = e.clientX, startY = e.clientY;
    const obj = tipo === "logo" ? logos[idx] : fields[idx];
    const startObj = { ...obj };
    const move = moveEv => {
      const dx = moveEv.clientX - startX, dy = moveEv.clientY - startY;
      if (tipo === "logo") {
        setLogos(lgs => {
          const n = [...lgs];
          n[idx] = { ...n[idx], w: Math.max(34, startObj.w + dx), h: Math.max(34, startObj.h + dy) };
          return n;
        });
      } else {
        setFields(flds => {
          const n = [...flds];
          n[idx] = { ...n[idx], w: Math.max(60, startObj.w + dx), h: Math.max(22, startObj.h + dy) };
          return n;
        });
      }
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // --- DESCARGAR
  const downloadCard = async () => {
    if (!cardRef.current) return;
    // Oculta bordes y controles antes de capturar
    const el = cardRef.current;
    const prev = el.style.boxShadow;
    el.style.boxShadow = "none";
    await new Promise(res => setTimeout(res, 120));
    html2canvas(el, { backgroundColor: null }).then(canvas => {
      const link = document.createElement("a");
      link.download = "tarjeta-buholex.png";
      link.href = canvas.toDataURL();
      link.click();
      el.style.boxShadow = prev;
    });
  };

  // --- PARÁMETROS DE PLANTILLA
  const plantilla = PLANTILLAS[plantillaIdx];

  return (
    <div style={{ minHeight: "100vh", background: "#fafbfc" }}>
      <div style={{ textAlign: "center", fontWeight: "700", fontSize: 22, marginTop: 28, marginBottom: 12, letterSpacing: 1, color: "#232323" }}>
        {titulo}
      </div>
      <div className="flex flex-wrap gap-8 justify-center items-start mb-10">

        {/* PANEL IZQUIERDO */}
        <div style={{ minWidth: 270, maxWidth: 310 }}>
          <div className="bg-yellow-50 border rounded-xl p-4 mb-3 text-sm shadow-sm">
            <b>Paso a paso:</b><br />
            1. Elige una plantilla premium.<br />
            2. Personaliza colores, fuente, logo y tus datos.<br />
            3. Descarga o guarda tu tarjeta.
          </div>
          <div className="bg-white border rounded-xl p-4 mb-4 shadow-sm">
            <div className="mb-1 font-semibold">Paleta de colores:</div>
            <div className="flex flex-wrap gap-2">
              {COLORES.map((c, i) =>
                <button key={c}
                  className="rounded-full border border-gray-300"
                  style={{
                    width: 29, height: 29, background: c,
                    boxShadow: fondo === c ? "0 0 0 3px #ffc300, 0 1px 6px #0001" : ""
                  }}
                  onClick={() => setFondoColor(c)}
                />)}
              <input type="color" className="ml-2 rounded border" style={{ width: 29, height: 29, padding: 0 }}
                value={fondo}
                onChange={e => setFondoColor(e.target.value)} />
            </div>
          </div>
          <div className="bg-white border rounded-xl p-4 mb-4 shadow-sm">
            <div className="mb-1 font-semibold">Librería de plantillas:</div>
            {PLANTILLAS.map((p, i) =>
              <button
                key={p.name}
                onClick={() => setPlantillaIdx(i)}
                className={`block w-full text-left px-3 py-2 mb-1 rounded-lg font-semibold ${plantillaIdx === i ? "bg-yellow-100 border border-yellow-400 shadow" : "bg-gray-50 border hover:bg-yellow-50"}`}>
                {p.name}
              </button>)}
          </div>
          <div className="bg-white border rounded-xl p-4 shadow-sm mb-2">
            <div className="mb-1 font-semibold">Guardar/Cargar tarjetas:</div>
            <input className="border rounded px-2 py-1 w-full mb-2" placeholder="Nombre de tarjeta"
              value={nombreTarjeta} onChange={e => setNombreTarjeta(e.target.value)} />
            <button className="bg-yellow-400 text-white font-bold px-4 py-2 rounded mr-2" onClick={guardarTarjeta}>Guardar</button>
            {guardadas.length > 0 && (
              <div className="mt-3 text-xs">
                <b>Mis tarjetas:</b>
                {guardadas.map((t, idx) =>
                  <div key={t.nombre} className="flex items-center gap-2 mb-1">
                    <button className="underline text-blue-700" onClick={() => cargarTarjeta(idx)}>{t.nombre}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PANEL TARJETA */}
        <div className="flex flex-col items-center gap-3">

          <div className="flex gap-2 mb-4">
            <label className="bg-yellow-400 font-bold px-4 py-2 rounded cursor-pointer hover:bg-yellow-500">
              + Logo
              <input type="file" accept="image/*" className="hidden" onChange={addLogo} />
            </label>
            <button className="bg-blue-600 text-white font-bold px-4 py-2 rounded hover:bg-blue-700" onClick={addField}>+ Texto</button>
            <button className="bg-green-600 text-white font-bold px-4 py-2 rounded hover:bg-green-700" onClick={downloadCard}>Descargar</button>
          </div>

          {/* Tarjeta */}
          <div
            ref={cardRef}
            style={{
              position: "relative",
              width: 440, height: 260,
              background: plantilla.bg,
              border: plantilla.border,
              borderRadius: plantilla.radius,
              boxShadow: plantilla.sombra,
              overflow: "hidden"
            }}
            onClick={() => setSelected(null)}
          >
            {/* Fondo custom */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: plantilla.radius,
              background: fondo,
              opacity: 0.11,
              pointerEvents: "none"
            }} />
            {/* Logos */}
            {logos.map((logo, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute", left: logo.x, top: logo.y, width: logo.w, height: logo.h,
                  zIndex: 4, cursor: "move", borderRadius: plantilla.logoCorners, boxShadow: "0 2px 6px #0003"
                }}
                onMouseDown={e => { setSelected({ type: "logo", idx }); startDrag(e, "logo", idx); }}
                tabIndex={0}
              >
                <img src={logo.src} alt="logo" style={{
                  width: "100%", height: "100%", objectFit: "contain",
                  borderRadius: plantilla.logoCorners, pointerEvents: "none"
                }} />
                {/* Resize logo */}
                {selected && selected.type === "logo" && selected.idx === idx && (
                  <div
                    onMouseDown={e => startResize(e, "logo", idx)}
                    style={{
                      position: "absolute", right: -9, bottom: -9, width: 18, height: 18,
                      background: "#fffde5", border: "2px solid #ffc300", borderRadius: 8,
                      cursor: "nwse-resize", zIndex: 10, boxShadow: "0 1px 4px #ffc30033"
                    }}
                  />
                )}
                {/* Eliminar logo */}
                {selected && selected.type === "logo" && selected.idx === idx && (
                  <button
                    onClick={e => { setLogos(lgs => lgs.filter((_, i) => i !== idx)); setSelected(null); e.stopPropagation(); }}
                    style={{
                      position: "absolute", top: -13, right: -13, background: "#fff",
                      border: "2px solid #ffc300", color: "#b11a1a", borderRadius: "50%", width: 26, height: 26, zIndex: 12,
                      fontWeight: "bold", fontSize: 19, boxShadow: "0 1px 6px #ffc30022", cursor: "pointer"
                    }}>×</button>
                )}
              </div>
            ))}
            {/* Campos de texto */}
            {fields.map((f, idx) =>
              <div key={idx}
                style={{
                  position: "absolute", left: f.x, top: f.y, width: f.w, minHeight: 24,
                  color: f.color, fontSize: f.fontSize, fontFamily: FUENTES.find(ft => ft.name === f.font)?.family,
                  fontWeight: f.bold ? "bold" : 400, textAlign: f.align, background: selected && selected.type === "field" && selected.idx === idx ? "#fff8" : "transparent",
                  border: selected && selected.type === "field" && selected.idx === idx ? "2px solid #ffc300" : "none", borderRadius: 10, padding: 2,
                  cursor: "move", zIndex: 6, userSelect: "none"
                }}
                onMouseDown={e => { setSelected({ type: "field", idx }); startDrag(e, "field", idx); }}
                tabIndex={0}
                onDoubleClick={() => { setEditIdx(idx); setSelected({ type: "field", idx }); }}
              >
                {/* Edit in place */}
                {editIdx === idx ? (
                  <textarea
                    autoFocus
                    style={{
                      width: "99%", minHeight: 28, resize: "both",
                      fontSize: f.fontSize, fontFamily: FUENTES.find(ft => ft.name === f.font)?.family,
                      fontWeight: f.bold ? "bold" : 400, textAlign: f.align, color: f.color, background: "#fffce7",
                      border: "1.5px solid #ffc300", borderRadius: 6, boxShadow: "0 1px 6px #ffc30033"
                    }}
                    value={f.text}
                    onChange={e => updateField(idx, "text", e.target.value)}
                    onBlur={() => setEditIdx(null)}
                  />
                ) : (
                  <span style={{ whiteSpace: "pre-line", width: "100%", display: "inline-block", pointerEvents: "none" }}>
                    {f.text}
                  </span>
                )}
                {/* Resize box */}
                {selected && selected.type === "field" && selected.idx === idx && (
                  <div
                    onMouseDown={e => startResize(e, "field", idx)}
                    style={{
                      position: "absolute", right: -9, bottom: -9, width: 16, height: 16,
                      background: "#fffde5", border: "2px solid #ffc300", borderRadius: 8,
                      cursor: "nwse-resize", zIndex: 11, boxShadow: "0 1px 4px #ffc30033"
                    }}
                  />
                )}
                {/* Eliminar campo */}
                {selected && selected.type === "field" && selected.idx === idx && (
                  <button
                    onClick={e => { setFields(flds => flds.filter((_, i) => i !== idx)); setSelected(null); e.stopPropagation(); }}
                    style={{
                      position: "absolute", top: -13, right: -13, background: "#fff",
                      border: "2px solid #ffc300", color: "#b11a1a", borderRadius: "50%", width: 23, height: 23, zIndex: 12,
                      fontWeight: "bold", fontSize: 16, boxShadow: "0 1px 6px #ffc30022", cursor: "pointer"
                    }}>×</button>
                )}
              </div>
            )}
          </div>

          {/* Controles de campos */}
          {selected && selected.type === "field" && (
            <div className="flex gap-3 mt-3 items-center flex-wrap">
              <select value={fields[selected.idx].font} onChange={e => updateField(selected.idx, "font", e.target.value)}
                className="px-2 py-1 border rounded">
                {FUENTES.map(f => <option key={f.name}>{f.name}</option>)}
              </select>
              <input type="number" min={12} max={40} value={fields[selected.idx].fontSize}
                onChange={e => updateField(selected.idx, "fontSize", +e.target.value)}
                className="border px-2 py-1 w-16 rounded" />
              <input type="color" value={fields[selected.idx].color}
                onChange={e => updateField(selected.idx, "color", e.target.value)}
                className="border rounded px-1 py-1" />
              <button className={`border px-2 py-1 rounded font-bold ${fields[selected.idx].bold ? "bg-yellow-200" : ""}`}
                onClick={() => updateField(selected.idx, "bold", !fields[selected.idx].bold)}>
                N
              </button>
              <select value={fields[selected.idx].align}
                onChange={e => updateField(selected.idx, "align", e.target.value)}
                className="px-2 py-1 border rounded">
                <option value="left">Izq.</option>
                <option value="center">Centro</option>
                <option value="right">Der.</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

