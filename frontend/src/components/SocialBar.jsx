import { useLocation, Link } from "react-router-dom";
import { Home, Folder, BookOpen, Calendar, MessageCircle, Bell, User } from "lucide-react";
import buhoLogo from "../assets/buho-institucional.png";

const menu = [
  { label: "Inicio", icon: <Home />, to: "/oficina" },
  { label: "Expedientes", icon: <Folder />, to: "/oficina/expedientes" },
  { label: "Biblioteca", icon: <BookOpen />, to: "/oficina/biblioteca" },
  { label: "Agenda", icon: <Calendar />, to: "/oficina/agenda" },
  { label: "LitisBot", icon: <MessageCircle />, to: "/oficina/litisbot" },
  { label: "Notificaciones", icon: <Bell />, to: "/oficina/notificaciones" },
  { label: "Mi Perfil", icon: <User />, to: "/oficina/perfil" },
];

export default function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="min-h-screen w-64 bg-white shadow-xl flex flex-col gap-2 p-5 border-r">
      <div className="text-2xl font-extrabold text-[#b03a1a] mb-8">🦉 BúhoLex</div>
      <nav className="flex flex-col gap-1 flex-1">
        {menu.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 rounded-lg font-semibold px-4 py-2 transition ${
              pathname.startsWith(item.to)
                ? "bg-[#b03a1a] text-white shadow"
                : "text-[#b03a1a] hover:bg-[#fff3e6]"
            }`}
          >
            {item.icon} {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 text-xs text-gray-400">
        Oficina Virtual BúhoLex &copy; {new Date().getFullYear()}
      </div>
    </aside>
  );
}
