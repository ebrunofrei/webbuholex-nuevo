import { useAuth } from "@/context/AuthContext";
import ConfigurarAlertas from "@/oficinaVirtual/components/ConfigurarAlertas";
import { useEffect, useState } from "react";
import { db } from "@/services/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export default function Perfil() {
  const { user } = useAuth();
  const [alertConfig, setAlertConfig] = useState(null);
  const [codigoAcceso, setCodigoAcceso] = useState("");

  useEffect(() => {
    async function fetchAlertConfig() {
      if (!user?.uid) return;
      const ref = doc(db, "oficinas", user.uid, "usuarios", user.uid, "configuracionAlertas");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setAlertConfig(snap.data());
        if (snap.data().codigoAcceso) setCodigoAcceso(snap.data().codigoAcceso);
      }
    }
    fetchAlertConfig();
  }, [user]);

  if (!user) return <div className="p-8">Cargando perfil...</div>;

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">👤 Perfil de usuario</h2>
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <div><b>Nombre:</b> {user.displayName || "No registrado"}</div>
        <div><b>Email:</b> {user.email}</div>
        <div><b>UID:</b> {user.uid}</div>
        {alertConfig?.dni && <div><b>DNI:</b> {alertConfig.dni}</div>}
        {alertConfig?.rol && <div><b>Rol:</b> {alertConfig.rol}</div>}
        {/* Puedes mostrar otros datos personalizados aquí */}
        {codigoAcceso && (
          <div className="mt-4">
            <b>Enlace para recibir notificaciones externas:</b>
            <div className="bg-yellow-50 p-2 rounded break-all text-sm">
              <span className="font-mono">
                {`${window.location.origin}/notificar/${codigoAcceso}`}
              </span>
              <div className="text-xs text-gray-500">
                Proporcione este enlace a entidades judiciales/administrativas para recibir notificaciones directas en su casilla virtual.
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="my-8">
        <ConfigurarAlertas />
      </div>
      <div className="mt-6 text-gray-500 text-sm">Pronto: cambio de clave, foto, preferencias y logout.</div>
    </div>
  );
}
