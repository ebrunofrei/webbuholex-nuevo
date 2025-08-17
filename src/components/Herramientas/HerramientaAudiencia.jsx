import React, { useState } from "react";

export default function HerramientaAudiencia() {
  const [nota, setNota] = useState("");
  const [notas, setNotas] = useState([]);
  const TIPS = [
    "Mantén la calma y pide la palabra con respeto.",
    "Presenta objeciones claramente: relevancia, impertinencia, etc.",
    "Anota los plazos y decisiones del juez en tiempo real.",
    "Pide aclaraciones si alguna parte no es precisa.",
    "Alega siempre con fundamento legal y preciso."
  ];

  function guardarNota() {
    if (!nota) return;
    setNotas(n => [...n, nota]);
    setNota("");
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      <div className="font-bold mb-2">Guía rápida para audiencia:</div>
      <ul className="list-disc ml-5 text-sm text-gray-700">
        {TIPS.map(tip => <li key={tip}>{tip}</li>)}
      </ul>
      <textarea className="border rounded p-2 mt-3" rows={2} placeholder="Agrega una nota rápida sobre tu audiencia" value={nota} onChange={e => setNota(e.target.value)} />
      <button className="px-4 py-2 bg-purple-700 text-white rounded" onClick={guardarNota} disabled={!nota}>Guardar nota</button>
      <ul className="mt-2">
        {notas.map((n, idx) => <li key={idx} className="text-sm">📝 {n}</li>)}
      </ul>
    </div>
  );
}
