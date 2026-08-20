import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runJurisprudencePublicationOutboxHost } from "@/lib/jurisprudence/jurisprudence-publication-outbox-host";
import {
  isJurisprudencePublicationCronEnabled,
  readJurisprudencePublicationCronSecret,
} from "@/lib/jurisprudence/jurisprudence-publication-cron-config";

function secureCompare(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = readJurisprudencePublicationCronSecret();

    if (!expectedSecret || expectedSecret.trim() === "") {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const providedSecret = authHeader.substring(7);

    if (!secureCompare(expectedSecret, providedSecret)) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const isEnabled = isJurisprudencePublicationCronEnabled();

    if (!isEnabled) {
      return NextResponse.json(
        { status: "DISABLED", message: "Cron is explicitly disabled." },
        { status: 200 }
      );
    }

    const result = await runJurisprudencePublicationOutboxHost({
      env: process.env,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Log safe error internally, return generic failure
    console.error("Cron Execution Failed:", error instanceof Error ? error.message : "Unknown Error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
