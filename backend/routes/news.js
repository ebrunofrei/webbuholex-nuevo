// backend/routes/news.js
import express from "express";
const router = express.Router();

// Datos de ejemplo para noticias
const noticiasGenerales = [
  { id: 1, titulo: "Nueva ley sobre propiedad", fecha: "2025-10-01" },
  { id: 2, titulo: "Reforma en el sistema judicial", fecha: "2025-09-30" },
];

// Ruta para obtener noticias generales
router.get("/noticias", (req, res) => {
  res.json(noticiasGenerales);
});

// Si necesitas una ruta para noticias jurídicas
const noticiasJuridicas = [
  { id: 1, titulo: "Sentencia de la Corte Constitucional", fecha: "2025-09-25" },
  { id: 2, titulo: "Nuevo proyecto de ley penal", fecha: "2025-09-20" },
];

// Ruta para obtener noticias jurídicas
router.get("/noticias-juridicas", (req, res) => {
  res.json(noticiasJuridicas);
});

export default router;
