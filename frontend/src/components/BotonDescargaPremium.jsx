import React, { useState } from "react";
import useMembership from "../hooks/useMembership";
import ModalUpgradePro from "./ModalUpgradePro";

export default function BotonDescargaPremium({ url }) {
  const { isPro } = useMembership();
  const [showModal, setShowModal] = useState(false);

  function handleDescargar() {
    if (isPro) {
      window.open(url, "_blank");
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <button
        className="bg-yellow-600 text-white px-4 py-2 rounded"
        onClick={handleDescargar}
      >
        Descargar escrito premium
      </button>
      {showModal && <ModalUpgradePro onClose={() => setShowModal(false)} />}
    </>
  );
}
