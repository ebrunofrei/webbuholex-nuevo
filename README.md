# 🦉 BúhoLex Frontend (React + Vite + Tailwind)

Interfaz web profesional del proyecto **BúhoLex**, plataforma legal inteligente que integra IA (LitisBot), jurisprudencia, códigos legales, biblioteca digital, servicios para abogados y más.

> 🎯 Diseñado para ser rápido, responsive, accesible y fácil de mantener.

---

## 🧩 Tecnologías utilizadas

- **React** 18+
- **Vite** como bundler ultrarrápido
- **Tailwind CSS** para estilos modernos
- **Firebase Auth y Firestore** (opcional)
- **Framer Motion** para animaciones
- **React Router DOM** para navegación
- **OpenAI GPT-4o** vía backend
- **Vercel Hosting**

---

## 📂 Estructura del proyecto

frontend/
├── src/
│ ├── components/ # Componentes UI y funcionales (noticias, modales, sliders, etc.)
│ ├── context/ # Contextos globales (auth, noticias, chatbot, etc.)
│ ├── pages/ # Páginas públicas y privadas
│ ├── services/ # Servicios: Firebase, APIs, herramientas legales
│ ├── assets/ # Imágenes, logos, íconos
│ ├── App.jsx # Enrutador principal
│ └── main.jsx # Punto de entrada
├── public/
│ └── index.html
├── .env # Variables de entorno (⚠️ no subir a Git)
├── tailwind.config.js # Configuración de Tailwind
├── vite.config.js # Configuración del bundler
└── README.md # Este archivo


---

## 🧪 Scripts útiles

```bash
# Instalación
npm install

# Desarrollo local
npm run dev

# Build para producción
npm run build

# Vista previa de producción
npm run preview

🌐 Variables de entorno (ejemplo .env)
VITE_OPENAI_API_PROXY=/api/ia-litisbotchat
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

📦 Funcionalidades destacadas

🔍 Consulta legal inteligente con LitisBot

📰 Noticias jurídicas automatizadas con RSS

📚 Biblioteca virtual y control de acceso

⚖️ Códigos y jurisprudencia clasificadas

🧑‍💼 Oficina Virtual para Abogados con gestión de expedientes

🔐 Autenticación con Firebase o integración con correo institucional

📱 100% responsive para móviles, tablets y desktop

☁️ Despliegue automático con GitHub + Vercel

📄 Licencia

Este proyecto forma parte del sistema BúhoLex creado por Eduardo Frei Bruno Gómez,
todos los derechos reservados © 2025.

📬 Contacto

📧 eduardofreib@gmail.com
🌐 buholex.com
📱 +51 922 038 280