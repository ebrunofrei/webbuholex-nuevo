"use client";

import { useRef, useState } from "react";
import { HomeScene } from "./home-scene";
import { HomeSceneNavigation } from "./home-scene-navigation";
import type { HomeHeroScene } from "@/types/home";
import styles from "./home-hero-slider.module.css";

export function HomeHeroSlider({ scenes }: { scenes: readonly HomeHeroScene[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef<number | null>(null);
  const lastIndex = scenes.length - 1;
  const select = (index: number) => setActiveIndex(Math.max(0, Math.min(lastIndex, index)));
  const previous = () => setActiveIndex((current) => current === 0 ? lastIndex : current - 1);
  const next = () => setActiveIndex((current) => current === lastIndex ? 0 : current + 1);

  return (
    <section
      className={styles.hero}
      aria-label="Principales rutas de BúhoLex"
      aria-roledescription="carrusel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
        if (event.key === "ArrowRight") { event.preventDefault(); next(); }
        if (event.key === "Home") { event.preventDefault(); select(0); }
        if (event.key === "End") { event.preventDefault(); select(lastIndex); }
      }}
      onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined || Math.abs(start - end) < 48) return;
        if (start > end) next(); else previous();
      }}
    >
      <p className={styles.live} aria-live="polite">Escena {scenes[activeIndex]?.number}: {scenes[activeIndex]?.title}</p>
      <div className={styles.stage} data-scene={scenes[activeIndex]?.id}>
        {scenes[activeIndex] ? <HomeScene scene={scenes[activeIndex]} priority={activeIndex === 0} /> : null}
      </div>
      <div className={styles.controls}>
        <div className={styles.progress} aria-hidden="true"><span style={{ width: `${((activeIndex + 1) / scenes.length) * 100}%` }} /></div>
        <HomeSceneNavigation activeIndex={activeIndex} count={scenes.length} onPrevious={previous} onNext={next} onSelect={select} />
      </div>
    </section>
  );
}
