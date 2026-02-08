import { useEffect } from "react";

export default function useCulqi(publicKey, settings) {
  useEffect(() => {
    if (!window.Culqi) {
      const script = document.createElement("script");
      script.src = "https://checkout.culqi.com/js/v4";
      script.async = true;
      script.onload = () => {
        window.Culqi.publicKey = publicKey;
        window.Culqi.settings(settings);
      };
      document.body.appendChild(script);
    } else {
      window.Culqi.publicKey = publicKey;
      window.Culqi.settings(settings);
    }
  }, [publicKey, settings]);
}
