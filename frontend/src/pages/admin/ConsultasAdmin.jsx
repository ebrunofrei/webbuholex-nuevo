import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../../services/firebaseConfig";

export default function ConsultasAdmin() {
  const [consultas, setConsultas] = useState([]);

  useEffect(() => {
    const obtenerConsultas = async () => {
      const ref = query(collection(db, "consultas"), orderBy("fecha", "desc"));
      const snapshot = await getDocs(ref);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha: doc.data().fecha?.toDate()?.toLocaleString() || "Sin fecha",
      }));
      setConsultas(data);
    };
    obtenerConsultas();
  }, []);

  return (
    <section className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Consultas Recibidas - LitisBot</h1>
      <div className="bg-white shadow-md border rounded-lg overflow-hidden">
        {consultas.length === 0 ? (
          <p className="p-4 text-gray-600">No se han registrado consultas aún.</p>
        ) : (
          consultas.map((c) => (
            <div key={c.id} className="p-4 border-b last:border-b-0">
              <p className="text-sm text-gray-500">{c.fecha}</p>
              <p className="font-semibold text-gray-800 mt-1">Pregunta:</p>
              <p className="text-gray-700">{c.pregunta}</p>
              <p className="font-semibold text-gray-800 mt-2">Respuesta:</p>
              <p className="text-gray-700">{c.respuesta}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
