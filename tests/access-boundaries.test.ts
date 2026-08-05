import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { accessBoundaries, cookieCategories } from "@/data/access-boundaries";
import { futureAnalyticsEvents } from "@/data/analytics-events";
import { rentalHousingContract } from "@/data/template-catalog";

describe("fronteras de acceso", () => {
  it("distingue público, cuenta gratuita futura y premium futuro", () => {
    expect(accessBoundaries).toHaveLength(3);
    expect(accessBoundaries[0]).toMatchObject({ id: "public", loginRequired: false, paymentRequired: false, status: "available" });
    expect(accessBoundaries[1]).toMatchObject({ id: "future_account", loginRequired: true, paymentRequired: false, status: "planned" });
    expect(accessBoundaries[2]).toMatchObject({ id: "future_premium", loginRequired: true, paymentRequired: true, status: "planned" });
  });

  it("mantiene desactivadas las cookies no necesarias", () => {
    expect(cookieCategories.find((category) => category.id === "necessary")?.enabled).toBe(true);
    expect(cookieCategories.filter((category) => category.id !== "necessary").every((category) => !category.enabled && category.requiresConsent)).toBe(true);
  });

  it("solo modela eventos y prohíbe contenido de consultas jurídicas", () => {
    expect(futureAnalyticsEvents).toHaveLength(23);
    expect(futureAnalyticsEvents.every((event) => event.status === "modeled_only" && !event.sendsToThirdParties && !event.permitsLegalQueryContent)).toBe(true);
  });

  it("no introduce rastreadores ni raíces paralelas", () => {
    const sources = ["app/layout.tsx", "app/page.tsx", "components/portal/dual-portal.tsx", "data/analytics-events.ts"].map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources).not.toMatch(/GoogleAnalytics|gtag\(|Meta Pixel|fbq\(|createRoot|ReactDOM|import\.meta\.env|serviceWorker|pushClient|FCM/);
  });

  it("preserva el estado comercial del producto", () => {
    expect(rentalHousingContract.editorialStatus).toBe("approved");
    expect(rentalHousingContract.availabilityStatus).toBe("editorial_preview");
    expect(rentalHousingContract.price).toBeNull();
    expect(rentalHousingContract.currency).toBeNull();
    expect(rentalHousingContract.licenseStatus).toBe("pending");
    expect(rentalHousingContract.publicationAuthorization.authorized).toBe(false);
  });
});
