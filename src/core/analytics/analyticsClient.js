// src/core/analytics/analyticsClient.js

import { env } from "../config/env";
import { events } from "./events";

// 🔒 Analytics desactivado temporalmente
// Se reactivará en Fase de Observabilidad

export const analytics = {
  async track(_name, _props = {}) {
    // noop
  },

  async trackChatMessage(_data) {
    // noop
  },
};
