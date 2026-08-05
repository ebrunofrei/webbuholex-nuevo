import { describe, expect, it } from "vitest";
import { manualOrderTransitions } from "@/data/manual-order-workflow";
import { manualOrderStatusSchema } from "@/lib/schemas/catalog";

describe("estados de pedido manual", () => {
  it("define exactamente los ocho estados aprobados", () => {
    expect(manualOrderStatusSchema.options).toEqual(["requested", "reviewing", "awaiting_payment", "paid", "preparing", "delivered", "cancelled", "refunded"]);
  });

  it("no permite saltar desde solicitado a pagado", () => {
    expect(manualOrderTransitions.requested).not.toContain("paid");
    expect(manualOrderTransitions.requested).toContain("reviewing");
  });

  it("solo entrega después de preparar", () => {
    expect(manualOrderTransitions.preparing).toContain("delivered");
    expect(manualOrderTransitions.awaiting_payment).not.toContain("delivered");
  });
});
