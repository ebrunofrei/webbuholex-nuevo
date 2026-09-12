"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PublicService } from "@/types/services";

import styles from "./services-experience.module.css";

const CATEGORY_LABELS: Record<string, string> = {
  legal: "Práctica legal y resolución de conflictos",
  buhodoc: "Redacción y estrategia documental",
  thesis: "Investigación y desarrollo académico",
  corporate: "Corporativo y negocios",
  accounting: "Contabilidad y tributación",
  government: "Asuntos gubernamentales",
  engineering: "Ingeniería civil y saneamiento",
  digital: "Soluciones digitales",
};

function getCategoryLabel(service: PublicService): string {
  return CATEGORY_LABELS[service.category] ?? "Servicio profesional";
}

function padIndex(value: number): string {
  return String(value).padStart(2, "0");
}

function getContractCondition(service: PublicService): string {
  if (service.availability === "available") {
    return service.availabilityLabel || "Disponible previa coordinación";
  }

  if (service.availability === "coming_soon") {
    return (
      service.availabilityLabel ||
      "Programación próximamente disponible"
    );
  }

  return service.availabilityLabel || "Requiere evaluación previa";
}

function getTitleClass(title: string): string {
  const length = title.trim().length;

  if (length >= 38) {
    return styles.titleCompact ?? "";
  }

  if (length >= 22) {
    return styles.titleMedium ?? "";
  }

  return styles.titleLarge ?? "";
}

