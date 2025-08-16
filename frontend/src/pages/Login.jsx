import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { abrirModalLogin } = useAuth();
  return (
    <div className="text-center p-10">
      <button
        onClick={abrirModalLogin}
        className="bg-[#a52e00] text-white px-4 py-2 rounded shadow"
      >
        Iniciar sesión
      </button>
    </div>
  );
}
