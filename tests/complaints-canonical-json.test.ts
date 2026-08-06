import { describe, it, expect } from "vitest";
import { canonicalizeJson } from "../lib/complaints/canonical-json";

describe("canonicalizeJson", () => {
  it("objeto vacío", () => expect(canonicalizeJson({})).toBe("{}"));
  it("array vacío", () => expect(canonicalizeJson([])).toBe("[]"));
  it("null", () => expect(canonicalizeJson(null)).toBe("null"));
  it("boolean", () => expect(canonicalizeJson(true)).toBe("true"));
  it("string", () => expect(canonicalizeJson("test")).toBe('"test"'));
  it("entero", () => expect(canonicalizeJson(42)).toBe("42"));
  it("decimal", () => expect(canonicalizeJson(3.14)).toBe("3.14"));
  it("-0 produce 0", () => expect(canonicalizeJson(-0)).toBe("0"));

  it("orden distinto de claves produce la misma cadena", () => {
    expect(canonicalizeJson({ a: 1, b: 2 })).toBe(canonicalizeJson({ b: 2, a: 1 }));
    expect(canonicalizeJson({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it("orden anidado", () => {
    expect(canonicalizeJson({ b: { d: 4, c: 3 }, a: 1 })).toBe('{"a":1,"b":{"c":3,"d":4}}');
  });

  it("arrays conservan orden", () => {
    expect(canonicalizeJson([2, 1])).toBe("[2,1]");
  });

  it("Unicode á", () => expect(canonicalizeJson("á")).toBe('"á"'));
  it("Unicode ñ", () => expect(canonicalizeJson("ñ")).toBe('"ñ"'));
  it("carácter suplementario", () => expect(canonicalizeJson("𐍈")).toBe('"𐍈"'));

  it("NFC/NFD producen cadenas diferentes", () => {
    const nfc = "ñ";
    const nfd = "n\u0303";
    expect(canonicalizeJson(nfc)).not.toBe(canonicalizeJson(nfd));
  });

  it("claves numéricas ordenadas por comparador definido", () => {
    expect(canonicalizeJson({ "10": 1, "2": 2 })).toBe('{"10":1,"2":2}');
  });

  it("caracteres escapados", () => {
    expect(canonicalizeJson("a\nb")).toBe('"a\\nb"');
  });

  it("no mutación", () => {
    const obj = { b: 2, a: 1 };
    canonicalizeJson(obj);
    expect(Object.keys(obj)).toEqual(["b", "a"]);
  });

  it("referencia compartida no circular", () => {
    const shared = { x: 1 };
    expect(canonicalizeJson({ a: shared, b: shared })).toBe('{"a":{"x":1},"b":{"x":1}}');
  });

  it("referencia circular rechazada", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalizeJson(circular)).toThrow("complaint_canonical_payload_invalid");
  });

  it("undefined raíz", () => expect(() => canonicalizeJson(undefined)).toThrow("complaint_canonical_payload_invalid"));
  it("undefined en objeto", () => expect(() => canonicalizeJson({ a: undefined })).toThrow("complaint_canonical_payload_invalid"));
  it("undefined en array", () => expect(() => canonicalizeJson([undefined])).toThrow("complaint_canonical_payload_invalid"));

  it("NaN", () => expect(() => canonicalizeJson(NaN)).toThrow("complaint_canonical_payload_invalid"));
  it("Infinity", () => expect(() => canonicalizeJson(Infinity)).toThrow("complaint_canonical_payload_invalid"));
  it("-Infinity", () => expect(() => canonicalizeJson(-Infinity)).toThrow("complaint_canonical_payload_invalid"));

  it("bigint", () => expect(() => canonicalizeJson(1n)).toThrow("complaint_canonical_payload_invalid"));
  it("function", () => expect(() => canonicalizeJson(() => {})).toThrow("complaint_canonical_payload_invalid"));
  it("symbol", () => expect(() => canonicalizeJson(Symbol("test"))).toThrow("complaint_canonical_payload_invalid"));
  it("Date", () => expect(() => canonicalizeJson(new Date())).toThrow("complaint_canonical_payload_invalid"));
  it("Map", () => expect(() => canonicalizeJson(new Map())).toThrow("complaint_canonical_payload_invalid"));
  it("Set", () => expect(() => canonicalizeJson(new Set())).toThrow("complaint_canonical_payload_invalid"));
  it("Buffer", () => expect(() => canonicalizeJson(Buffer.from("a"))).toThrow("complaint_canonical_payload_invalid"));
  it("Uint8Array", () => expect(() => canonicalizeJson(new Uint8Array(1))).toThrow("complaint_canonical_payload_invalid"));

  class MyClass {}
  it("instancia de clase", () => expect(() => canonicalizeJson(new MyClass())).toThrow("complaint_canonical_payload_invalid"));

  it("Object.create(null)", () => expect(() => canonicalizeJson(Object.create(null))).toThrow("complaint_canonical_payload_invalid"));

  it("array disperso", () => {
    const arr = [1];
    arr[2] = 3;
    expect(() => canonicalizeJson(arr)).toThrow("complaint_canonical_payload_invalid");
  });

  it("array con propiedad extra", () => {
    const arr: unknown[] & { extra?: number } = [1, 2];
    arr.extra = 3;
    expect(() => canonicalizeJson(arr)).toThrow("complaint_canonical_payload_invalid");
  });

  it("symbol key", () => {
    const obj = { [Symbol("test")]: 1 };
    expect(() => canonicalizeJson(obj)).toThrow("complaint_canonical_payload_invalid");
  });

  it("getter", () => {
    let executed = false;
    const obj = {
      get a() {
        executed = true;
        return 1;
      }
    };
    expect(() => canonicalizeJson(obj)).toThrow("complaint_canonical_payload_invalid");
    expect(executed).toBe(false);
  });

  it("setter", () => {
    const obj = {
      set a(val: unknown) {}
    };
    expect(() => canonicalizeJson(obj)).toThrow("complaint_canonical_payload_invalid");
  });

  it("toJSON", () => {
    const obj = {
      toJSON: () => "test"
    };
    expect(() => canonicalizeJson(obj)).toThrow("complaint_canonical_payload_invalid");
  });
});
