import { describe, it, expect } from "vitest";
import { canTransitionComplaintStatus, getAllowedTransitions } from "@/lib/complaints";

describe("Complaints Transitions", () => {
  it("permite transición de received a under_review", () => {
    expect(canTransitionComplaintStatus("received", "under_review")).toBe(true);
  });

  it("permite transición de under_review a awaiting_information o answered", () => {
    expect(canTransitionComplaintStatus("under_review", "awaiting_information")).toBe(true);
    expect(canTransitionComplaintStatus("under_review", "answered")).toBe(true);
  });

  it("permite transición de awaiting_information a under_review o answered", () => {
    expect(canTransitionComplaintStatus("awaiting_information", "under_review")).toBe(true);
    expect(canTransitionComplaintStatus("awaiting_information", "answered")).toBe(true);
  });

  it("permite transición de answered a closed", () => {
    expect(canTransitionComplaintStatus("answered", "closed")).toBe(true);
  });

  it("rechaza transiciones inválidas", () => {
    expect(canTransitionComplaintStatus("received", "closed")).toBe(false);
    expect(canTransitionComplaintStatus("under_review", "closed")).toBe(false);
    expect(canTransitionComplaintStatus("closed", "received")).toBe(false);
    expect(canTransitionComplaintStatus("closed", "answered")).toBe(false); // Terminal
  });

  it("rechaza transición al mismo estado", () => {
    expect(canTransitionComplaintStatus("received", "received")).toBe(false);
  });

  it("devuelve los estados permitidos", () => {
    expect(getAllowedTransitions("received")).toEqual(["under_review"]);
    expect(getAllowedTransitions("closed")).toEqual([]);
  });
});
