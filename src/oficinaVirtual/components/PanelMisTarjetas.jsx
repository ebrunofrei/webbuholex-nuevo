import React, { useEffect, useState } from "react";
import { guardarTarjetaFirestore, getTarjetasUsuario, eliminarTarjeta } from "./firebaseTarjetas";
import { useAuth } from "../../context/AuthContext";
import TarjetaPresentacionPro from "./TarjetaPresentacionPro";

export default function PanelMisTarjetas() {
  const { user } = useAuth?.() || {};
  const [tarjetas, setTarjetas] = useState([]);
  const [loading, setLoading] = useState(false);

  // Carga todas las tarjetas al cargar el panel
  useEffect(() => {
    if (user?.uid) {
      setLoading(true);
      getTarjetasUsuario(user).then(arr => {
        setTarjetas(arr);
        setLoading(false);
      });
    }
  }, [user]);

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta tarjeta?")) return;
    await eliminarTarjeta(user, id);
    setTarjetas(tarjetas.filter(t => t.id !== id));
  };

  if (!user) return <div className="text-center py-10">Inicia sesión para ver tus tarjetas.</div>;

  if (loading) return <div className="py-10 text-center">Cargando tarjetas...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3 text-[#b4913e]">Mis tarjetas personalizadas</h2>
      {tarjetas.length === 0 && <div className="text-gray-400">Aún no tienes tarjetas guardadas.</div>}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {tarjetas.map(tarjeta =>
          <div key={tarjeta.id} className="relative group">
            <TarjetaPresentacionPro {...tarjeta} soloVista={true} />
            <button
              onClick={() => handleEliminar(tarjeta.id)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-80 hover:opacity-100"
              title="Eliminar tarjeta"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
