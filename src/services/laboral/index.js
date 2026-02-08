import { REGIMENES_LABORALES } from "./regimenes";
import { calcularLiquidacionPrivada728 } from "./calculoPrivado728";
import { calcularLiquidacionPublico276 } from "./calculoPublico276";

export function calcularLiquidacion(payload) {
  const { regimen } = payload;

  switch (regimen) {
    case REGIMENES_LABORALES.PRIVADO_728:
      return calcularLiquidacionPrivada728(payload);

    case REGIMENES_LABORALES.PUBLICO_276:
      return calcularLiquidacionPublico276(payload);

    default:
      return {
        error: "Régimen laboral no soportado",
      };
  }
}
