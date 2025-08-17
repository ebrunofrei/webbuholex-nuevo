// src/oficinaVirtual/components/ConfigurarAlertas.jsx
import { useState, useEffect } from "react";
import { db } from "@/services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import useLegalOSStore from "@/store/useLegalOSStore";

export default function ConfigurarAlertas() {
  const { user } = useAuth();
  const oficinaId = useLegalOSStore((state) => state.oficinaActualId); // ajusta según tu store
  const [config, setConfig] = useState({
    email: "",
    celular: "",
    whatsapp: "",
    telegram: "",
    alertas: {
      expedientes: true,
      resoluciones: true,
      notificaciones: true,
      escritos: false,
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid && oficinaId) {
      setLoading(true);
      getDoc(doc(db, "oficinas", oficinaId, "usuarios", user.uid, "configuracionAlertas"))
        .then(snap => {
          if (snap.exists()) setConfig(snap.data());
        })
        .finally(() => setLoading(false));
    }
  }, [user, oficinaId]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      alertas: { ...prev.alertas, [name]: checked }
    }));
  };

  const guardarConfig = async () => {
    setLoading(true);
    await setDoc(doc(db, "oficinas", oficinaId, "usuarios", user.uid, "configuracionAlertas"), config, { merge: true });
    setLoading(false);
    alert("Configuración de alertas actualizada.");
  };

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow space-y-4">
      <h2 className="text-xl font-bold mb-4">Configura tus alertas externas</h2>
      <label>
        Email de alerta: <input className="input" name="email" value={config.email} onChange={handleInput} />
      </label>
      <label>
        Celular (WhatsApp): <input className="input" name="celular" value={config.celular} onChange={handleInput} />
      </label>
      <label>
        WhatsApp: <input className="input" name="whatsapp" value={config.whatsapp} onChange={handleInput} />
      </label>
      <label>
        Usuario Telegram: <input className="input" name="telegram" value={config.telegram} onChange={handleInput} />
      </label>
      <div className="grid grid-cols-2 gap-4 mt-2">
        {Object.keys(config.alertas).map(tipo => (
          <label key={tipo} className="flex items-center">
            <input
              type="checkbox"
              name={tipo}
              checked={!!config.alertas[tipo]}
              onChange={handleCheckbox}
              className="mr-2"
            />
            Alerta por {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
          </label>
        ))}
      </div>
      <button onClick={guardarConfig} disabled={loading} className="btn bg-orange-700 text-white mt-4">
        {loading ? "Guardando..." : "Guardar configuración"}
      </button>
    </div>
  );
}
