import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfessionalConsultationForm } from "@/components/professional-consultation-form";

describe("Phase 12.C: Form commercial conversion", () => {
  it("shows direct contact texts instead of local validation warnings", () => {
    render(<ProfessionalConsultationForm />);
    expect(screen.getByText("Contacto directo")).toBeInTheDocument();
    expect(screen.getByText("El sistema estructurará su consulta para enviarla por el canal corporativo.")).toBeInTheDocument();
  });

  it("does not allow submission without privacy acceptance", () => {
    render(<ProfessionalConsultationForm />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Persona de prueba" } });
    fireEvent.click(screen.getByRole("button", { name: "Validar solicitud" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
  });
});
