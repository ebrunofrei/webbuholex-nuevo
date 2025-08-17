import React, { useState } from "react";
import { DndContext, useDraggable } from "@dnd-kit/core";
import html2canvas from "html2canvas";
import Select from "react-select";
import { getFirestore, collection, addDoc, getAuth } from "firebase/firestore";
import { app } from "../../../services/firebaseConfig"; // Ajusta el path según tu proyecto

// Fuentes disponibles (puedes agregar más)
const FUENTES = [
  { value: "Roboto", label: "Roboto" },
  { value: "Merriweather", label: "Merriweather" },
  { value: "Lato", label: "Lato" }
];

// Colores y plantillas predefinidas
const PLANTILLAS = [
  {
    nombre: "Dorado/Negro",
    fondo: "linear-gradient(135deg, #fceabb 0%, #f8b500 100%)",
    borde: "#b8860b",
    color: "#333"
  },
  {
    nombre: "Azul/Claro",
    fondo: "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)",
    borde: "#3994e0",
    color: "#12384e"
  }
];

const INICIALES = [
  // Estos objetos definen los campos movibles
  {
    id: "nombre",
    texto: "Eduardo Frei Bruno Gómez",
    x: 100,
    y: 50,
    tipo: "texto",
    fuente: "Merriweather",
    tamano: 28,
    color: "#222",
    negrita: true
  },
  {
    id: "profesion",
    texto: "ABOGADO - MAGISTER",
    x: 110,
    y: 95,
    tipo: "texto",
    fuente: "Roboto",
    tamano: 20,
    color: "#333",
    negrita: true
  },
  {
    id: "especialidad",
    texto: "CONSULTORÍA EN GESTIÓN PÚBLICA - PRIVADA Y DEFENSA JUDICIAL",
    x: 55,
    y: 130,
    tipo: "texto",
    fuente: "Lato",
    tamano: 16,
    color: "#4d4d4d",
    negrita: false
  },
  {
    id: "reg",
    texto: "REG. CAL. 36193",
    x: 210,
    y: 160,
    tipo: "texto",
    fuente: "Roboto",
    tamano: 16,
    color: "#222",
    negrita: false
  },
  {
    id: "direccion",
    texto: "JR. LIMA 575",
    x: 260,
    y: 200,
    tipo: "texto",
    fuente: "Lato",
    tamano: 14,
    color: "#111",
    negrita: false
  },
  {
    id: "cel",
    texto: "Cel.: 951852250",
    x: 55,
    y: 200,
    tipo: "texto",
    fuente: "Lato",
    tamano: 14,
    color: "#111",
    negrita: true
  },
  {
    id: "email",
    texto: "eduperu2003@hotmail.com",
    x: 90,
    y: 230,
    tipo: "texto",
    fuente: "Roboto",
    tamano: 13,
    color: "#1d293f",
    negrita: false
  },
];

// --- DraggableText para cada campo movible -----
function DraggableText({ field, onUpdate, onRemove }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: field.id,
  });
  const style = {
    position: "absolute",
    left: field.x + (transform?.x || 0),
    top: field.y + (transform?.y || 0),
    color: field.color,
    fontWeight: field.negrita ? "bold" : "normal",
    fontFamily: `"${field.fuente}", sans-serif`,
    fontSize: field.tamano,
    cursor: "move",
    background: "rgba(255,255,255,0.01)",
    userSelect: "none",
    zIndex: 10,
    textAlign: "left",
    transition: "box-shadow 0.1s",
    borderRadius: 3
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onRemove(field.id)}
      title="Doble clic para eliminar"
    >
      {field.texto}
    </div>
  );
}

