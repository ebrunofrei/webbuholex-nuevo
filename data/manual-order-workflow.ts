import type { ManualOrderStatus } from "@/types/catalog";

export const manualOrderStatusLabels: Readonly<Record<ManualOrderStatus, string>> = {
  requested: "Solicitado",
  reviewing: "En revisión",
  awaiting_payment: "Pendiente de pago",
  paid: "Pagado",
  preparing: "En preparación",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export const manualOrderTransitions: Readonly<Record<ManualOrderStatus, readonly ManualOrderStatus[]>> = {
  requested: ["reviewing", "cancelled"],
  reviewing: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "cancelled"],
  paid: ["preparing", "refunded"],
  preparing: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};
