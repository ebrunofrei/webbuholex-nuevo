import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComplaintForm } from "../app/libro-de-reclamaciones/components/complaint-form";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function getFetchCall(index: number): [RequestInfo | URL, RequestInit | undefined] {
  const call = mockFetch.mock.calls.at(index);

  expect(call).toBeDefined();

  if (!call) {
    throw new Error(`expected fetch call ${index}`);
  }

  return call as [RequestInfo | URL, RequestInit | undefined];
}

describe("ComplaintForm Client Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly and has basic accessibility", () => {
    render(<ComplaintForm />);
    expect(screen.getByText("A. Datos del consumidor")).toBeInTheDocument();

    // Check for some fieldsets and labels
    expect(screen.getByRole('textbox', { name: "Correo electrónico" })).toBeInTheDocument();

    // Check submit button
    expect(screen.getByRole("button", { name: /Enviar Reclamación/i })).toBeInTheDocument();
  });

  it("sends payload without conditional fields that are not applicable", async () => {
    render(<ComplaintForm />);

    fireEvent.change(screen.getByRole('textbox', { name: "Nombres" }), { target: { value: "Juan" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Apellidos" }), { target: { value: "Perez" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Número de documento" }), { target: { value: "12345678" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Correo electrónico" }), { target: { value: "juan@example.com" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Dirección" }), { target: { value: "Av Peru 123" } });

    fireEvent.change(screen.getByRole('textbox', { name: "Descripción" }), { target: { value: "El producto vino roto" } });

    fireEvent.change(screen.getByRole('textbox', { name: "Detalle de los hechos" }), { target: { value: "Al abrir la caja estaba roto" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Pedido" }), { target: { value: "Cambio de producto" } });

    fireEvent.click(screen.getByLabelText(/Declaro que los datos consignados son verdaderos/i));
    fireEvent.click(screen.getByLabelText(/He leído y acepto los/i));

    mockFetch.mockResolvedValueOnce({
      status: 201,
      json: async () => ({
        success: true,
        status: "created",
        sheetNumber: "000001-2023",
        privateToken: "token-123"
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Reclamación/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = getFetchCall(0);

    expect(url).toBe("/api/complaints");
    expect(options).toBeDefined();

    if (!options) {
      throw new Error("expected fetch options");
    }

    expect(options.method).toBe("POST");
    expect(options.headers).toEqual({ "Content-Type": "application/json" });

    const callBody = options.body;
    expect(callBody).toBeTruthy();
    const requestBody = JSON.parse(callBody as string);

    // Verify conditional fields are ABSENT
    expect(requestBody.consumer.consumerType).toBe("natural_person");
    expect(requestBody.consumer.representative).toBeUndefined(); // isMinor was false
    expect(requestBody.consumer.legalName).toBeUndefined(); // legal entity fields absent
    expect(requestBody.subject.amount).toBeNull(); // amountApplicability is not_applicable
  });

  it("handles double-submit logic correctly", async () => {
    render(<ComplaintForm />);

    fireEvent.change(screen.getByRole('textbox', { name: "Nombres" }), { target: { value: "A" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Apellidos" }), { target: { value: "B" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Número de documento" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Correo electrónico" }), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Dirección" }), { target: { value: "C" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Descripción" }), { target: { value: "D" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Detalle de los hechos" }), { target: { value: "E" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Pedido" }), { target: { value: "F" } });
    fireEvent.click(screen.getByLabelText(/Declaro que los datos consignados son verdaderos/i));
    fireEvent.click(screen.getByLabelText(/He leído y acepto los/i));

    mockFetch.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        status: 201,
        json: async () => ({
          success: true,
          status: "created",
          sheetNumber: "000001-2023",
          privateToken: "token-123"
        })
      }), 100))
    );

    const submitBtn = screen.getByRole("button", { name: /Enviar Reclamación/i });

    fireEvent.click(submitBtn);
    expect(submitBtn).toBeDisabled();

    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only ONE fetch should be made!
    });
  });

  it("reuses idempotency key on failure (500) but generates new one on reset", async () => {
    render(<ComplaintForm />);

    fireEvent.change(screen.getByRole('textbox', { name: "Nombres" }), { target: { value: "A" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Apellidos" }), { target: { value: "B" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Número de documento" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Correo electrónico" }), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Dirección" }), { target: { value: "C" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Descripción" }), { target: { value: "D" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Detalle de los hechos" }), { target: { value: "E" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Pedido" }), { target: { value: "F" } });
    fireEvent.click(screen.getByLabelText(/Declaro que los datos consignados son verdaderos/i));
    fireEvent.click(screen.getByLabelText(/He leído y acepto los/i));

    // Fail first
    mockFetch.mockResolvedValueOnce({ status: 500 });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Reclamación/i }));

    await waitFor(() => {
      expect(screen.getByText(/No fue posible registrar la solicitud/i)).toBeInTheDocument();
    });

    const [, options1] = getFetchCall(0);

    if (!options1) {
      throw new Error("expected fetch options");
    }

    const callBody1 = options1.body;
    expect(callBody1).toBeTruthy();
    const firstKey = JSON.parse(callBody1 as string).idempotencyKey;
    expect(firstKey).toBeTruthy();

    // Retry (Success)
    mockFetch.mockResolvedValueOnce({
      status: 201,
      json: async () => ({
        success: true,
        status: "created",
        sheetNumber: "123",
        privateToken: "token"
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Reclamación/i }));

    await waitFor(() => {
      expect(screen.getByText(/123/i)).toBeInTheDocument();
    });

    const [, options2] = getFetchCall(1);
    if (!options2) {
      throw new Error("expected fetch options");
    }
    const callBody2 = options2.body;
    const secondKey = JSON.parse(callBody2 as string).idempotencyKey;
    expect(secondKey).toBe(firstKey); // MUST REUSE KEY

    // Reset and try again
    fireEvent.click(screen.getByRole("button", { name: /Registrar otra reclamación/i }));

    // Refill form because it was cleared
    fireEvent.change(screen.getByRole('textbox', { name: "Nombres" }), { target: { value: "A" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Apellidos" }), { target: { value: "B" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Número de documento" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Correo electrónico" }), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Dirección" }), { target: { value: "C" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Descripción" }), { target: { value: "D" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Detalle de los hechos" }), { target: { value: "E" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Pedido" }), { target: { value: "F" } });
    fireEvent.click(screen.getByLabelText(/Declaro que los datos consignados son verdaderos/i));
    fireEvent.click(screen.getByLabelText(/He leído y acepto los/i));

    mockFetch.mockResolvedValueOnce({
      status: 201,
      json: async () => ({
        success: true,
        status: "created",
        sheetNumber: "124",
        privateToken: "token2"
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Reclamación/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    const [, options3] = getFetchCall(2);
    if (!options3) {
      throw new Error("expected fetch options");
    }
    const callBody3 = options3.body;
    const thirdKey = JSON.parse(callBody3 as string).idempotencyKey;
    expect(thirdKey).not.toBe(firstKey); // NEW KEY
  });

  it("handles 200 already_exists without showing token", async () => {
    render(<ComplaintForm />);

    fireEvent.change(screen.getByRole('textbox', { name: "Nombres" }), { target: { value: "A" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Apellidos" }), { target: { value: "B" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Número de documento" }), { target: { value: "1" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Correo electrónico" }), { target: { value: "a@b.com" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Dirección" }), { target: { value: "C" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Descripción" }), { target: { value: "D" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Detalle de los hechos" }), { target: { value: "E" } });
    fireEvent.change(screen.getByRole('textbox', { name: "Pedido" }), { target: { value: "F" } });
    fireEvent.click(screen.getByLabelText(/Declaro que los datos consignados son verdaderos/i));
    fireEvent.click(screen.getByLabelText(/He leído y acepto los/i));

    mockFetch.mockResolvedValueOnce({
      status: 200,
      json: async () => ({
        success: true,
        status: "already_exists",
        sheetNumber: "000-EXISTING"
      }),
    });

    fireEvent.click(screen.getByRole("button", { name: /Enviar Reclamación/i }));

    await waitFor(() => {
      expect(screen.getByText("000-EXISTING")).toBeInTheDocument();
      expect(screen.getByText("Reclamación Previamente Recibida")).toBeInTheDocument();
      expect(screen.queryByText(/Guarde este código/i)).not.toBeInTheDocument(); // Token section absent
    });
  });
});
