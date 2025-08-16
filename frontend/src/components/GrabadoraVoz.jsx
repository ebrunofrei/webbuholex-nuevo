import React, { useRef, useState } from "react";

export default function GrabadoraVoz() {
  const [grabando, setGrabando] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [chunks, setChunks] = useState([]);
  const mediaRecorderRef = useRef(null);

  const iniciarGrabacion = async () => {
    setAudioURL(null);
    setChunks([]);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream, { mimeType: "audio/webm" }); // "audio/webm" es ampliamente soportado
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) setChunks((prev) => [...prev, e.data]);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        // Si necesitas MP3 puedes usar servicios online o convertir en backend,
        // pero para WhatsApp, Telegram y web, "webm" es compatible y liviano.
      };

      mediaRecorder.start();
      setGrabando(true);
    } catch (e) {
      alert("No se pudo acceder al micrófono");
    }
  };

  const detenerGrabacion = () => {
    mediaRecorderRef.current?.stop();
    setGrabando(false);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow flex flex-col items-center gap-4">
      <h2 className="font-bold text-[#b03a1a] text-lg">Grabadora de voz</h2>
      <div className="flex gap-3">
        {!grabando ? (
          <button
            className="bg-[#a52e00] text-white px-4 py-2 rounded-full shadow hover:bg-[#b03a1a] font-bold"
            onClick={iniciarGrabacion}
          >🎤 Iniciar grabación</button>
        ) : (
          <button
            className="bg-red-600 text-white px-4 py-2 rounded-full shadow font-bold animate-pulse"
            onClick={detenerGrabacion}
          >⏹️ Detener</button>
        )}
      </div>
      {audioURL && (
        <div className="flex flex-col items-center gap-2 mt-4">
          <audio src={audioURL} controls className="w-full" />
          <a
            href={audioURL}
            download={`Grabacion-BuhoLex-${Date.now()}.webm`}
            className="bg-[#a52e00] text-white px-4 py-1 rounded-full font-semibold shadow hover:bg-[#b03a1a]"
          >⬇️ Descargar (.webm)</a>
          {/* Puedes compartir el archivo arrastrando o usando el sistema de archivos del móvil */}
        </div>
      )}
      <div className="text-xs text-gray-500 mt-2">
        Puedes compartir el archivo por WhatsApp, Telegram, correo, Google Drive, etc.  
        <br />
        <b>Tip:</b> WhatsApp Web acepta el archivo .webm sin problemas.  
        Si necesitas .mp3, puedes convertirlo online o en el backend (consulta si deseas un snippet de conversión backend).
      </div>
    </div>
  );
}
