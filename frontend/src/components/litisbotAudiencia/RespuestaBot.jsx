import React, { useState } from "react";
import { useAudiencia } from "./useAudienciaContext";

export default function RespuestaBot({ msg }) {
  const { feedbackMensaje, guardarFavorito } = useAudiencia();
  const [feedback, setFeedback] = useState(msg.utilFeedback);
  const [fav, setFav] = useState(msg.favorito);

  const handleFeedback = (val) => {
    setFeedback(val);
    feedbackMensaje(msg.id, val);
  };

  const handleFav = () => {
    setFav(!fav);
    guardarFavorito(msg.id, !fav);
  };

  return (
    <div className="my-2 p-2 rounded bg-gray-100">
      <div className="font-semibold text-[#b03a1a]">LitisBot:</div>
      <div>{msg.respuestaBot}</div>
      <div className="mt-1 flex gap-2 text-xs">
        <button onClick={handleFav} className={fav ? "text-yellow-600" : ""}>⭐</button>
        <button onClick={() => handleFeedback(true)} className={feedback === true ? "text-green-600" : ""}>👍</button>
        <button onClick={() => handleFeedback(false)} className={feedback === false ? "text-red-600" : ""}>👎</button>
      </div>
    </div>
  );
}
