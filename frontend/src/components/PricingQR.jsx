// Ubica este componente en tu página de precios, por ejemplo en: src/components/PricingQR.jsx

export default function QRPaymentBox() {
  return (
    <div className="flex flex-col items-center justify-center bg-white rounded-xl shadow-lg p-6 my-6 w-full max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-2 text-gray-800">Pago con QR Bancario</h3>
      <p className="text-gray-600 mb-4 text-center">
        Escanea este código QR con Yape, Plin o tu billetera favorita para pagar directamente.<br />
        <span className="font-semibold">Empresa:</span> Constructora Consultora Bienes (BBVA)
      </p>
      <img
        src="/img/qr-bbva.jpg"
        alt="Pago QR BBVA"
        className="w-60 h-60 rounded-lg border-2 border-gray-200 mb-2"
      />
      <span className="text-sm text-gray-500">
        <span className="font-semibold">* Recuerda enviar tu comprobante</span> para validación automática.
      </span>
    </div>
  );
}
