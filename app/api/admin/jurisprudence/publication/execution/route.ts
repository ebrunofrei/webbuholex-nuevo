import { handleJurisprudencePublicationExecutionPost } from "@/lib/jurisprudence/jurisprudence-publication-execution-http-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleJurisprudencePublicationExecutionPost(request);
}
