import { handleJurisprudenceGovernanceSourcesPost } from "@/lib/jurisprudence/jurisprudence-governance-http-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleJurisprudenceGovernanceSourcesPost(request);
}
