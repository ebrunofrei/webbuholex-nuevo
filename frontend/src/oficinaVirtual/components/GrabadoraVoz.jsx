import React, { useRef, useState } from "react";

export default function GrabadoraVoz() {
  const [grabando, setGrabando] = useState(false);
  const [urlAudio, setUrlAudio] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startGrabacion = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new window.MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.current.push(e.data);
    };
    mediaRecorder.current.onstop = () => {
      const audioBlob = new Blob(audioChunks.current, { type: "audio/webm" });
      const url = URL.createObjectURL(audioBlob);
      setUrlAudio(url);
    };
    mediaRecorder.current.start();
    setGrabando(true);
  };

  const stopGrabacion = () => {
    mediaRecorder.current?.stop();
    setGrabando(false);
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <button
        onClick={grabando ? stopGrabacion : startGrabacion}
        className={`rounded-full px-5 py-2 text-white font-semibold shadow ${grabando ? "bg-red-600 animate-pulse" : "bg-[#b03a1a]"}`}
      >
        {grabando ? "Detener grabación" : "Grabar voz"}
      </button>
      {urlAudio && (
        <audio src={urlAudio} controls className="mt-2" />
      )}
      {urlAudio && (
        <a
          href={urlAudio}
          download={`grabacion-${Date.now()}.webm`}
          className="text-blue-700 underline text-sm mt-1"
        >
          Descargar audio (.webm)
        </a>
      )}
    </div>
  );
}
