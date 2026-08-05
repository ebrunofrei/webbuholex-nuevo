import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProfessionalConsultationForm } from "@/components/professional-consultation-form";
import { professionalConsultationFormSchema } from "@/lib/schemas/consultation";

describe("consulta profesional", () => {
  it("exige privacidad y autorización de contacto", () => {
    const result = professionalConsultationFormSchema.safeParse({
      name: "Persona de prueba",
      email: "persona@example.test",
      phoneOrWhatsApp: "+51 900 000 000",
      matter: "Civil",
      jurisdiction: "Perú",
      attentionType: "legal_orientation",
      urgency: "standard",
      description: "Descripción de prueba con longitud suficiente para validar la solicitud.",
      hasDeadline: false,
      deadlineDescription: null,
      privacyAccepted: false,
      contactAuthorized: false,
      preferredContactMedium: "whatsapp",
    });
    expect(result.success).toBe(false);
  });

  it("valida localmente sin afirmar que envió información", () => {
    render(<ProfessionalConsultationForm />);
    fireEvent.change(screen.getByLabelText(/^Nombre/), { target: { value: "Persona de prueba" } });
    fireEvent.change(screen.getByLabelText(/^Correo/), { target: { value: "persona@example.test" } });
    fireEvent.change(screen.getByLabelText(/^Teléfono o WhatsApp/), { target: { value: "+51 900 000 000" } });
    fireEvent.change(screen.getByLabelText(/^Materia/), { target: { value: "Civil" } });
    fireEvent.change(screen.getByLabelText(/^Jurisdicción/), { target: { value: "Perú" } });
    fireEvent.change(screen.getByLabelText(/^Tipo de atención/), { target: { value: "legal_orientation" } });
    fireEvent.change(screen.getByLabelText(/^Breve descripción/), { target: { value: "Descripción de prueba con longitud suficiente para validar la solicitud." } });
    fireEvent.change(screen.getByLabelText(/^Medio preferido de contacto/), { target: { value: "whatsapp" } });
    fireEvent.click(screen.getByLabelText(/He leído el aviso de privacidad/));
    fireEvent.click(screen.getByLabelText(/Autorizo al equipo institucional/));
    fireEvent.click(screen.getByRole("button", { name: "Validar solicitud" }));
    expect(screen.getByRole("status")).toHaveTextContent("Se preparó el mensaje");
    expect(screen.getByRole("status")).toHaveTextContent("Revisará y enviará su consulta");
  });

  it("reconoce un servicio seleccionado sin crear solicitud ni aceptar archivos", () => {
    const { container } = render(<ProfessionalConsultationForm selectedService={{ slug: "ingenieria-civil-saneamiento-inmobiliario", title: "Ingeniería civil para saneamiento inmobiliario" }} />);
    expect(container.textContent).toContain("Ingeniería civil para saneamiento inmobiliario");
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(container.textContent).not.toMatch(/número de solicitud|expediente creado|enviado correctamente/i);
  });
});
