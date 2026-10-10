export interface OpenAIHermesConfig {
  readonly apiKey: string;
  readonly jurisprudenceModel: string;
  readonly owlModel?: string;
  readonly timeoutMs: number;
}
