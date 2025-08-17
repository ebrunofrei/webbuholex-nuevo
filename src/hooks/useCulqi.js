import { useEffect } from "react";

export default function useCulqi(publicKey, settings) {
  useEffect(() => {
    // Carga el script solo una vez
    if (!window.Culqi) {
      const script = document.createElement("script");
      script.src = "https://checkout.culqi.com/js/v4";
      script.async = true;
      script.onload = () => {
        window.Culqi.publicKey = publicKey;
        window.Culqi.settings(settings);
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } else {
      // Si ya existe, solo setea la llave y settings
      window.Culqi.publicKey = publicKey;
      window.Culqi.settings(settings);
    }
  }, [publicKey, settings]);
}
