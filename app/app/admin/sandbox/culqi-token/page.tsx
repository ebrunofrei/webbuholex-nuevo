import { notFound, redirect } from "next/navigation";
import { authorizeAdminPaymentsWrite } from "@/lib/payments/payments-admin-http-runtime";

export const dynamic = "force-dynamic";

export default async function LegacyAppCulqiSandboxTokenPage() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    notFound();
  }

  let isAuthorized = false;
  try {
    const authResult = await authorizeAdminPaymentsWrite();
    if (authResult.kind === "authorized") {
      isAuthorized = true;
    }
  } catch {
    isAuthorized = false;
  }

  if (isAuthorized) {
    redirect("/admin/sandbox/culqi-token");
  }

  redirect("/app");
}
