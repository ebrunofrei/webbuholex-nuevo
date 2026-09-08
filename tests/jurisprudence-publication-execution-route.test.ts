import { POST } from "@/app/api/admin/jurisprudence/publication/execution/route";
import * as route from "@/app/api/admin/jurisprudence/publication/execution/route";
import * as handler from "@/lib/jurisprudence/jurisprudence-publication-execution-http-handler";
import { describe, it, expect, vi } from "vitest";
import { NextResponse } from "next/server";

describe("POST /api/admin/jurisprudence/publication/execution", () => {
  it("A. POST surface exists", () => {
    expect(POST).toBeDefined();
    expect(typeof POST).toBe("function");
  });

  it("B. no GET/PUT/PATCH/DELETE route exports", () => {
    expect((route as Record<string, unknown>).GET).toBeUndefined();
    expect((route as Record<string, unknown>).PUT).toBeUndefined();
    expect((route as Record<string, unknown>).PATCH).toBeUndefined();
    expect((route as Record<string, unknown>).DELETE).toBeUndefined();
  });

  it("C. delegates to server-only handler", async () => {
    const mockResponse = new NextResponse("{}", { status: 200 });
    const spy = vi.spyOn(handler, "handleJurisprudencePublicationExecutionPost").mockResolvedValue(mockResponse);

    const request = new Request("https://example.com/api/admin/jurisprudence/publication/execution", {
      method: "POST"
    });

    const response = await POST(request);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(request);
    expect(response).toBe(mockResponse);

    spy.mockRestore();
  });

  it("D. runtime is nodejs", () => {
    expect((route as Record<string, unknown>).runtime).toBe("nodejs");
  });
});
