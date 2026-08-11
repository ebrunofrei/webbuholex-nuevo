import { NextResponse } from "next/server";

export function mergeAuth0ResponseHeaders(
  authResponse: Response,
  targetResponse: NextResponse
): void {
  const isTerminating = targetResponse.status >= 300;

  for (const [key, value] of authResponse.headers) {
    const lowerKey = key.toLowerCase();

    if (isTerminating && (
      lowerKey === "x-middleware-next" ||
      lowerKey === "location" ||
      lowerKey === "content-length"
    )) {
      continue;
    }

    targetResponse.headers.append(key, value);
  }
}
