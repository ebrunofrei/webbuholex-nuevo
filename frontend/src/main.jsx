import './index.css';  // <-- tus estilos principales
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { NoticiasProvider } from "./context/NoticiasContext";
import { LitisBotChatProvider } from "./context/LitisBotChatContext";
// ...otros providers globales si tienes

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <NoticiasProvider>
        <LitisBotChatProvider>
          <App />
        </LitisBotChatProvider>
      </NoticiasProvider>
    </AuthProvider>
  </React.StrictMode>
);
