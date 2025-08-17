// src/components/LitisBotLegal.jsx
import LitisBotChatBase from "./LitisBotChatBase";
export default function LitisBotLegal({ user, expedienteId }) {
  // Aquí puedes pasar fuentes, permisos, funciones especiales, etc.
  return (
    <LitisBotChatBase
      modo="legal"
      user={user}
      expedienteId={expedienteId}
      fuentesOficiales={[
        "https://busquedas.elperuano.pe/normaslegales",
        "https://www.pj.gob.pe",
        // Agrega más fuentes
      ]}
      // onAnalizarArchivo, etc...
    />
  );
}
