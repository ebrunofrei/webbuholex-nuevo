import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import JurisprudencePage from "@/app/jurisprudencia/page";
import { JurisprudenceAssistedDemo } from "@/components/jurisprudence/jurisprudence-assisted-demo";
import { JurisprudencePublicPage } from "@/components/jurisprudence/jurisprudence-public-page";

vi.mock(
  "@/lib/jurisprudence/local-verified-jurisprudence-public-actions",
  () => ({
    searchLocalVerifiedJurisprudenceAction: async () => ({
      status: "not_configured",
    }),
    getLocalVerifiedJurisprudenceBySlugAction: async () => ({
      status: "not_configured",
    }),
  }),
);

describe("interfaces jurisprudenciales", () => {
  it("informa que el buscador no está habilitado y mantiene el estado dormant", async () => {
    const { container } = render(<JurisprudencePage />);
    expect(screen.getByRole("heading", { name: /^Jurisprudencia$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Problema jurídico/i)).toBeInTheDocument();

    const action = screen.getByRole("button", { name: "BUSCAR" });
    expect(action).not.toBeDisabled();

    fireEvent.click(action);

    expect(await screen.findByText(/búsqueda pública no disponible/i)).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/EXP\.\s*\d|Casación\s+N/i);
  });

  it("presenta exactamente cinco modos y cambia el panel", () => {
    render(<JurisprudenceAssistedDemo />);
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    fireEvent.click(screen.getByRole("tab", { name: "Comparar sentencias" }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("coincidencias, diferencias, evolución");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("CAPACIDAD AVANZADA");
  });

  it("ofrece búsqueda pública sin fabricar resultados", () => {
    const { container } = render(<JurisprudencePublicPage />);
    fireEvent.change(screen.getByLabelText("Problema jurídico"), { target: { value: "valoración de pericia" } });
    expect(screen.getByRole("status")).toHaveTextContent("no existen resoluciones verificadas publicadas");
    expect(container.textContent).not.toMatch(/EXP\.\s*\d|Casación\s+N/i);
    expect(container.querySelector("[download], a[href*='product-assets'], a[href*='iniciar-sesion'] [download]")).toBeNull();
  });

  it("dirige las cuatro acciones avanzadas a inicio de sesión", () => {
    render(<JurisprudencePublicPage />);
    for (const label of ["Analizar una sentencia", "Comparar resoluciones", "Preguntar al Asistente", "Evaluar aplicabilidad"]) expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", "/iniciar-sesion");
  });

  it("hace visibles límites y separa acceso público del avanzado", () => {
    render(<JurisprudencePublicPage />);
    expect(screen.getByText(/no se traslada automáticamente/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "IR A BÚSQUEDA PÚBLICA" })).toHaveAttribute("href", "/jurisprudencia#buscar");
  });
});
