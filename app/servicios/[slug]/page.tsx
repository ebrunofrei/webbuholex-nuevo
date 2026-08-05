import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceDetail } from "@/components/services/service-detail";
import { getPublicServiceBySlug, publicServices } from "@/data/services";
import { createPageMetadata } from "@/lib/metadata";

export function generateStaticParams() {
  return publicServices.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getPublicServiceBySlug(slug);
  return service ? createPageMetadata(service.title, service.summary, `/servicios/${service.slug}/`) : {};
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getPublicServiceBySlug(slug);
  if (!service) notFound();
  return <ServiceDetail service={service} />;
}
