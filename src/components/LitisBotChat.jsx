// src/pages/LitisBotChat.jsx

import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import GooglePicker from "react-google-picker";
import { FaHome, FaFileUpload, FaMicrophone, FaGoogleDrive, FaBroom, FaFilePdf, FaFileWord, FaDownload } from "react-icons/fa";
import jsPDF from "jspdf";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import mammoth from "mammoth";
import buhoLogo from "../assets/litisbot-logo.png";

// -- Tus claves de Google --
const CLIENT_ID = "TU_CLIENT_ID.apps.googleusercontent.com";
const DEVELOPER_KEY = "TU_API_KEY";
const APP_ID = "TU_PROJECT_NUMBER";

// Dummy para grabación/transcripción (integra tu backend real)
const transcribeAudioToText = async (audioBlob) => {
  // Llama a tu backend o API de transcripción real
  return "Transcripción automática simulada de audio.";
};

export default function LitisBotChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: "system", content: "¡Bienvenido a LitisBot! Adjunta archivos, habla o escribe tu pregunta legal." }
  ]);
  const [enviando, setEnviando] = useState(false);
  const [respuestaStreaming, setRespuestaStreaming] = useState("");
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documentoGenerado, setDocumentoGenerado] = useState(null); // { url, tipo }
  const fileInputRef = useRef();
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  // --- Subida y análisis local ---
  async function handleFileChange(e) {
    setError("");
    setUploading(true);
    const file = e.target.files[0];
    if (!file) return setUploading(false);

    try {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = async function () {
          const typedarray = new Uint8Array(this.result);
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            fullText += textContent.items.map(item => item.str).join(" ") + "\n";
          }
          setInput(fullText.slice(0, 3000));
          setUploading(false);
        };
        reader.readAsArrayBuffer(file);
        return;
      }
      if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        const reader = new FileReader();
        reader.onload = async function () {
          const result = await mammoth.extractRawText({ arrayBuffer: reader.result });
          setInput(result.value.slice(0, 3000));
          setUploading(false);
        };
        reader.readAsArrayBuffer(file);
        return;
      }
      if (file.type.startsWith("image/")) {
        setError("OCR sobre imágenes próximamente.");
        setUploading(false);
        return;
      }
      if (file.type.startsWith("audio/")) {
        // Puedes enviar a tu backend o usar Web Speech API
        setError("Transcripción de audio solo disponible en backend.");
        setUploading(false);
        return;
      }
      if (file.type.startsWith("video/")) {
        setError("Transcripción de video estará disponible pronto.");
        setUploading(false);
        return;
      }
      setError("Tipo de archivo no soportado todavía.");
      setUploading(false);
    } catch (err) {
      setError("Ocurrió un error al procesar el archivo.");
      setUploading(false);
    } finally {
      fileInputRef.current.value = "";
    }
  }

  // --- Descargar y analizar archivo desde Google Drive ---
  async function handleDriveFile(file, accessToken) {
    setError("");
    setUploading(true);
    try {
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
      const response = await fetch(downloadUrl, {
        headers: { Authorization: "Bearer " + accessToken }
      });
      const blob = await response.blob();

      if (file.mimeType === "application/pdf") {
        const arrayBuffer = await blob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map(item => item.str).join(" ") + "\n";
        }
        setInput(fullText.slice(0, 3000));
      } else if (file.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        const arrayBuffer = await blob.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInput(result.value.slice(0, 3000));
      } else if (file.mimeType.startsWith("image/")) {
        setError("OCR sobre imágenes próximamente.");
      } else {
        setError("Tipo de archivo de Drive no soportado aún.");
      }
    } catch (err) {
      setError("No se pudo descargar/analizar el archivo de Drive.");
    }
    setUploading(false);
  }

  // --- Envío y respuesta streaming con IA real (OpenAI backend) ---
  async function handleSend(e) {
    e.preventDefault();
    setEnviando(true);
    setError("");
    setRespuestaStreaming("");
    setDocumentoGenerado(null);

    try {
      setMessages(msgs => [...msgs, { role: "user", content: input }]);
      const response = await fetch("/api/litisbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consulta: input }),
      });

      if (!response.body) throw new Error("No hay streaming disponible");

      const reader = response.body.getReader();
      let partial = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder("utf-8").decode(value);
        chunk.split("\n").forEach(line => {
          if (line.startsWith("data: ")) {
            const delta = line.replace("data: ", "").trim();
            if (delta && delta !== "[DONE]") {
              try {
                const content = JSON.parse(delta).choices?.[0]?.delta?.content || "";
                partial += content;
                setRespuestaStreaming(partial);

                // Detecta si parece documento legal para mostrar botón PDF/Word
                if (
                  /DEMANDA|ESCRITO|RESOLUCIÓN|MODELO|CARTA|INFORME|CONTRATO|SOLICITUD/i.test(partial)
                  && partial.length > 80
                ) {
                  setDocumentoGenerado({ texto: partial });
                }
              } catch {}
            }
          }
        });
      }
      setMessages(msgs => [
        ...msgs,
        { role: "assistant", content: partial || "Sin respuesta." }
      ]);
    } catch (err) {
      setError("No se pudo enviar la consulta.");
    }
    setEnviando(false);
    setInput("");
  }

  // --- Google Drive Picker logic ---
  const handleDrivePicker = (data) => {
    if (data && data.docs && data.docs.length > 0) {
      const file = data.docs[0];
      const accessToken = window.gapi && window.gapi.auth && window.gapi.auth.getToken && window.gapi.auth.getToken().access_token;
      if (accessToken) handleDriveFile(file, accessToken);
      else setError("No se pudo obtener token de acceso Google.");
    }
  };

  // --- Descargar chat como PDF ---
  const descargarChatComoPDF = () => {
    const doc = new jsPDF();
    const fullChat = messages
      .map(m => (m.role === "user" ? "Tú: " : m.role === "assistant" ? "LitisBot: " : "") + m.content)
      .join("\n\n");
    doc.text(fullChat, 10, 10);
    doc.save("LitisBot_chat.pdf");
  };

  // --- Descargar documento generado como Word ---
  const descargarDocumentoComoWord = async () => {
    if (!documentoGenerado?.texto) return;
    const blob = new Blob([documentoGenerado.texto], { type: "application/msword" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "documento_litisbot.doc";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- Descargar documento generado como PDF ---
  const descargarDocumentoComoPDF = async () => {
    if (!documentoGenerado?.texto) return;
    const doc = new jsPDF();
    doc.text(documentoGenerado.texto, 10, 10);
    doc.save("documento_litisbot.pdf");
  };

  // --- Copiar respuesta al portapapeles ---
  const handleCopy = (texto) => {
    navigator.clipboard.writeText(texto);
    setError("Respuesta copiada al portapapeles ✔");
    setTimeout(() => setError(""), 1500);
  };

  // --- Grabación de voz demo (estructura) ---
  const startRecording = () => {
    setError("");
    setIsRecording(true);
    audioChunks.current = [];
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaRecorder.current = new window.MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = e => {
        audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: "audio/wav" });
        const text = await transcribeAudioToText(audioBlob);
        setInput(text);
        setIsRecording(false);
      };
      mediaRecorder.current.start();
    }).catch(() => {
      setError("No se pudo acceder al micrófono.");
      setIsRecording(false);
    });
  };

  const stopRecording = () => {
    mediaRecorder.current && mediaRecorder.current.state === "recording" && mediaRecorder.current.stop();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#b03a1a]/40 via-white to-[#b03a1a]/40 px-2 py-10">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 flex flex-col items-center">
        {/* HEADER: Logo, Volver y Botón limpiar */}
        <div className="flex items-center gap-4 mb-2 w-full">
          <Link to="/">
            <img src={buhoLogo} alt="LitisBot" className="w-16 h-16 rounded-full border-4 border-blue-200 shadow" />
          </Link>
          <span className="font-black text-3xl text-[#b03a1a]">LitisBot</span>
          <span className="flex-1" />
          <button
            className="bg-gray-200 hover:bg-red-200 text-[#a52e00] px-2 py-2 rounded-full mx-2"
            title="Limpiar chat"
            onClick={() => {
              setMessages([
                { role: "system", content: "¡Bienvenido a LitisBot! Adjunta archivos, habla o escribe tu pregunta legal." }
              ]);
              setRespuestaStreaming("");
              setInput("");
              setError("");
              setDocumentoGenerado(null);
            }}
          >
            <FaBroom size={22} />
          </button>
          <Link
            to="/"
            className="bg-[#b03a1a] text-white flex items-center gap-2 px-3 py-2 rounded-full font-bold shadow hover:bg-[#942813] transition text-base"
          >
            <FaHome /> Inicio
          </Link>
        </div>

        <div className="text-center text-[#444] text-lg font-semibold mb-4">
          Tu chat legal inteligente
        </div>

        {/* CHAT */}
        <div className="bg-gray-50 w-full rounded-xl min-h-[240px] max-h-[300px] overflow-y-auto p-4 shadow mb-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-right" : "text-left"}
            >
              <span
                className={`block px-3 py-2 rounded-xl my-1 select-all cursor-pointer ${m.role === "user" ? "bg-[#b03a1a]/10 text-[#b03a1a]" : "bg-blue-50 text-blue-900"}`}
                title="Haz clic para copiar la respuesta"
                onClick={m.role === "assistant" ? () => handleCopy(m.content) : undefined}
              >
                {m.content}
                {m.role === "assistant" && <FaDownload className="inline ml-2 opacity-50" />}
              </span>
            </div>
          ))}
          {/* Muestra respuesta en vivo */}
          {respuestaStreaming && (
            <div className="text-left">
              <span
                className="block px-3 py-2 rounded-xl my-1 bg-blue-50 text-blue-900 animate-pulse select-all cursor-pointer"
                title="Haz clic para copiar"
                onClick={() => handleCopy(respuestaStreaming)}
              >
                {respuestaStreaming}
              </span>
            </div>
          )}
        </div>

        {/* BOTONES DE DESCARGA SI HAY DOCUMENTO GENERADO */}
        {documentoGenerado && (
          <div className="flex gap-3 items-center mb-3">
            <a
              href="#"
              onClick={descargarDocumentoComoPDF}
              className="text-xs text-[#a52e00] flex items-center gap-1 underline"
              title="Descargar documento en PDF"
            >
              <FaFilePdf /> Descargar PDF
            </a>
            <a
              href="#"
              onClick={descargarDocumentoComoWord}
              className="text-xs text-blue-700 flex items-center gap-1 underline"
              title="Descargar documento en Word"
            >
              <FaFileWord /> Descargar Word
            </a>
          </div>
        )}

        {/* Entrada, botones y adjuntos */}
        <form className="flex w-full gap-2" onSubmit={handleSend}>
          {/* Input de texto */}
          <input
            className="flex-1 rounded-l-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            type="text"
            placeholder="Escribe o pega tu pregunta legal aquí…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={enviando || uploading}
          />

          {/* Botón: Adjuntar archivo local */}
          <label className="flex items-center cursor-pointer bg-gray-200 rounded-full px-2 py-2 hover:bg-gray-300 mx-1" title="Subir archivo">
            <FaFileUpload className="text-lg text-[#b03a1a]" />
            <input
              type="file"
              accept=".pdf,.docx,image/*,audio/*,video/*"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={enviando || uploading}
            />
          </label>

          {/* Botón: Google Drive */}
          <GooglePicker
            clientId={CLIENT_ID}
            developerKey={DEVELOPER_KEY}
            scope={['https://www.googleapis.com/auth/drive.readonly']}
            onChange={handleDrivePicker}
            multiselect={false}
            navHidden={true}
            authImmediate={false}
            viewId={'DOCS'}
            appId={APP_ID}
          >
            <button type="button" className="bg-green-100 px-2 py-2 rounded-full shadow text-green-800 hover:bg-green-200 flex items-center gap-1 mx-1" title="Importar desde Google Drive">
              <FaGoogleDrive className="text-lg" />
            </button>
          </GooglePicker>

          {/* Botón: grabar voz */}
          <button
            type="button"
            title={isRecording ? "Detener grabación" : "Grabar voz"}
            className={`bg-blue-50 rounded-full px-2 py-2 shadow border ${isRecording ? "border-red-500" : "border-blue-200"} mx-1`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={enviando}
          >
            <FaMicrophone className={isRecording ? "text-red-600 animate-pulse" : "text-blue-700"} />
          </button>

          {/* Botón: enviar */}
          <button
            className="bg-[#b03a1a] text-white px-4 py-2 rounded-r-xl font-bold shadow hover:bg-[#942813] transition flex items-center justify-center"
            type="submit"
            disabled={enviando || !input.trim() || uploading}
            title="Enviar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.96 19.01L20.03 12 3.96 4.99a1.17 1.17 0 00-1.46 1.47l2.05 6.14a.93.93 0 010 .8l-2.05 6.14a1.17 1.17 0 001.46 1.47z" />
            </svg>
          </button>
        </form>

        {/* BOTÓN DESCARGAR CHAT COMO PDF */}
        <button
          className="flex items-center gap-2 mt-3 text-xs text-green-900 underline"
          onClick={descargarChatComoPDF}
        >
          <FaFilePdf /> Descargar chat completo en PDF
        </button>

        <div className="w-full text-xs text-gray-500 text-center mt-1">
          {uploading ? "Procesando archivo..." : "Soporta PDF, Word, imágenes, audio, video y Google Drive. Haz clic en las respuestas para copiar. Descarga documentos legales generados. Respuesta IA en vivo."}
        </div>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-700 text-red-700 px-3 py-2 rounded mt-3 w-full text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
