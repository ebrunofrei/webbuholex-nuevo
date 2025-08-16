import { FaLanguage, FaGavel, FaFileAlt, FaMicrophone, FaCalendar, FaBell, FaVolumeUp } from "react-icons/fa";
import { BiSolidTranslate } from "react-icons/bi";

export const HERRAMIENTAS_CHAT = [
  {
    key: "multilingue",
    nombre: "Multilingüe",
    descripcion: "Consulta y responde en cualquier idioma.",
    icon: FaLanguage,
    plan: "básico"
  },
  {
    key: "audiencia",
    nombre: "Modo Audiencia",
    descripcion: "Modo abogado en audiencia.",
    icon: FaGavel,
    plan: "pro"
  },
  {
    key: "analizar_archivo",
    nombre: "Analizar archivo",
    descripcion: "Sube y analiza PDF o Word.",
    icon: FaFileAlt,
    plan: "básico"
  },
  {
    key: "traducir",
    nombre: "Traducir",
    descripcion: "Traduce la consulta o respuesta.",
    icon: BiSolidTranslate,
    plan: "pro"
  },
  {
    key: "agenda",
    nombre: "Agenda",
    descripcion: "Gestiona plazos y recordatorios.",
    icon: FaCalendar,
    plan: "pro"
  },
  {
    key: "recordatorios",
    nombre: "Recordatorios",
    descripcion: "Activa alertas y plazos.",
    icon: FaBell,
    plan: "pro"
  },
  {
    key: "voz",
    nombre: "Dictado por voz",
    descripcion: "Dicta tu consulta por voz.",
    icon: FaMicrophone,
    plan: "básico"
  },
  {
    key: "parlante",
    nombre: "Responder con voz",
    descripcion: "LitisBot lee la respuesta.",
    icon: FaVolumeUp,
    plan: "básico"
  }
];
