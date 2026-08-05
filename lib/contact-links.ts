import { siteConfig } from "@/lib/site-config";

export function buildWhatsAppUrl(message: string = siteConfig.contact.whatsapp.defaultMessage): string {
  const url = new URL(`https://wa.me/${siteConfig.contact.whatsapp.e164}`);
  url.searchParams.set("text", message);
  return url.toString();
}

export function buildServiceWhatsAppUrl(serviceTitle: string): string {
  return buildWhatsAppUrl(`Hola, deseo solicitar una evaluación sobre: ${serviceTitle}.`);
}

export function buildConsultationMessage(data: {
  name: string;
  serviceTitle: string;
  jurisdiction: string;
  preferredContactMedium: string;
  description: string;
}): string {
  return `Hola, deseo solicitar una evaluación con BúhoLex.

Nombre: ${data.name}
Servicio de interés: ${data.serviceTitle}
Ciudad: ${data.jurisdiction}
Medio de contacto preferido: ${data.preferredContactMedium === "whatsapp" ? "WhatsApp" : "Correo electrónico"}
Resumen de la consulta: ${data.description}

Declaro haber leído la Política de privacidad.`;
}

export function buildConsultationWhatsAppUrl(data: Parameters<typeof buildConsultationMessage>[0]): string {
  return buildWhatsAppUrl(buildConsultationMessage(data));
}

export function buildConsultationEmailUrl(data: Parameters<typeof buildConsultationMessage>[0]): string {
  const message = buildConsultationMessage(data);
  const url = new URL(`mailto:${siteConfig.contact.email}`);
  url.searchParams.set("subject", `Solicitud de evaluación: ${data.serviceTitle}`);
  url.searchParams.set("body", message);
  return url.toString().replace(/\+/g, "%20");
}
