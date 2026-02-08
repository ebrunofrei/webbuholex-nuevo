import express from "express";
import { interpretTool } from "../services/tools/interpretService.js";
import { withTelemetry } from "../middlewares/telemetry.js";
import { softRateLimit } from "../middlewares/softRateLimit.js";
import { implicitConsent } from "../middlewares/implicitConsent.js";

const router = express.Router();

router.post("/interpret",
    implicitConsent,
    softRateLimit({ perMinute: 30 }),
    withTelemetry(interpretTool)
);

export default router;
