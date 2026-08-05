import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import JurisprudencePage from "@/app/jurisprudencia/page";
import JurisprudenceDetailPage from "@/app/jurisprudencia/[slug]/page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>
}));

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

// Simulamos replaceState para que el componente JurisprudencePublicSearch no falle al intentarlo.
beforeEach(() => {
  vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
});

describe("Phase 13.A.3: Jurisprudence Public Assembly", () => {
  it("renders the dormant public interface securely without configured gateway", async () => {
    render(<JurisprudencePage />);

    // La interfaz muestra el título público real de jurisprudencia
    expect(screen.getByRole("heading", { name: "Jurisprudencia" })).toBeInTheDocument();

    // Esperar a que pase el loading inicial
    const statusContainer = await screen.findByText("Búsqueda pública no disponible");
    expect(statusContainer.closest("div")).toBeInTheDocument();
    expect(statusContainer.closest("div")).toHaveTextContent("El buscador jurisprudencial todavía no se encuentra habilitado para consultas públicas");

    const searchButton = screen.getByRole("button", { name: "BUSCAR" });
    fireEvent.click(searchButton);

    // Se muestra el estado honesto “Búsqueda pública no disponible”
    expect(await screen.findByText("Búsqueda pública no disponible")).toBeInTheDocument();

    // No aparecen resoluciones ficticias, ni expedientes, ni citas inventadas.
    // Confirmamos que no se renderizan artículos de resultados
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("remains safe and inactive even if the user attempts to search", async () => {
    render(<JurisprudencePage />);

    // Esperar a que pase el loading inicial
    expect(await screen.findByText("Búsqueda pública no disponible")).toBeInTheDocument();

    const searchButton = screen.getByRole("button", { name: "BUSCAR" });

    // Validamos el estado del botón (ya no debe estar disabled tras cargar)
    expect(searchButton).not.toBeDisabled();
    expect(searchButton).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.click(searchButton);

    // El estado no_configured debe persistir en pantalla tras click
    expect(await screen.findByText("Búsqueda pública no disponible")).toBeInTheDocument();

    // Validamos que la URL no fue alterada (ahora validamos que se llama correctamente)
    expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "/jurisprudencia");

    // Validamos que sigue sin haber resultados en la interfaz
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("handles mode switching correctly between Search and Owl Analysis", async () => {
    render(<JurisprudencePage />);

    // Esperar a que pase el loading inicial de búsqueda
    expect(await screen.findByText("Búsqueda pública no disponible")).toBeInTheDocument();

    // Por defecto, Buscar Resoluciones está seleccionado
    const btnSearchMode = screen.getByRole("button", { name: /BUSCAR RESOLUCIONES/i });
    expect(btnSearchMode).toHaveAttribute("aria-pressed", "true");

    // Y el catálogo (botón de buscar dentro del catálogo) está visible
    expect(screen.getByRole("button", { name: "BUSCAR" })).toBeInTheDocument();

    // TEMAS MÁS CONSULTADOS está deshabilitado
    const btnTrendsMode = screen.getByRole("button", { name: /TEMAS MÁS CONSULTADOS/i });
    expect(btnTrendsMode).toHaveAttribute("aria-disabled", "true");

    // BÚHO ANALÍTICO cambia a la entrada owl
    const btnAnalysisMode = screen.getByRole("button", { name: /BÚHO ANALÍTICO/i });
    expect(btnAnalysisMode).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(btnAnalysisMode);

    expect(btnAnalysisMode).toHaveAttribute("aria-pressed", "true");
    expect(btnSearchMode).toHaveAttribute("aria-pressed", "false");

    // Verifica que el componente Owl se renderizó (p. ej. título)
    expect(screen.getByRole("heading", { name: "Búho Analítico" })).toBeInTheDocument();

    // Y el catálogo original ya no está
    expect(screen.queryByRole("button", { name: "BUSCAR" })).not.toBeInTheDocument();

    // Al regresar, el buscador vuelve a mostrarse
    fireEvent.click(btnSearchMode);
    expect(btnSearchMode).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "BUSCAR" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Búho Analítico" })).not.toBeInTheDocument();
  });

  it("renders the public detail interface safely returning not_configured automatically", async () => {
    // Para detalle: getBySlugAction se invoca automáticamente
    const DetailPage = await JurisprudenceDetailPage({
      params: Promise.resolve({ slug: "123-2024" }),
    });
    render(DetailPage);

    // El mock not_configured debe producir el estado “Detalle público no disponible”
    expect(await screen.findByText("Detalle público no disponible")).toBeInTheDocument();

    // Validamos que no se expone información
    expect(screen.queryByText("Expediente")).not.toBeInTheDocument();
  });
});
