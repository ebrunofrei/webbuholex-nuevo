
import "server-only";
import { JurisprudenceLocalRecord, JurisprudenceLocalRecordProspective, JurisprudenceLocalRecordBinding, JurisprudenceLocalRecordConstitutional } from "@/types/jurisprudence-local-catalog";

import record0090 from "./records/0090-2004-AA-TC.json";
import record1417 from "./records/1417-2005-AA-TC.json";
import record0008 from "./records/0008-2003-AI-TC.json";

type WithoutKind<T> = Omit<T, "kind">;

function validateProspective(record: WithoutKind<JurisprudenceLocalRecordProspective>): JurisprudenceLocalRecordProspective {
  return { ...record, kind: "prospective_rule" };
}

function validateBinding(record: WithoutKind<JurisprudenceLocalRecordBinding>): JurisprudenceLocalRecordBinding {
  return { ...record, kind: "binding_rule" };
}

function validateConstitutional(record: WithoutKind<JurisprudenceLocalRecordConstitutional>): JurisprudenceLocalRecordConstitutional {
  return { ...record, kind: "constitutional_economic_rule" };
}

export const localVerifiedCatalog: readonly JurisprudenceLocalRecord[] = [
  validateProspective(record0090),
  validateBinding(record1417),
  validateConstitutional(record0008),
];
