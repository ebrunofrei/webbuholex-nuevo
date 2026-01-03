import { Outlet } from "react-router-dom";

export default function ChatProLayout() {
  return (
    <div className="w-full h-[100dvh] bg-white">
      <Outlet />
    </div>
  );
}
