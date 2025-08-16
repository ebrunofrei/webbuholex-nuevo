import React from "react";
export default function BannerUpgrade({ onUpgrade }) {
  return (
    <div className="fixed bottom-7 right-6 bg-[#b03a1a] text-white p-6 rounded-2xl shadow-xl z-50 flex items-center gap-6">
      <div className="font-bold text-lg">
        ¡Límite diario gratis alcanzado!
        <div className="text-white font-normal mt-1">Hazte <b>Premium</b> y disfruta de funciones ilimitadas.</div>
      </div>
      <button
        className="bg-white text-[#b03a1a] font-bold px-5 py-2 rounded-xl hover:bg-[#f2d0c4] transition"
        onClick={onUpgrade}
      >
        Hazte Premium
      </button>
    </div>
  );
}
