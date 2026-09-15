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

interface SandboxRun {
  quoteId: string;
  orderId: string;
  attemptId: string;
  amountMinor: number;
  currency: string;
  status: string;
}

interface ChargeResult {
  success: boolean;
  attemptStatus?: string;
  orderStatus?: string;
  resultClass?: string;
  failureCategory?: string;
  providerPaymentId?: string;
  error?: string;
}

export function OperatorTokenHarness({ publicKey }: OperatorTokenHarnessProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [checkoutInstance, setCheckoutInstance] = useState<CulqiCheckoutInstance | null>(null);

  const [sandboxRun, setSandboxRun] = useState<SandboxRun | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const [token, setToken] = useState<string | null>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [chargeResult, setChargeResult] = useState<ChargeResult | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Initialize Culqi when script loads and we have a run prepared
  useEffect(() => {
    if (isScriptLoaded && window.CulqiCheckout && sandboxRun) {
      try {
        if (!publicKey.startsWith("pk_test_")) {
          throw new Error("Invalid public key. Must be a test key (pk_test_...).");
        }

        const instance = new window.CulqiCheckout(publicKey, {
          settings: {
            title: "BúhoLex Sandbox",
            currency: sandboxRun.currency,
            amount: sandboxRun.amountMinor,
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
  }, [isScriptLoaded, publicKey, sandboxRun]);

  const handlePrepareRun = async () => {
    setError(null);
    setChargeResult(null);
    setToken(null);
    setIsPreparing(true);
    try {
      const res = await fetch("/api/admin/payments/sandbox/card-run", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to prepare run");
      }
      setSandboxRun(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to prepare sandbox run.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleOpenCheckout = () => {
    setError(null);
    if (checkoutInstance) {
      checkoutInstance.open();
    } else {
      setError("Culqi checkout is not ready yet.");
    }
  };

  const handleExecuteCharge = async () => {
    if (!sandboxRun || !token) return;

    setIsExecuting(true);
    setError(null);

    // Copy token securely to memory scope, then clear React state to consume it visually
    const currentToken = token;
    setToken(null);

    try {
      const res = await fetch("/api/admin/payments/sandbox/charge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: sandboxRun.attemptId,
          sourceToken: currentToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChargeResult({ success: false, error: data.error?.message || data.error || "Failed to execute charge" });
      } else {
        setChargeResult(data);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setChargeResult({ success: false, error: e.message || "Network error executing charge" });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClear = () => {
    setSandboxRun(null);
    setToken(null);
    setChargeResult(null);
    setError(null);
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
        Generate a test Culqi token and execute a sandbox charge. BúhoLex never sees the raw card data.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Prepare Run */}
      {!sandboxRun && !chargeResult && (
        <button
          onClick={handlePrepareRun}
          disabled={isPreparing}
          className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isPreparing ? "Preparing Run..." : "1. Prepare Sandbox Run"}
        </button>
      )}

      {/* Step 2: Show Run Details & Open Checkout */}
      {sandboxRun && !token && !chargeResult && !isExecuting && (
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4">
          <h3 className="text-gray-800 font-semibold mb-2">Run Prepared</h3>
          <div className="text-xs text-gray-600 space-y-1 mb-4 font-mono break-all">
            <p><strong>Quote ID:</strong> {sandboxRun.quoteId}</p>
            <p><strong>Order ID:</strong> {sandboxRun.orderId}</p>
            <p><strong>Attempt ID:</strong> {sandboxRun.attemptId}</p>
            <p><strong>Amount:</strong> {sandboxRun.amountMinor} {sandboxRun.currency}</p>
          </div>
          <button
            onClick={handleOpenCheckout}
            disabled={!isScriptLoaded || !checkoutInstance}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {!isScriptLoaded ? "Loading checkout..." : "2. Open Culqi Checkout"}
          </button>
        </div>
      )}

      {/* Step 3: Token Generated, Ready to Execute */}
      {token && !isExecuting && !chargeResult && (
        <div className="bg-green-50 p-4 rounded-md border border-green-200 mb-4">
          <h3 className="text-green-800 font-semibold mb-2">Sandbox token generated and ready</h3>
          <p className="text-xs text-green-700 mb-4">
            A single-use capability token has been received.
          </p>
          <button
            onClick={handleExecuteCharge}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
          >
            3. Execute Sandbox Charge
          </button>
        </div>
      )}

      {isExecuting && (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4 text-center">
          <p className="text-blue-800 font-semibold">Executing Charge...</p>
        </div>
      )}

      {/* Step 4: Show Result */}
      {chargeResult && (
        <div className={`p-4 rounded-md border mb-4 ${chargeResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <h3 className={`font-semibold mb-2 ${chargeResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {chargeResult.success ? "Execution Finished" : "Execution Failed"}
          </h3>
          {chargeResult.resultClass === 'reconciliation_required' && !chargeResult.providerPaymentId && (
            <div className="mb-4 p-3 bg-red-100 text-red-800 border border-red-300 font-bold rounded">
              MANUAL PROVIDER RECOVERY REQUIRED
              <p className="font-normal text-sm mt-1">
                The network disconnected before receiving a response, and no provider ID is known.
                Do not retry charging. Check the Culqi dashboard manually.
              </p>
            </div>
          )}
          {chargeResult.error && (
             <p className="text-sm text-red-700 mb-2">{chargeResult.error}</p>
          )}
          {chargeResult.resultClass && (
            <div className="text-xs text-gray-700 space-y-1 font-mono">
              <p><strong>Result Class:</strong> {chargeResult.resultClass}</p>
              <p><strong>Attempt Status:</strong> {chargeResult.attemptStatus}</p>
              <p><strong>Order Status:</strong> {chargeResult.orderStatus}</p>
              {chargeResult.providerPaymentId && <p><strong>Provider ID:</strong> {chargeResult.providerPaymentId}</p>}
              {chargeResult.failureCategory && <p><strong>Failure Category:</strong> {chargeResult.failureCategory}</p>}
            </div>
          )}
        </div>
      )}

      {(sandboxRun || chargeResult) && (
        <button
          onClick={handleClear}
          disabled={isExecuting}
          className="w-full py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors disabled:opacity-50 mt-4"
        >
          Clear & Start Over
        </button>
      )}
    </div>
  );
}
