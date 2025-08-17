import React, { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Perfil() {
  const { user, setUsuario } = useAuth();
  const [nombre, setNombre] = useState(user?.displayName || "");
  const [foto, setFoto] = useState(user?.photoURL || "");
  const [preview, setPreview] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef();

  // Previsualización instantánea al elegir archivo
  const handleFileChange = e => {
    if (e.target.files && e.target.files[0]) {
      setPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Subir avatar a Firebase Storage y actualizar perfil
  const handleGuardar = async e => {
    e.preventDefault();
    setMsg(""); setError(""); setLoading(true);
    let photoURL = foto;

    try {
      // Si hay nueva foto seleccionada
      if (fileInputRef.current.files[0]) {
        const archivo = fileInputRef.current.files[0];
        if (!archivo.type.startsWith("image/")) throw new Error("Solo imágenes válidas");
        const storage = getStorage();
        const ruta = `avatars/${user.uid}/${archivo.name}`;
        const storageRef = ref(storage, ruta);
        await uploadBytes(storageRef, archivo);
        photoURL = await getDownloadURL(storageRef);
      }
      // Actualizar Firebase Auth
      await updateProfile(user, {
        displayName: nombre,
        photoURL,
      });
      // Actualizar estado global (AuthContext debe escuchar cambios)
      setUsuario({
        ...user,
        displayName: nombre,
        photoURL,
      });
      setFoto(photoURL);
      setMsg("Perfil actualizado correctamente.");
      setPreview(null);
    } catch (err) {
      setError(err.message || "No se pudo actualizar el perfil.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-[#b03a1a] mb-5">Editar Perfil</h2>
      <form onSubmit={handleGuardar} className="flex flex-col gap-5">
        {/* Imagen de perfil */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <img
              src={preview || foto || "/avatar-placeholder.png"}
              alt="Avatar"
              className="w-28 h-28 rounded-full border-4 border-[#b03a1a] object-cover shadow"
            />
            <button
              type="button"
              className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow hover:bg-[#f6e6e6]"
              onClick={() => fileInputRef.current.click()}
              aria-label="Cambiar avatar"
            >
              <span className="material-icons text-[#b03a1a] text-xl">photo_camera</span>
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <span className="text-sm text-gray-500">
            Imágenes permitidas: JPG, PNG, hasta 2MB.
          </span>
        </div>
        {/* Editar nombre */}
        <div>
          <label className="block mb-1 font-medium text-[#b03a1a]">Nombre completo</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            minLength={3}
            maxLength={40}
            className="w-full border px-3 py-2 rounded"
            placeholder="Tu nombre"
          />
        </div>
        {/* Correo (no editable aquí, solo mostrar) */}
        <div>
          <label className="block mb-1 font-medium text-[#b03a1a]">Correo</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full border px-3 py-2 rounded bg-gray-100 text-gray-400"
          />
        </div>
        {/* Mensaje feedback */}
        {msg && <div className="text-green-700 font-semibold">{msg}</div>}
        {error && <div className="text-red-700 font-semibold">{error}</div>}
        {/* Botón guardar */}
        <button
          type="submit"
          className="bg-[#b03a1a] text-white rounded-xl py-2 font-bold mt-2 transition hover:bg-[#a52e00]"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </form>
    </div>
  );
}
