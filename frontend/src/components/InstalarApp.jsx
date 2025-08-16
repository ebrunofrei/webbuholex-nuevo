import React from "react";

// Puedes personalizar este componente o quitar el botón si ya no usas PWA.
export default function InstalarApp() {
  // Detecta si la instalación de PWA es soportada
  React.useEffect(() => {
    let deferredPrompt;

    function beforeInstallPrompt(e) {
      // Previene que salga el prompt automático
      e.preventDefault();
      deferredPrompt = e;
      window.deferredPrompt = e; // Guardamos globalmente
    }

    window.addEventListener("beforeinstallprompt", beforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = window.deferredPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      // Puedes manejar el resultado si deseas
      if (outcome === "accepted") {
        window.deferredPrompt = null;
      }
    }
  };

  // Puedes ocultar el botón si no es relevante para tu web.
  return (
    <div className="w-full text-center py-2 bg-blue-50">
      <button
        onClick={handleInstallClick}
        className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 transition"
      >
        Instalar BúhoLex en tu dispositivo
      </button>
    </div>
  );
}
