import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administración | BúhoLex",
};

export default function AdminIndexPage() {
  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem", color: "#111827" }}>
        Panel de Administración
      </h1>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
        Módulos internos de operación y soporte de BúhoLex.
      </p>
    </div>
  );
}
