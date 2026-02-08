import { REGIMENES_LABORALES } from "./regimenes";

import { calcularLiquidacionPrivada728 } from "./calculoPrivado728";
import { calcularLiquidacionPublico276 } from "./calculoPublico276";
import { calcularLiquidacionCAS1057 } from "./calculoCAS1057";

export function calcularLiquidacion(payload) {
  switch (payload.regimen) {
    case REGIMENES_LABORALES.PRIVADO_728:
      return calcularLiquidacionPrivada728(payload);

    case REGIMENES_LABORALES.PUBLICO_276:
      return calcularLiquidacionPublico276(payload);

    case REGIMENES_LABORALES.CAS_1057:
      return calcularLiquidacionCAS1057(payload);

    default:
      return { error: "Régimen laboral no implementado." };
  }
}
