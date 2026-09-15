"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

// Narrow local types for CulqiCheckout
interface CulqiCheckoutConfig {
  settings: {
    title: string;
    currency: string;
    amount?: number;
    order?: string;
  };
  options?: {
    lang?: string;
    modal?: boolean;
    installments?: boolean;
    customButton?: string;
    paymentMethods?: {
      tarjeta: boolean;
      yape: boolean;
      bancaMovil: boolean;
      agente: boolean;
      cuotealo: boolean;
    };
  };
}

interface CulqiCheckoutInstance {
  open: () => void;
  close: () => void;
  culqi: () => void;
  token?: {
    id: string;
    [key: string]: unknown;
  };
  error?: {
    merchant_message?: string;
    user_message?: string;
    [key: string]: unknown;
  };
}

declare global {
  interface Window {
    CulqiCheckout?: new (publicKey: string, config: CulqiCheckoutConfig) => CulqiCheckoutInstance;
  }
}

interface OperatorTokenHarnessProps {
  publicKey: string;
}

export function OperatorTokenHarness({ publicKey }: OperatorTokenHarnessProps) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [checkoutInstance, setCheckoutInstance] = useState<CulqiCheckoutInstance | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && token) {
      handleClear();
    }
  }, [timeLeft, token]);

  // Initialize Culqi when script loads
  useEffect(() => {
    if (isScriptLoaded && window.CulqiCheckout) {
      try {
        if (!publicKey.startsWith("pk_test_")) {
          throw new Error("Invalid public key. Must be a test key (pk_test_...).");
        }

        const instance = new window.CulqiCheckout(publicKey, {
          settings: {
            title: "BúhoLex Sandbox",
            currency: "PEN",
          },
          options: {
            paymentMethods: {
              tarjeta: true,
              yape: false,
              bancaMovil: false,
              agente: false,
              cuotealo: false,
            },
          },
        });

        instance.culqi = function () {
          if (instance.token) {
            const tokenId = instance.token.id;
            if (typeof tokenId === "string" && tokenId.startsWith("tkn_")) {
              setToken(tokenId);
              setTimeLeft(300); // 5 minutes
              setError(null);
              instance.close();
            } else {
              setError("Provider returned an invalid token format.");
            }
          } else if (instance.error) {
            setError(instance.error.user_message || instance.error.merchant_message || "Token generation failed");
          }
        };

        setCheckoutInstance(instance);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Failed to initialize Culqi Checkout");
      }
    }
  }, [isScriptLoaded, publicKey]);

  const handleOpenCheckout = () => {
    setError(null);
    if (checkoutInstance) {
      checkoutInstance.open();
    } else {
      setError("Culqi checkout is not ready yet.");
    }
  };

  const handleClear = () => {
    setToken(null);
    setTimeLeft(0);
    setError(null);
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <Script
        src="https://js.culqi.com/checkout-js"
        strategy="lazyOnload"
        onLoad={() => setIsScriptLoaded(true)}
        onError={() => setError("Failed to load Culqi Checkout script.")}
      />

      <h2 className="text-2xl font-bold mb-4 text-gray-800">SANDBOX / OPERATOR ONLY</h2>
      <p className="text-sm text-gray-600 mb-6">
        Generate a test Culqi token (tkn_*) for E2E Charge testing using Custom Checkout. BúhoLex never sees the raw card data.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {token ? (
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <h3 className="text-green-800 font-semibold mb-2">Token Generated Successfully</h3>
          <div className="flex items-center space-x-2 mb-3">
            <code className="bg-white px-2 py-1 rounded text-sm flex-1 overflow-x-auto">
              {token}
            </code>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-green-700 mb-4">
            Expires in: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            <br />
            Use immediately. Do not retry a Charge with this token. Single-use only.
          </p>
          <button
            onClick={handleClear}
            className="w-full py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Clear Token & Reset
          </button>
        </div>
      ) : (
        <button
          onClick={handleOpenCheckout}
          disabled={!isScriptLoaded || !checkoutInstance}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {!isScriptLoaded ? "Loading checkout..." : "Open Culqi Checkout"}
        </button>
      )}
    </div>
  );
}
