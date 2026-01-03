import React from "react";

export default function ConfirmActionModal({
  open,
  confirmation,
  onConfirm,
  onCancel,
}) {
  if (!open || !confirmation) return null;

  const { title, description } = confirmation;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
      <div
        className="
          w-full max-w-lg
          bg-white
          rounded-2xl
          border border-[#5C2E0B]
          shadow-xl
          p-5
        "
        role="dialog"
        aria-modal="true"
      >
        <div className="text-xl font-bold text-black">
          {title || "Confirmar acción"}
        </div>

        {description && (
          <div className="mt-2 text-base text-black/70">
            {description}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            className="
              px-4 py-2 rounded-xl
              border border-[#5C2E0B]
              bg-white text-[#5C2E0B]
              font-semibold
              hover:bg-[#F6EFE8]
            "
            onClick={onCancel}
          >
            Cancelar
          </button>

          <button
            className="
              px-4 py-2 rounded-xl
              bg-[#5C2E0B]
              text-white
              font-semibold
              hover:bg-[#4A2308]
            "
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
