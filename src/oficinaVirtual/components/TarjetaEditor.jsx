import React, { useRef, useState } from "react";
import Moveable from "react-moveable";
import { nanoid } from "nanoid";
import clsx from "classnames";

const FUENTES = [
  { name: "Sans", style: { fontFamily: "sans-serif" } },
  { name: "Serif", style: { fontFamily: "serif" } },
  { name: "Cormorant", style: { fontFamily: "'Cormorant Garamond', serif" } },
  { name: "Montserrat", style: { fontFamily: "'Montserrat', sans-serif" } },
];

const CARD_WIDTH = 340, CARD_HEIGHT = 212;

export default function TarjetaEditor({
  elementos, setElementos,
  fondo="#FFFDE7", borde="#bdaa71"
}) {
  const [selected, setSelected] = useState(null);
  const refs = useRef({});

  // Añadir texto o imagen
  const addTexto = () => setElementos(els => [
    ...els, { id: nanoid(), tipo: "texto", texto: "Nuevo texto", x: 80, y: 90, color: "#222", size: 18, font: 0, fontWeight: 700 }
  ]);
  const addImagen = e => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setElementos(els => [
      ...els, { id: nanoid(), tipo: "img", src: ev.target.result, x: 120, y: 120, w: 60, h: 60 }
    ]);
    reader.readAsDataURL(file);
  };

  // Descarga
  const descargarImagen = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const card = document.getElementById("tarjeta-presentacion-visual");
    const canvas = await html2canvas(card, { backgroundColor: null, scale: 3 });
    const link = document.createElement("a");
    link.href = canvas.toDataURL(); link.download = "tarjeta-buholex.png"; link.click();
  };

  // Actualización drag
  const updateElemento = (id, changes) => setElementos(els => els.map(e => e.id === id ? { ...e, ...changes } : e));
  const removeElemento = id => setElementos(els => els.filter(e => e.id !== id));

  const onDrag = (id, e) => updateElemento(id, { x: e.left, y: e.top });
  const onResize = (id, e) => updateElemento(id, { w: e.width, h: e.height });

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-2 mb-2">
        <button className="px-3 py-1 rounded bg-blue-600 text-white" onClick={addTexto}>+ Texto</button>
        <label className="px-3 py-1 rounded bg-amber-500 text-white cursor-pointer">
          + Imagen
          <input type="file" accept="image/*" onChange={addImagen} className="hidden" />
        </label>
        <button onClick={descargarImagen} className="px-3 py-1 bg-green-700 text-white rounded">Descargar</button>
      </div>
      <div
        id="tarjeta-presentacion-visual"
        style={{
          width: CARD_WIDTH, height: CARD_HEIGHT,
          borderRadius: 18, border: `4px solid ${borde}`,
          background: fondo,
          boxShadow: "0 4px 32px 0 #d2cda3a0",
          position: "relative",
          overflow: "hidden",
        }}
        onClick={() => setSelected(null)}
      >
        {elementos.map((el) => (
          <div
            key={el.id}
            ref={ref => { if (ref) refs.current[el.id] = ref; }}
            data-id={el.id}
            className={clsx(
              "absolute select-none group",
              selected === el.id && "ring-2 ring-blue-400"
            )}
            style={{
              left: el.x, top: el.y,
              width: el.tipo === "img" ? el.w : "auto",
              height: el.tipo === "img" ? el.h : "auto",
              cursor: selected === el.id ? "move" : "pointer",
              ...el.tipo === "texto"
                ? { color: el.color, fontSize: el.size, fontWeight: el.fontWeight, ...FUENTES[el.font]?.style }
                : {},
            }}
            onClick={e => { e.stopPropagation(); setSelected(el.id); }}
            tabIndex={0}
          >
            {el.tipo === "texto" ? (
              <span contentEditable={selected === el.id}
                suppressContentEditableWarning
                onBlur={e => updateElemento(el.id, { texto: e.target.innerText })}>
                {el.texto}
              </span>
            ) : (
              <img src={el.src} alt="" draggable={false}
                style={{ width: el.w, height: el.h, borderRadius: 8, objectFit: "cover" }} />
            )}
            {selected === el.id && (
              <button
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full text-center text-xs shadow hover:bg-red-800"
                style={{ zIndex: 10 }}
                onClick={e => { e.stopPropagation(); removeElemento(el.id); }}
              >×</button>
            )}
          </div>
        ))}
        {selected && (
          <Moveable
            target={refs.current[selected]}
            draggable
            onDrag={({ left, top }) => onDrag(selected, { left, top })}
            resizable={elementos.find(e => e.id === selected)?.tipo === "img"}
            onResize={({ width, height }) => onResize(selected, { width, height })}
            keepRatio={false}
            origin={false}
            edge={false}
            snappable
            throttleDrag={0}
            zoom={1}
            padding={{ left: 0, top: 0, right: 0, bottom: 0 }}
          />
        )}
      </div>
      {selected && (() => {
        const el = elementos.find(e => e.id === selected);
        if (!el || el.tipo !== "texto") return null;
        return (
          <div className="flex gap-2 mt-2 items-center bg-white border border-gray-200 rounded-lg px-3 py-2 shadow">
            <input type="color" value={el.color} onChange={e => updateElemento(el.id, { color: e.target.value })} />
            <select value={el.font} onChange={e => updateElemento(el.id, { font: +e.target.value })}>
              {FUENTES.map((f, i) => <option key={i} value={i}>{f.name}</option>)}
            </select>
            <input type="number" min={8} max={48} value={el.size} onChange={e => updateElemento(el.id, { size: +e.target.value })} className="w-14 border rounded px-1" />
            <select value={el.fontWeight} onChange={e => updateElemento(el.id, { fontWeight: +e.target.value })}>
              <option value={400}>Regular</option>
              <option value={700}>Negrita</option>
            </select>
          </div>
        );
      })()}
    </div>
  );
}
