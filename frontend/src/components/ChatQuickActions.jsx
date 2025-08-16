// ChatQuickActions.jsx o directamente dentro de tu chat

import { SiGoogledrive } from "react-icons/si";

export default function ChatQuickActions({ onGoogleDrive, onUpload, onCommand }) {
  return (
    <div className="flex gap-2 p-2 items-center">
      <button
        onClick={onGoogleDrive}
        title="Importar desde Google Drive"
        className="hover:bg-green-100 rounded-full p-2"
      >
        <SiGoogledrive className="text-2xl text-green-600" />
      </button>
      <button
        onClick={onUpload}
        title="Adjuntar archivo"
        className="hover:bg-gray-200 rounded-full p-2"
      >
        <span className="text-2xl">+</span>
      </button>
      {/* Aquí puedes agregar más botones para comandos rápidos */}
    </div>
  );
}
