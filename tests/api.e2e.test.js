// tests/api.e2e.test.js
import request from "supertest";

// Importa tu app de Express. Si hoy solo arrancas con app.listen(...) en server.js,
// exporta 'app' desde server.js y aquí impórtalo:
import { app } from "../server.js"; // <-- asegúrate de exportar 'app' en server.js

describe("API contract", () => {
  test("GET /api/health -> 200 JSON con ok:true y campos esperados", async () => {
    const res = await request(app).get("/api/health").expect(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("entorno");
    expect(res.body).toHaveProperty("mongo");
    expect(Array.isArray(res.body.cors)).toBe(true);
  });

  test("GET /api/esto-no-existe -> 404 JSON con ok:false y 'Ruta no encontrada'", async () => {
    const res = await request(app)
      .get("/api/esto-no-existe")
      .set("Accept", "application/json")
      .expect(404);

    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toEqual({ ok: false, error: "Ruta no encontrada" });
  });
});
