import BubbleProvider from "@/components/litisbot/chat/bubble/BubbleProvider";
import { useAuth } from "@/context/AuthContext";
import { useMembership } from "@/hooks/useMembership";
import { Navigate, useLocation } from "react-router-dom";

export default function BubblePage() {
  const { user, loading } = useAuth();
  const membership = useMembership();
  const location = useLocation();

  // Hooks ya corrieron; ahora sí puedes decidir render.
  if (loading) return null;

  if (!user?.uid) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <BubbleProvider
      usuarioId={user.uid}
      pro={Boolean(membership?.isPro)}
      jurisSeleccionada={null}
    />
  );
}