export function ServicesExperience({
  services,
}: {
  services: readonly PublicService[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showIndex, setShowIndex] = useState(false);

  const railItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewAllButtonRef = useRef<HTMLButtonElement | null>(null);

  const total = services.length;
  const selectedService = services[selectedIndex];

  const previousIndex =
    total > 0
      ? selectedIndex === 0
        ? total - 1
        : selectedIndex - 1
      : 0;

  const nextIndex =
    total > 0
      ? selectedIndex === total - 1
        ? 0
        : selectedIndex + 1
      : 0;

  const previousService = services[previousIndex];
  const nextService = services[nextIndex];

  const visibleScope = useMemo(
    () => selectedService?.scope?.slice(0, 4) ?? [],
    [selectedService],
  );

  const selectService = useCallback(
    (index: number) => {
      if (index < 0 || index >= total) return;

      setSelectedIndex(index);
      setShowIndex(false);

      requestAnimationFrame(() => {
        railItemRefs.current[index]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    },
    [total],
  );

  const goPrevious = useCallback(() => {
    if (total <= 1) return;
    selectService(previousIndex);
  }, [previousIndex, selectService, total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    selectService(nextIndex);
  }, [nextIndex, selectService, total]);

  const openIndex = useCallback(() => {
    setShowIndex(true);

    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
  }, []);

  const closeIndex = useCallback(() => {
    setShowIndex(false);

    requestAnimationFrame(() => {
      viewAllButtonRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      if (showIndex) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeIndex();
        }

        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeIndex, goNext, goPrevious, showIndex]);

  if (!selectedService || total === 0) {
    return null;
  }

  const titleClass = getTitleClass(selectedService.title);

  return (
    <section
      className={styles.experience}
      aria-label="Explorador interactivo de servicios"
    >
      <header className={styles.experienceHeader}>
        <div>
          <span className={styles.sectionLabel}>
            EXPLORADOR DE SERVICIOS
          </span>

          <p className={styles.sectionHint}>
            Explore las especialidades sin abandonar esta sección.
          </p>
        </div>

        <div
          className={styles.counter}
          aria-live="polite"
          aria-atomic="true"
        >
          <strong>{padIndex(selectedIndex + 1)}</strong>
          <span>/</span>
          <span>{padIndex(total)}</span>
        </div>
      </header>

      <div className={styles.stageShell}>
        <button
          type="button"
          className={`${styles.stageArrow} ${styles.stageArrowPrevious}`}
          onClick={goPrevious}
          aria-label={
            previousService
              ? `Servicio anterior: ${previousService.title}`
              : "Servicio anterior"
          }
        >
          <span aria-hidden="true">←</span>
        </button>

        <div
          key={selectedService.id}
          className={styles.stage}
        >
          <div className={styles.identityPanel}>
            <div className={styles.identityContent}>
              <span className={styles.category}>
                {getCategoryLabel(selectedService)}
              </span>

              <h2
                className={`${styles.serviceTitle} ${titleClass}`}
              >
                {selectedService.title}
              </h2>

              <p className={styles.summary}>
                {selectedService.summary}
              </p>
            </div>

            <Link
              className={styles.primaryAction}
              href={`/servicios/${selectedService.slug}/`}
            >
              <span>Explorar servicio</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className={styles.detailsPanel}>
            <article className={styles.detailBlock}>
              <span className={styles.detailLabel}>
                ¿PARA QUÉ SIRVE?
              </span>

              <p>
                {selectedService.description ||
                  selectedService.summary}
              </p>
            </article>

            <article className={styles.detailBlock}>
              <span className={styles.detailLabel}>
                ALCANCE INICIAL
              </span>

              {visibleScope.length > 0 ? (
                <ul>
                  {visibleScope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>
                  El alcance específico se determina durante la
                  evaluación del encargo.
                </p>
              )}
            </article>

            <article className={styles.condition}>
              <span className={styles.detailLabel}>
                MODALIDAD
              </span>

              <p>
                {selectedService.modalities?.length
                  ? selectedService.modalities.join(" / ")
                  : "Sujeta a coordinación"}
              </p>
            </article>

            <article className={styles.condition}>
              <span className={styles.detailLabel}>
                CONDICIÓN DE CONTRATACIÓN
              </span>

              <p>{getContractCondition(selectedService)}</p>
            </article>
          </div>
        </div>

        <button
          type="button"
          className={`${styles.stageArrow} ${styles.stageArrowNext}`}
          onClick={goNext}
          aria-label={
            nextService
              ? `Siguiente servicio: ${nextService.title}`
              : "Siguiente servicio"
          }
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className={styles.nextPreview}>
        <span className={styles.nextPreviewLabel}>
          CONTINÚE EXPLORANDO
        </span>

        {nextService ? (
          <button
            type="button"
            onClick={goNext}
            className={styles.nextPreviewButton}
          >
            <span>Siguiente</span>
            <strong>{nextService.title}</strong>
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>

      <nav
        className={styles.rail}
        aria-label="Lista de servicios"
      >
        <div className={styles.railViewport}>
          <div className={styles.railTrack}>
            {services.map((service, index) => {
              const isActive = index === selectedIndex;

              return (
                <button
                  key={service.id}
                  ref={(element) => {
                    railItemRefs.current[index] = element;
                  }}
                  type="button"
                  className={`${styles.railItem} ${
                    isActive ? styles.railItemActive : ""
                  }`}
                  onClick={() => selectService(index)}
                  aria-current={isActive ? "true" : undefined}
                >
                  <span className={styles.railNumber}>
                    {padIndex(index + 1)}
                  </span>

                  <span className={styles.railContent}>
                    <strong>{service.title}</strong>
                    <span>{service.summary}</span>
                  </span>

                  <span
                    className={styles.railArrow}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          ref={viewAllButtonRef}
          type="button"
          className={styles.viewAllButton}
          onClick={openIndex}
          aria-expanded={showIndex}
          aria-haspopup="dialog"
        >
          <span>Ver todos los servicios</span>
          <span aria-hidden="true">＋</span>
        </button>
      </nav>

      {showIndex ? (
        <div
          className={styles.indexOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeIndex();
            }
          }}
        >
          <div
            className={styles.indexPanel}
            role="dialog"
            aria-modal="true"
            aria-label="Todos los servicios"
          >
            <header className={styles.indexHeader}>
              <div>
                <span className={styles.sectionLabel}>
                  ÍNDICE DE SERVICIOS
                </span>

                <h3>Elija directamente una especialidad</h3>
              </div>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeIndex}
                className={styles.closeButton}
                aria-label="Cerrar índice de servicios"
              >
                ×
              </button>
            </header>

            <div className={styles.indexGrid}>
              {services.map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => selectService(index)}
                  className={styles.indexItem}
                >
                  <span>{padIndex(index + 1)}</span>

                  <div>
                    <strong>{service.title}</strong>
                    <small>{getCategoryLabel(service)}</small>
                  </div>

                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}