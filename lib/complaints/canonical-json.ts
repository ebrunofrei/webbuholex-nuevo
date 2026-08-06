export type CanonicalJsonPrimitive =
  | null
  | boolean
  | string
  | number;

export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

export function canonicalizeJson(value: unknown): string {
  return serialize(value, new Set());
}

function serialize(value: unknown, seen: Set<unknown>): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("complaint_canonical_payload_invalid");
    if (Object.is(value, -0)) return "0";
    return String(value);
  }

  if (typeof value !== "object") throw new Error("complaint_canonical_payload_invalid");

  if (seen.has(value)) throw new Error("complaint_canonical_payload_invalid");
  seen.add(value);

  if (Array.isArray(value)) {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);

    const expectedLength = value.length;
    let indexCount = 0;

    for (const key of keys) {
      if (typeof key === 'symbol') throw new Error("complaint_canonical_payload_invalid");

      const desc = descriptors[key]!;
      if (desc.get || desc.set) throw new Error("complaint_canonical_payload_invalid");

      if (key === 'length') continue;

      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= expectedLength || String(index) !== key) {
        throw new Error("complaint_canonical_payload_invalid");
      }
      indexCount++;
    }

    if (indexCount !== expectedLength) throw new Error("complaint_canonical_payload_invalid");

    const parts = [];
    for (let i = 0; i < expectedLength; i++) {
      const item = value[i];
      if (item === undefined) throw new Error("complaint_canonical_payload_invalid");
      parts.push(serialize(item, seen));
    }
    seen.delete(value);
    return `[${parts.join(",")}]`;
  }

  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype) {
    throw new Error("complaint_canonical_payload_invalid");
  }

  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);

  const validKeys: string[] = [];
  for (const key of keys) {
    if (typeof key === 'symbol') throw new Error("complaint_canonical_payload_invalid");
    if (key === 'toJSON') throw new Error("complaint_canonical_payload_invalid");

    const desc = descriptors[key]!;
    if (desc.get || desc.set) throw new Error("complaint_canonical_payload_invalid");

    const val = desc.value;
    if (val === undefined) throw new Error("complaint_canonical_payload_invalid");
    validKeys.push(key);
  }

  validKeys.sort((a, b) => {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  const parts = [];
  for (const key of validKeys) {
    parts.push(`${JSON.stringify(key)}:${serialize(descriptors[key]!.value, seen)}`);
  }

  seen.delete(value);
  return `{${parts.join(",")}}`;
}
