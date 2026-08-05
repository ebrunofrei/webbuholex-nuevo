import styles from "./home-hero-slider.module.css";

export function HomeSceneNavigation({ activeIndex, count, onPrevious, onNext, onSelect }: { activeIndex: number; count: number; onPrevious: () => void; onNext: () => void; onSelect: (index: number) => void }) {
  return (
    <div className={styles.navigation} aria-label="Navegación de escenas">
      <button type="button" onClick={onPrevious} aria-label="Escena anterior">←</button>
      <div className={styles.indicators}>
        {Array.from({ length: count }, (_, index) => (
          <button key={index} type="button" onClick={() => onSelect(index)} aria-label={`Ir a la escena ${String(index + 1).padStart(2, "0")}`} aria-current={index === activeIndex ? "true" : undefined}>
            {String(index + 1).padStart(2, "0")}
          </button>
        ))}
      </div>
      <button type="button" onClick={onNext} aria-label="Escena siguiente">→</button>
    </div>
  );
}
