// routes/forense.routes.js
import express from "express";
import multer from "multer";
import { forensicUploadController } from "../services/forense/forensicUploadController.js";
import { implicitConsent } from "../middlewares/implicitConsent.js";
import { withTelemetry } from "../middlewares/telemetry.js";

const router = express.Router();

// almacenamiento temporal (Railway friendly)
const upload = multer({
  dest: "/tmp",
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5 GB
  },
});

router.post(
  "/upload",
  implicitConsent,
  upload.single("file"),
  withTelemetry(forensicUploadController)
);

export default router;
