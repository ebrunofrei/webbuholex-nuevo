import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/services/firebaseConfig"; // Ajusta la ruta
import PageContainer from "@/components/PageContainer";

export default function JurisprudenciaVisor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jurisprudencias, setJurisprudencias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJurisprudencias = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "jurisprudencia"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJurisprudencias(data);
      } catch (error) {
        console.error("Error cargando jurisprudencia:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchJurisprudencias();
  }, []);

  if (loading) {
    return (
      <section className="max-w-3xl mx-auto py-20 text-center">
        <div className="text-lg text-gray-500">Cargando jurisprudencia...</div>
      </section>
    );
  }

  const idx = jurisprudencias.findIndex(j => String(j.id) === String(id));
  const actual = jurisprudencias[idx];

  if (!actual) {
    return (
      <section className="max-w-3xl mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold mb-2">404 - Jurisprudencia no encontrada</h1>
        <button onClick={() => navigate("/jurisprudencia")} className="bg-blue-600 text-white px-4 py-2 rounded">Volver</button>
      </section>
    );
  }

  const goPrev = () => idx > 0 && navigate(`/jurisprudencia/${jurisprudencias[idx - 1].id}`);
  const goNext = () => idx < jurisprudencias.length - 1 && navigate(`/jurisprudencia/${jurisprudencias[idx + 1].id}`);

  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-6 text-center text-buholex-brown">
        Jurisprudencia
      </h1>
      <div className="space-y-6">
        <div className="p-5 bg-white rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-1">Casación N° 1234-2022</h2>
          <p className="text-buholex-brown">
            La Corte Suprema determinó que la posesión continua, pacífica y pública es indispensable para la prescripción adquisitiva de dominio.
          </p>
        </div>
        <div className="p-5 bg-white rounded-2xl shadow-md">
          <h2 className="text-lg font-semibold mb-1">Casación N° 5678-2024</h2>
          <p className="text-buholex-brown">
            El Tribunal Constitucional precisó los alcances del debido proceso en los procedimientos administrativos sancionadores.
          </p>
        </div>
        {/* Agrega aquí más bloques, tablas o tarjetas según tu base de datos */}
      </div>
    </PageContainer>
  );
}
