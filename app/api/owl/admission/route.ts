import { NextResponse } from "next/server";
import { admitOwlRequestOnServer } from "@/lib/owl/server/admit-owl-request-on-server";

export const runtime = "nodejs";

const MAX_OWL_ADMISSION_BODY_BYTES = 98304; // 96 KiB (para cubrir 12 000 caracteres UTF-8 más escaping y overhead)

/**
 * Route Handler: capa impura de transporte, sin efectos externos ni persistencia.
 * En modo ephemeral, el código no escribe el request en storage, filesystem, SQLite,
 * caché, logs, analytics, projects, threads, conversations ni messages.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const mediaType = contentType
      .split(";", 1)[0]
      ?.trim()
      .toLowerCase();

    if (mediaType !== "application/json") {
      return NextResponse.json(
        { message: "La solicitud no pudo ser procesada por el servidor." },
        {
          status: 415,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const origin = request.headers.get("origin");
    if (origin !== null) {
      if (origin === "null") {
        return NextResponse.json(
          { message: "La solicitud no pudo ser procesada por el servidor." },
          {
            status: 403,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          }
        );
      }

      try {
        const originUrl = new URL(origin);
        const requestUrl = new URL(request.url);
        const hostHeader = request.headers.get("host");

        if (originUrl.origin !== requestUrl.origin) {
          return NextResponse.json(
            { message: "La solicitud no pudo ser procesada por el servidor." },
            {
              status: 403,
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
            }
          );
        }

        if (hostHeader !== null && originUrl.host !== hostHeader) {
          return NextResponse.json(
            { message: "La solicitud no pudo ser procesada por el servidor." },
            {
              status: 403,
              headers: {
                "Cache-Control": "no-store",
                "Content-Type": "application/json",
              },
            }
          );
        }
      } catch {
        return NextResponse.json(
          { message: "La solicitud no pudo ser procesada por el servidor." },
          {
            status: 403,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (
        !isNaN(contentLength) &&
        contentLength > MAX_OWL_ADMISSION_BODY_BYTES
      ) {
        return NextResponse.json(
          { message: "La solicitud no pudo ser procesada por el servidor." },
          {
            status: 413,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    let bodyLength = 0;
    const chunks: Uint8Array[] = [];

    if (request.body) {
      const reader = request.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            bodyLength += value.byteLength;
            if (bodyLength > MAX_OWL_ADMISSION_BODY_BYTES) {
              return NextResponse.json(
                {
                  message:
                    "La solicitud no pudo ser procesada por el servidor.",
                },
                {
                  status: 413,
                  headers: {
                    "Cache-Control": "no-store",
                    "Content-Type": "application/json",
                  },
                }
              );
            }
            chunks.push(value);
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    let jsonBody: unknown;
    if (bodyLength === 0) {
      return NextResponse.json(
        { message: "La solicitud no pudo ser procesada por el servidor." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json",
          },
        }
      );
    }

    try {
      const totalBuffer = new Uint8Array(bodyLength);
      let offset = 0;
      for (const chunk of chunks) {
        totalBuffer.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const bodyText = new TextDecoder("utf-8", { fatal: true }).decode(
        totalBuffer
      );
      jsonBody = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { message: "La solicitud no pudo ser procesada por el servidor." },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "application/json",
          },
        }
      );
    }

    const admissionState = admitOwlRequestOnServer(jsonBody);

    if (admissionState.status === "rejected") {
      return NextResponse.json(admissionState, {
        status: 422,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      });
    }

    return NextResponse.json(admissionState, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "La solicitud no pudo ser procesada por el servidor." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      }
    );
  }
}
