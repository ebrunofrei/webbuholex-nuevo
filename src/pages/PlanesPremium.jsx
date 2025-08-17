import React from "react";
import buholexLogo from "../assets/buho-institucional.png"; // o tu logo preferido
import { useAuth } from "../context/AuthContext";

export default function PlanesPremium() {
  const { user, setUsuario } = useAuth();

  // Simula upgrade premium:
  const handleUpgrade = () => {
    // Aquí actualizarías en Firebase y el contexto global
    alert("¡Felicitaciones! Ahora eres user Premium.");
    // setUsuario({ ...user, isPremium: true }); // si usas contexto real
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#fff7f2",
      display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 10px 60px 10px"
    }}>
      <img src={buholexLogo} alt="BúhoLex" style={{ width: 88, marginBottom: 15 }} />
      <h1 style={{
        color: "#b03a1a", fontWeight: 900, fontSize: 36,
        marginBottom: 9, letterSpacing: 0.5, textAlign: "center"
      }}>
        ¡Libera el poder del Derecho con IA!
      </h1>
      <h2 style={{
        color: "#4b2e19", fontWeight: 500, fontSize: 22,
        marginBottom: 33, textAlign: "center", maxWidth: 470
      }}>
        Conviértete en <b>Premium</b> y accede sin límites a todas las herramientas legales, análisis inteligente, biblioteca y funciones Pro.
      </h2>

      {/* Comparativa */}
      <div style={{
        display: "flex", gap: 24, marginBottom: 32,
        flexWrap: "wrap", justifyContent: "center"
      }}>
        {/* Free */}
        <div style={{
          background: "#fff",
          border: "2.5px solid #b03a1a55", borderRadius: 18,
          boxShadow: "0 2px 16px #0001",
          minWidth: 220, padding: "28px 20px", flex: "1 1 230px",
          maxWidth: 330
        }}>
          <h3 style={{ color: "#b03a1a", fontWeight: 800, fontSize: 22, marginBottom: 14 }}>Plan Gratis</h3>
          <ul style={{ color: "#4b2e19", fontSize: 16, paddingLeft: 20 }}>
            <li>Hasta <b>40 mensajes</b> por día</li>
            <li>3 archivos analizados gratis/día</li>
            <li>10 funciones Pro demo/día</li>
            <li>Acceso básico a biblioteca</li>
            <li>1 libro premium como demo</li>
            <li>Respuestas instantáneas del bot</li>
            <li>Visualizador de modelos jurídicos</li>
          </ul>
          <div style={{ marginTop: 18, color: "#b03a1a", fontWeight: 800, fontSize: 16 }}>S/ 0</div>
        </div>
        {/* Premium */}
        <div style={{
          background: "#fff",
          border: "2.5px solid #4b2e19", borderRadius: 18,
          boxShadow: "0 2px 16px #0001",
          minWidth: 220, padding: "28px 20px", flex: "1 1 230px",
          maxWidth: 330, position: "relative"
        }}>
          <div style={{
            position: "absolute", top: -22, right: 12, background: "#b03a1a", color: "#fff",
            borderRadius: 8, fontWeight: 700, fontSize: 15, padding: "6px 14px", letterSpacing: 0.6
          }}>Más Popular</div>
          <h3 style={{ color: "#4b2e19", fontWeight: 900, fontSize: 22, marginBottom: 14 }}>Premium Pro</h3>
          <ul style={{ color: "#4b2e19", fontSize: 16, paddingLeft: 20 }}>
            <li>Interacciones y mensajes <b>ilimitados</b></li>
            <li>Subida y análisis de archivos sin límite</li>
            <li>Todas las funciones Pro sin restricciones</li>
            <li>Grabación y análisis de audiencias en tiempo real</li>
            <li>Traducción y síntesis de voz a cualquier idioma</li>
            <li>Acceso completo a biblioteca jurídica y libros premium</li>
            <li>Generador y asistente de monografías y artículos científicos</li>
            <li>Soporte prioritario</li>
          </ul>
          <div style={{ marginTop: 18, color: "#b03a1a", fontWeight: 800, fontSize: 16 }}>S/ 29.90 /mes*</div>
        </div>
      </div>

      {/* Botón CTA */}
      <button onClick={handleUpgrade}
        style={{
          background: "#b03a1a",
          color: "#fff", fontWeight: 800, fontSize: 21,
          padding: "18px 38px", borderRadius: 15,
          border: "none", cursor: "pointer", marginBottom: 16, boxShadow: "0 2px 12px #0002"
        }}>
        Hazte Premium Ahora
      </button>

      {/* Beneficios extra */}
      <div style={{
        color: "#4b2e19", fontSize: 17, maxWidth: 650, textAlign: "center", marginBottom: 28
      }}>
        <b>¿Por qué BúhoLex?</b><br />
        <ul style={{ textAlign: "left", margin: "12px auto 0 auto", maxWidth: 530 }}>
          <li>Herramienta indispensable para abogados litigantes y estudiantes universitarios.</li>
          <li>Asiste en audiencias, análisis de casos, redacción de escritos y consultas legales complejas.</li>
          <li>Traducción en tiempo real para clientes en cualquier idioma (español, quechua, inglés...)</li>
          <li>Biblioteca actualizada, modelos descargables, recomendaciones doctrinarias y jurisprudencia.</li>
        </ul>
      </div>

      <div style={{
        color: "#b03a1a", fontSize: 14, opacity: 0.75, textAlign: "center", maxWidth: 350
      }}>
        *Precio referencial. Acceso renovable, sin contratos, puedes cancelar en cualquier momento.
      </div>
    </div>
  );
}
