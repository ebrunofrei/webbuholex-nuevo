import { handleJurisprudenceInterpretPost } from "@/lib/jurisprudence/jurisprudence-interpret-http-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleJurisprudenceInterpretPost(request);
}
