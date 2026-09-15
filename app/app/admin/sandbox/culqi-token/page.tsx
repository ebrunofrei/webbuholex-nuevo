import { OperatorTokenHarness } from "@/components/payments/operator-token-harness";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sandbox Token Harness | Operator Only",
};

export default async function CulqiSandboxTokenPage() {
  // 1. Preview-only Guard
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    // Harness must be unavailable in Production
    notFound();
  }

  // 2. Authorization Guard
  try {
    const authResult = await authorizeAdminPaymentsWrite();
    if (authResult.kind !== "authorized") {
      redirect("/app"); // Unauthorized operators redirected
    }
  } catch {
    redirect("/app");
  }

  // 3. Public Key Contract
  const publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY;
  const isKeyValid = publicKey && publicKey.startsWith("pk_test_");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Culqi Tokenization Harness</h1>
        <p className="text-gray-600">
          Operator-only interface to generate single-use sandbox tokens for E2E Charge testing.
        </p>
      </div>

      {!isKeyValid ? (
        <div className="max-w-md mx-auto p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h2 className="text-yellow-800 font-bold mb-2">Configuration Required</h2>
          <p className="text-yellow-700 text-sm">
            NEXT_PUBLIC_CULQI_PUBLIC_KEY is not configured or is not a test key.
            Please add your pk_test_* key to the Vercel Preview environment variables.
          </p>
        </div>
      ) : (
        <OperatorTokenHarness publicKey={publicKey} />
      )}
    </div>
  );
}
