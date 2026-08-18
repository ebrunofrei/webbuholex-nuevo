import type { Metadata } from "next";
import { JurisprudencePublicDetail } from "@/components/jurisprudence/jurisprudence-public-detail";
import { createPageMetadata } from "@/lib/metadata";
import { getJurisprudencePublicBySlugAction } from "@/lib/jurisprudence/postgres-jurisprudence-public-actions";

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return createPageMetadata(
    "Detalle jurisprudencial",
    "Consulta estructurada de resolución jurisprudencial incorporada al catálogo público de BúhoLex.",
    `/jurisprudencia/${slug}/`,
  );
}

export default async function JurisprudenceDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly slug: string }>;
  readonly searchParams?: Promise<{ readonly [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <JurisprudencePublicDetail
      slug={slug}
      getBySlugAction={getJurisprudencePublicBySlugAction}
      {...(resolvedSearchParams !== undefined ? { rawSearchParams: resolvedSearchParams } : {})}
    />
  );
}