// --- DraggableImage (para logotipo o símbolo) ---
function DraggableImage({ src, id, x, y, w = 60, h = 60, onRemove }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: x + (transform?.x || 0),
        top: y + (transform?.y || 0),
        zIndex: 50,
        cursor: "move"
      }}
      {...listeners}
      {...attributes}
    >
      <img
        src={src}
        alt="Logo"
        style={{
          width: w,
          height: h,
          objectFit: "contain",
          borderRadius: 12,
          border: "2px solid #fff",
          boxShadow: "0 2px 6px #0001",
        }}
      />
      <button
        title="Eliminar"
        onClick={() => onRemove(id)}
        style={{
          position: "absolute",
          top: -15,
          right: -10,
          background: "#e74c3c",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 23,
          height: 23,
          fontSize: 14,
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ---- Selector de fuente, color, tamaño, etc.
function EditPanel({ campo, onChange, onRemove }) {
  return (
    <div className="flex flex-col gap-1 my-2 p-2 border rounded">
      <label>Texto</label>
      <input value={campo.texto} onChange={e => onChange({ ...campo, texto: e.target.value })} />
      <label>Fuente</label>
      <Select
        options={FUENTES}
        value={FUENTES.find(f => f.value === campo.fuente)}
        onChange={opt => onChange({ ...campo, fuente: opt.value })}
        isSearchable={false}
      />
      <label>Tamaño</label>
      <input type="number" min={10} max={50} value={campo.tamano}
        onChange={e => onChange({ ...campo, tamano: +e.target.value })} />
      <label>Color</label>
      <input type="color" value={campo.color} onChange={e => onChange({ ...campo, color: e.target.value })} />
      <label>
        <input type="checkbox" checked={campo.negrita} onChange={e => onChange({ ...campo, negrita: e.target.checked })} /> Negrita
      </label>
      <button onClick={() => onRemove(campo.id)} className="bg-red-500 text-white py-1 rounded">Eliminar campo</button>
    </div>
  );
}

export default function TarjetaInteractiva() {
  const [plantilla, setPlantilla] = useState(PLANTILLAS[0]);
  const [campos, setCampos] = useState(INICIALES);
  const [imagenes, setImagenes] = useState([]);
  const [editando, setEditando] = useState(null);

  // --- DRAG LOGICA
  function handleDragEnd(event) {
    const { active, delta } = event;
    setCampos(campos =>
      campos.map(f =>
        f.id === active.id
          ? { ...f, x: f.x + delta.x, y: f.y + delta.y }
          : f
      )
    );
    setImagenes(imgs =>
      imgs.map(img =>
        img.id === active.id
          ? { ...img, x: img.x + delta.x, y: img.y + delta.y }
          : img
      )
    );
  }

  // ---- LOGO/SIMBOLO UPLOAD
  const handleImagenUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImagenes(prev => [
        ...prev,
        {
          id: "img_" + Date.now(),
          src: ev.target.result,
          x: 25 + prev.length * 60,
          y: 25
        }
      ]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ---- FUNCIONES DE GUARDAR/DESCARGAR ----
  const handleDescargar = async () => {
    const card = document.getElementById("card-canvas");
    if (!card) return;
    const canvas = await html2canvas(card, { backgroundColor: null });
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "tarjeta-buholex.png";
    link.click();
  };

  // --- GUARDAR EN FIREBASE (Firestore)
  const handleGuardarNube = async () => {
    try {
      const db = getFirestore(app);
      const user = getAuth(app).currentUser;
      await addDoc(collection(db, "tarjetas"), {
        userId: user ? user.uid : null,
        plantilla,
        campos,
        imagenes,
        fecha: new Date().toISOString()
      });
      alert("Tarjeta guardada en la nube!");
    } catch (e) {
      alert("Error guardando: " + e.message);
    }
  };

  // --- Añadir campo texto nuevo
  const handleAgregarCampo = () => {
    setCampos(campos => [
      ...campos,
      {
        id: "campo_" + Date.now(),
        texto: "Nuevo texto",
        x: 110,
        y: 110,
        tipo: "texto",
        fuente: "Roboto",
        tamano: 16,
        color: "#222",
        negrita: false
      }
    ]);
  };

  // --- Eliminar campo o imagen
  const handleRemoveCampo = id => setCampos(campos => campos.filter(f => f.id !== id));
  const handleRemoveImg = id => setImagenes(imgs => imgs.filter(img => img.id !== id));

  // --- Editar campo (al hacer click en uno)
  const handleEditCampo = campo => setEditando(campo);

  // --- Cambios desde panel de edición
  const handleChangeCampo = nuevo => {
    setCampos(campos => campos.map(f => (f.id === nuevo.id ? nuevo : f)));
    setEditando(null);
  };

  // --- Cambiar plantilla visual (color/fondo)
  const handlePlantilla = idx => setPlantilla(PLANTILLAS[idx]);

  // --- Renderizado principal ---
  return (
    <div className="flex flex-wrap gap-4">
      <div>
        <div className="mb-2">
          <label className="font-bold text-sm">Plantilla visual:</label>
          {PLANTILLAS.map((p, i) => (
            <button key={i} onClick={() => handlePlantilla(i)}
              className={"rounded px-3 py-1 m-1 border " + (plantilla === p ? "border-yellow-700 bg-yellow-100" : "border-gray-200")}
            >{p.nombre}</button>
          ))}
        </div>
        <div className="mb-2">
          <label className="block">Sube logo o símbolo (máx. 2):</label>
          <input type="file" accept="image/*" onChange={handleImagenUpload} disabled={imagenes.length >= 2} />
        </div>
        <button onClick={handleAgregarCampo} className="bg-blue-600 text-white px-4 py-1 rounded">+ Añadir texto</button>
      </div>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="relative"
          id="card-canvas"
          style={{
            width: 360, height: 220,
            background: plantilla.fondo,
            borderRadius: 18,
            boxShadow: "0 8px 24px #0002",
            border: `4px solid ${plantilla.borde}`,
            margin: "1rem 0"
          }}
        >
          {/* Campos de texto */}
          {campos.map(campo =>
            <DraggableText
              key={campo.id}
              field={campo}
              onUpdate={handleEditCampo}
              onRemove={handleRemoveCampo}
            />
          )}
          {/* Imágenes (logo/símbolos) */}
          {imagenes.map(img =>
            <DraggableImage
              key={img.id}
              {...img}
              onRemove={handleRemoveImg}
            />
          )}
        </div>
      </DndContext>
      {/* Panel de edición */}
      <div className="w-64 ml-3">
        {editando && (
          <EditPanel
            campo={editando}
            onChange={handleChangeCampo}
            onRemove={handleRemoveCampo}
          />
        )}
        <div className="mt-5 flex gap-2">
          <button onClick={handleDescargar} className="bg-green-700 text-white px-4 py-1 rounded">Descargar imagen</button>
          <button onClick={handleGuardarNube} className="bg-orange-600 text-white px-4 py-1 rounded">Guardar en la nube</button>
        </div>
        <div className="text-xs mt-2 text-gray-500">Doble clic en un campo o imagen para eliminar.<br/>Haz clic en un texto para editar fuente/color/tamaño.</div>
      </div>
    </div>
  );
}
