import {
  ingestJurisprudenceProduction,
  validateProductionEnvironment,
  mapPilotRecordToCanonicalNewRecord,
  isUnknownRecord,
  JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN,
  JURISPRUDENCE_PRODUCTION_TARGET,
  type IngestionOptions,
  type IngestionResult,
  type ValidatedEnvironment,
} from "@/lib/jurisprudence/jurisprudence-production-ingestion";

export {
  ingestJurisprudenceProduction,
  validateProductionEnvironment,
  mapPilotRecordToCanonicalNewRecord,
  isUnknownRecord,
  JURISPRUDENCE_PRODUCTION_CONFIRM_TOKEN,
  JURISPRUDENCE_PRODUCTION_TARGET,
  type IngestionOptions,
  type IngestionResult,
  type ValidatedEnvironment,
};

if (process.argv[1] && process.argv[1].endsWith("jurisprudence-ingest-production.ts")) {
  const args = process.argv.slice(2);
  let filePath: string | undefined;
  let sourceDocumentPath: string | undefined;
  let dryRun = false;
  let operatorId: string | undefined;
  let operatorDisplayName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run" || arg === "--validate-only") {
      dryRun = true;
    } else if (arg === "--file" && i + 1 < args.length) {
      filePath = args[++i];
    } else if (arg === "--source-document" && i + 1 < args.length) {
      sourceDocumentPath = args[++i];
    } else if (arg === "--operator-id" && i + 1 < args.length) {
      operatorId = args[++i];
    } else if (arg === "--operator-name" && i + 1 < args.length) {
      operatorDisplayName = args[++i];
    } else if (arg && !arg.startsWith("--") && !filePath) {
      filePath = arg;
    }
  }

  ingestJurisprudenceProduction({
    filePath,
    sourceDocumentPath,
    dryRun,
    operatorId,
    operatorDisplayName,
  })
    .then((result) => {
      console.log("JURISPRUDENCE_INGEST_SUCCESS:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("JURISPRUDENCE_INGEST_ERROR:", message);
      process.exit(1);
    });
}
