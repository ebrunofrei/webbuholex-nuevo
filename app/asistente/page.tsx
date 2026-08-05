import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata("Asistente Jurídico BúhoLex", "Este espacio ofrecerá orientación inicial, ayuda para explorar contenidos y acceso a canales profesionales de BúhoLex.", "/asistente/");

export default function AssistantPage() {
  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#0f172a", color: "#ffffff", paddingBottom: "4rem" }}>
      <section style={{ padding: "4rem 1rem", textAlign: "center" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <p style={{ color: "#94a3b8", fontSize: "0.875rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "1rem" }}>ASISTENCIA Y ORIENTACIÓN</p>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem", lineHeight: 1.2 }}>Asistente Jurídico BúhoLex</h1>
          <p style={{ fontSize: "1.125rem", color: "#cbd5e1", marginBottom: "2rem" }}>
            Este espacio ofrecerá orientación inicial, ayuda para explorar contenidos y acceso a canales profesionales de BúhoLex.
          </p>
          <span style={{ display: "inline-block", backgroundColor: "rgba(255,255,255,0.1)", padding: "0.5rem 1rem", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 500 }}>
            Estado: En preparación
          </span>
        </div>
      </section>

      <section style={{ padding: "0 1rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <article style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.5rem" }}>Aviso importante</p>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>No sustituye evaluación profesional</h2>
            <p style={{ color: "#cbd5e1", fontSize: "0.9375rem", lineHeight: 1.6 }}>Toda información provista por este asistente tendrá carácter orientativo. Las decisiones legales deben sustentarse en asesoramiento humano.</p>
          </article>

          <article style={{ backgroundColor: "rgba(255,255,255,0.05)", padding: "2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
            <p style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.5rem" }}>Estado actual</p>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>Fase de preparación</h2>
            <p style={{ color: "#cbd5e1", fontSize: "0.9375rem", lineHeight: 1.6 }}>Actualmente el asistente no se encuentra operativo y no procesa consultas ni documentos reales de los usuarios.</p>
          </article>
        </div>
      </section>

      <section style={{ padding: "4rem 1rem 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center", backgroundColor: "rgba(255,255,255,0.05)", padding: "3rem 2rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>¿Necesita evaluación para su caso?</h2>
          <p style={{ color: "#cbd5e1", marginBottom: "2rem" }}>Conozca nuestros servicios profesionales sujetos a revisión individual.</p>
          <Link href="/servicios/" style={{ display: "inline-block", backgroundColor: "#ffffff", color: "#0f172a", padding: "0.75rem 1.5rem", borderRadius: "8px", fontWeight: 600, textDecoration: "none" }}>
            Ver servicios disponibles
          </Link>
        </div>
      </section>
    </main>
  );
}
