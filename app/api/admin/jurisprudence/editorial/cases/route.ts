import { handleJurisprudenceEditorialCasesPost } from "@/lib/jurisprudence/jurisprudence-editorial-http-handler";

export async function POST(request: Request) {
  return handleJurisprudenceEditorialCasesPost(request);
}
