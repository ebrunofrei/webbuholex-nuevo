import type { NavigationItem } from "@/types/navigation";

export const publicNavigation: readonly NavigationItem[] = [
  { id: "home", label: "Inicio", href: "/", accessLevel: "public", visibility: "visible", icon: "home", activeMatch: "exact" },
  { id: "services", label: "Servicios", href: "/servicios/", accessLevel: "public", visibility: "visible", icon: "services", activeMatch: "prefix" },
  { id: "about", label: "Nosotros", href: "/nosotros/", accessLevel: "public", visibility: "visible", icon: "explore", activeMatch: "prefix" },
  { id: "professional-consultation", label: "Consulta profesional", href: "/consulta-profesional/", accessLevel: "public", visibility: "visible", icon: "contact", activeMatch: "prefix" },
  { id: "jurisprudence", label: "Jurisprudencia", href: "/jurisprudencia/", accessLevel: "public", visibility: "visible", icon: "jurisprudence", activeMatch: "prefix" },
  { id: "tools", label: "Asistente", href: "/asistente/", accessLevel: "public", visibility: "visible", icon: "tools", activeMatch: "prefix" },
  { id: "contact", label: "Contacto", href: "/contacto/", accessLevel: "public", visibility: "visible", icon: "contact", activeMatch: "prefix" },
  { id: "legislation", label: "Legislación", href: "/codigos/", accessLevel: "public", visibility: "hidden", icon: "legislation", activeMatch: "prefix" },
  { id: "manuals", label: "Manuales", href: "/biblioteca/", accessLevel: "public", visibility: "hidden", icon: "manuals", activeMatch: "prefix" },
  { id: "templates", label: "Plantillas", href: "/plantillas/", accessLevel: "public", visibility: "hidden", icon: "templates", activeMatch: "prefix" },
] as const;

export const authNavigation: readonly NavigationItem[] = [
  { id: "public-return", label: "Volver a información pública", href: "/", accessLevel: "anonymous_only", visibility: "visible", icon: "home", activeMatch: "exact" },
] as const;

export const workspaceNavigation: readonly NavigationItem[] = [
  { id: "workspace-home", label: "Inicio", href: "/app/", accessLevel: "authenticated", visibility: "visible", icon: "home", activeMatch: "exact" },
  { id: "workspace-assistant", label: "Asistente", href: "/app/asistente/", accessLevel: "authenticated", visibility: "visible", icon: "assistant", activeMatch: "prefix" },
  { id: "workspace-projects", label: "Proyectos", href: "/app/proyectos/", accessLevel: "authenticated", visibility: "visible", icon: "projects", activeMatch: "prefix" },
  { id: "workspace-jurisprudence", label: "Jurisprudencia asistida", href: "/app/jurisprudencia/", accessLevel: "premium", visibility: "reserved", icon: "jurisprudence", activeMatch: "prefix" },
  { id: "workspace-documents", label: "Documentos", href: "/app/documentos/", accessLevel: "authenticated", visibility: "reserved", icon: "documents", activeMatch: "prefix" },
  { id: "workspace-automation", label: "Automatizaciones", href: "/app/automatizaciones/", accessLevel: "premium", visibility: "reserved", icon: "automation", activeMatch: "prefix" },
  { id: "workspace-library", label: "Biblioteca", href: "/app/biblioteca/", accessLevel: "authenticated", visibility: "reserved", icon: "library", activeMatch: "prefix" },
  { id: "workspace-products", label: "Productos", href: "/app/productos/", accessLevel: "authenticated", visibility: "reserved", icon: "products", activeMatch: "prefix" },
  { id: "workspace-services", label: "Servicios", href: "/app/servicios/", accessLevel: "authenticated", visibility: "reserved", icon: "services", activeMatch: "prefix" },
  { id: "workspace-complaints", label: "Reclamos", href: "/app/reclamos", accessLevel: "authenticated", visibility: "visible", icon: "tools", activeMatch: "prefix", requiredCapability: "complaints:read" },
  { id: "workspace-account", label: "Cuenta", href: "/app/cuenta/", accessLevel: "authenticated", visibility: "reserved", icon: "account", activeMatch: "prefix" },
] as const;
