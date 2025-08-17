import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin, useGoogleLogin } from "@react-oauth/google";
import GooglePicker from "react-google-picker";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon, EyeIcon, TrashIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

// Reemplaza por tu CLIENT_ID de Google OAuth
const GOOGLE_CLIENT_ID = "863424580261-ds0rstgjamqvvimes33qou1dfth5k9dc.apps.googleusercontent.com";

const fileIcons = {
  pdf: <span className="text-red-600">📄</span>,
  doc: <span className="text-blue-700">📄</span>,
  docx: <span className="text-blue-700">📄</span>,
  xls: <span className="text-green-700">📊</span>,
  xlsx: <span className="text-green-700">📊</span>,
  jpg: <span className="text-yellow-700">🖼️</span>,
  png: <span className="text-yellow-700">🖼️</span>,
  default: <span className="text-gray-500">📁</span>,
};

// Utilidad simple para iconos según tipo
const getFileIcon = (name) => {
  const ext = name.split(".").pop().toLowerCase();
  return fileIcons[ext] || fileIcons["default"];
};

export default function BibliotecaDrive() {
  const [googleToken, setGoogleToken] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filePreview, setFilePreview] = useState(null);

  // Inicio de sesión con Google (OAuth)
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      setGoogleToken(tokenResponse.access_token);
      listarArchivos(tokenResponse.access_token);
    },
    onError: () => alert("Error al iniciar sesión con Google"),
    scope: "https://www.googleapis.com/auth/drive",
  });

  // Llamada a la API de Drive para listar archivos de la carpeta 'Buholex'
  const listarArchivos = async (token) => {
    try {
      // Busca carpeta "Buholex" o crea si no existe
      let carpetaId = "";
      const searchFolder = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='Buholex' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const folderRes = await searchFolder.json();
      if (folderRes.files.length > 0) {
        carpetaId = folderRes.files[0].id;
      } else {
        // Crear carpeta si no existe
        const createFolder = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "Buholex",
            mimeType: "application/vnd.google-apps.folder",
          }),
        });
        const newFolder = await createFolder.json();
        carpetaId = newFolder.id;
      }

      // Listar archivos dentro de la carpeta
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${carpetaId}'+in+parents and trashed=false&fields=files(id,name,mimeType,webViewLink,webContentLink,iconLink,createdTime,modifiedTime)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      setArchivos(data.files || []);
    } catch (e) {
      alert("Error al listar archivos: " + e.message);
    }
  };

  // Subida de archivos a la carpeta Buholex
  const handleSubirArchivo = async (e) => {
    const file = e.target.files[0];
    if (!file || !googleToken) return;
    try {
      // Busca ID carpeta Buholex
      let carpetaId = "";
      const searchFolder = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=name='Buholex' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        { headers: { Authorization: `Bearer ${googleToken}` } }
      );
      const folderRes = await searchFolder.json();
      if (folderRes.files.length > 0) {
        carpetaId = folderRes.files[0].id;
      }

      // Subir archivo
      const metadata = {
        name: file.name,
        parents: [carpetaId],
      };
      const form = new FormData();
      form.append(
        "metadata",
        new Blob([JSON.stringify(metadata)], { type: "application/json" })
      );
      form.append("file", file);

      await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${googleToken}` },
          body: form,
        }
      );
      alert("Archivo subido con éxito");
      listarArchivos(googleToken);
    } catch (e) {
      alert("Error al subir archivo: " + e.message);
    }
  };

  // Filtrado en vivo
  const archivosFiltrados = archivos.filter((a) =>
    a.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Biblioteca Jurídica / Documentos</h2>
        {!googleToken ? (
          <button
            onClick={() => login()}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-800 mb-4"
          >
            Acceder con Google Drive
          </button>
        ) : (
          <div className="mb-4 flex items-center justify-between">
            <input
              type="text"
              placeholder="Buscar archivo por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full max-w-xs"
            />
            <label className="ml-4 flex items-center bg-green-600 text-white px-3 py-2 rounded-lg cursor-pointer hover:bg-green-700">
              <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
              Subir archivo
              <input
                type="file"
                onChange={handleSubirArchivo}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
              />
            </label>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {archivosFiltrados.length === 0 && googleToken && (
            <div className="col-span-3 text-center text-gray-500">
              No hay archivos aún en la biblioteca.
            </div>
          )}
          {archivosFiltrados.map((file) => (
            <motion.div
              key={file.id}
              whileHover={{ scale: 1.04 }}
              className="bg-white border shadow-xl rounded-xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                {getFileIcon(file.name)}
                <span className="font-semibold text-sm truncate">{file.name}</span>
              </div>
              <span className="text-xs text-gray-400">
                Modificado: {new Date(file.modifiedTime).toLocaleString()}
              </span>
              <div className="flex gap-2 mt-2">
                <button
                  className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                  onClick={() => setFilePreview(file)}
                >
                  <EyeIcon className="h-4 w-4 inline mr-1" />
                  Ver
                </button>
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-4 w-4 inline mr-1" />
                  Descargar
                </a>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Modal para previsualizar PDF, Word, etc */}
        {filePreview && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-2xl relative">
              <button
                className="absolute top-3 right-3 text-xl text-gray-700 hover:text-red-500"
                onClick={() => setFilePreview(null)}
              >
                ×
              </button>
              <iframe
                src={filePreview.webViewLink}
                title={filePreview.name}
                className="w-full h-[500px] rounded-lg border"
                allowFullScreen
              />
              <div className="mt-2 text-center text-sm text-gray-500">
                Vista previa de: <b>{filePreview.name}</b>
              </div>
            </div>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
