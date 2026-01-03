import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

export default function OficinaVirtualLayout() {
  return (
    <div className="w-full min-h-screen flex bg-gray-50">
      {/* Sidebar SIEMPRE */}
      <aside className="flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Contenido oficina */}
      <main className="flex-1 min-w-0 p-4">
        <Outlet />
      </main>
    </div>
  );
}
