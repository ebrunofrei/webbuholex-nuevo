import "server-only";
import { jurisprudencePublicSlugSchema } from "@/lib/schemas/jurisprudence-public-search-gateway";
import {
  PostgresJurisprudencePublicReadRepository,
  type JurisprudenceCanonicalRecordReference,
} from "@/lib/jurisprudence/postgres-jurisprudence-public-read-repository";

export type { JurisprudenceCanonicalRecordReference };

export type ResolveCanonicalRecordBySlugResult =
  | {
      readonly ok: true;
      readonly value: JurisprudenceCanonicalRecordReference;
    }
  | {
      readonly ok: false;
      readonly code: "not_found" | "invalid_slug";
    };

export interface JurisprudencePublicSlugResolverGateway {
  findCanonicalReferenceBySlug(
    slug: string
  ): Promise<JurisprudenceCanonicalRecordReference | null>;
}

export interface JurisprudencePublicSlugResolverDependencies {
  readonly repository?: JurisprudencePublicSlugResolverGateway | undefined;
}

export class JurisprudencePublicSlugResolver {
  readonly #repository: JurisprudencePublicSlugResolverGateway;

  constructor(deps?: JurisprudencePublicSlugResolverDependencies) {
    this.#repository =
      deps?.repository ?? new PostgresJurisprudencePublicReadRepository();
  }

  async resolveByPublicSlug(
    slug: unknown
  ): Promise<ResolveCanonicalRecordBySlugResult> {
    const parsed = jurisprudencePublicSlugSchema.safeParse(slug);
    if (!parsed.success) {
      return { ok: false, code: "invalid_slug" };
    }

    const ref = await this.#repository.findCanonicalReferenceBySlug(parsed.data);
    if (!ref) {
      return { ok: false, code: "not_found" };
    }

    return {
      ok: true,
      value: {
        recordId: ref.recordId,
        recordVersion: ref.recordVersion,
      },
    };
  }
}

export async function resolveJurisprudenceCanonicalRecordBySlug(
  slug: unknown,
  deps?: JurisprudencePublicSlugResolverDependencies
): Promise<ResolveCanonicalRecordBySlugResult> {
  const resolver = new JurisprudencePublicSlugResolver(deps);
  return resolver.resolveByPublicSlug(slug);
}
