import 'dotenv/config';

const REQUIRED_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "FIREBASE_SERVICE_ACCOUNT"  // backend
];

const OPTIONAL_VARS = [
  "OPENAI_API_KEY",
  "TWILIO_SID",
  "TWILIO_TOKEN",
  "TWILIO_WHATSAPP_NUMBER"
];

let missing = [];
let found = {};

// Revisión de obligatorias
for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    missing.push(key);
  } else {
    const value = process.env[key];
    found[key] = value.length > 15 ? value.slice(0, 8) + "...(truncado)" : value;
  }
}

// Revisión de opcionales (solo las mostramos si existen)
for (const key of OPTIONAL_VARS) {
  if (process.env[key]) {
    const value = process.env[key];
    found[key] = value.length > 15 ? value.slice(0, 8) + "...(truncado)" : value;
  }
}

if (missing.length) {
  console.error("❌ Variables de entorno obligatorias faltantes:");
  missing.forEach(v => console.error(" -", v));
  process.exit(1);
} else {
  console.log("✅ Todas las variables obligatorias están definidas correctamente.\n");
  console.log("📋 Resumen de variables encontradas:");
  Object.entries(found).forEach(([k, v]) => {
    console.log(` - ${k} = ${v}`);
  });
  process.exit(0);
}
