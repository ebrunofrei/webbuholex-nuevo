import { handleJurisprudencePublicationAuthorizationCommandsPost } from "@/lib/jurisprudence-publication-authorization-http-handler";

export async function POST(request: Request) {
  return handleJurisprudencePublicationAuthorizationCommandsPost(request);
}
