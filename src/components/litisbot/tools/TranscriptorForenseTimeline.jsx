import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

export default function TranscriptorForenseTimeline({
  audioUrl,
  segments = [],
  autoScrollDefault = true,
}) {
  const audioRef = useRef(null);
  const rowRefs = useRef(new Map());

  const [activeIndex, setActiveIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(autoScrollDefault);

  // Normaliza segmentos (por si vienen sin index)
  const safeSegments = useMemo(() => {
    const arr = Array.isArray(segments) ? segments : [];
    return arr
      .map((s, i) => ({
        index: Number.isFinite(s.index) ? s.index : i,
        start: Number(s.start ?? 0),
        end: Number(s.end ?? 0),
        text: String(s.text ?? "").trim(),
      }))
      .filter((s) => s.text.length > 0)
      .sort((a, b) => a.start - b.start);
  }, [segments]);

  const formatTime = (sec = 0) => {
    const s = Math.max(0, Number(sec) || 0);
    const mm = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const seekTo = useCallback((seconds) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Number(seconds) || 0);
    // play() puede fallar si el navegador bloquea autoplay; lo ignoramos
    a.play?.().catch(() => {});
  }, []);

  // Encuentra el segmento activo por currentTime
  const findActiveIndex = useCallback(
    (t) => {
      if (!safeSegments.length) return -1;

      // EPS: tolerancia para que el borde no “titile”
      const EPS = 0.06; // ~60ms
      for (let i = 0; i < safeSegments.length; i++) {
        const seg = safeSegments[i];
        const start = seg.start - EPS;
        const end = (seg.end || seg.start) + EPS;
        if (t >= start && t <= end) return i;
      }

      // si cae entre segmentos, mantenemos el último que empezó antes
      let last = -1;
      for (let i = 0; i < safeSegments.length; i++) {
        if (t >= safeSegments[i].start) last = i;
        else break;
      }
      return last;
    },
    [safeSegments]
  );

  // Listener: timeupdate → update active
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => {
      const t = a.currentTime || 0;
      const idx = findActiveIndex(t);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("seeked", onTime);
    a.addEventListener("loadedmetadata", onTime);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("seeked", onTime);
      a.removeEventListener("loadedmetadata", onTime);
    };
  }, [findActiveIndex]);

  // Autoscroll al segmento activo
  useEffect(() => {
    if (!autoScroll) return;
    if (activeIndex < 0) return;

    const seg = safeSegments[activeIndex];
    if (!seg) return;

    const el = rowRefs.current.get(seg.index);
    if (!el) return;

    // scroll suave y centrado
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex, autoScroll, safeSegments]);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
      {/* 🎧 AUDIO */}
      <div className="w-full">
        <audio ref={audioRef} controls className="w-full" src={audioUrl} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs opacity-70">
          Segmentos: <span className="font-medium">{safeSegments.length}</span>
        </div>

        <button
          type="button"
          onClick={() => setAutoScroll((v) => !v)}
          className="
            text-xs px-3 py-1 rounded-full border
            hover:opacity-90
            border-black/15
            dark:border-white/15
          "
          title="Auto-seguimiento del playback"
        >
          {autoScroll ? "Auto-scroll: ON" : "Auto-scroll: OFF"}
        </button>
      </div>

      {/* 🕒 TIMELINE */}
      <div
        className="
          border rounded-xl overflow-hidden
          bg-white dark:bg-neutral-900
          border-black/10 dark:border-white/10
        "
        style={{ maxHeight: "55vh" }} // ✅ scroll interno “media página”
      >
        {safeSegments.length === 0 && (
          <div className="p-4 text-sm opacity-70">
            No hay segmentos para mostrar.
          </div>
        )}

        <div className="divide-y divide-black/10 dark:divide-white/10">
          {safeSegments.map((seg, i) => {
            const isActive = i === activeIndex;

            return (
              <div
                key={seg.index}
                ref={(el) => {
                  if (!el) return;
                  rowRefs.current.set(seg.index, el);
                }}
                onClick={() => seekTo(seg.start)}
                className={[
                  "flex gap-4 p-3 cursor-pointer",
                  "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                  isActive
                    ? "bg-[#F7F1EC] border-l-4 border-[#5C2E0B]"
                    : "border-l-4 border-transparent",
                ].join(" ")}
              >
                {/* tiempo */}
                <div className="text-xs font-mono opacity-70 min-w-[70px]">
                  {formatTime(seg.start)}
                  {seg.end ? (
                    <div className="opacity-50">{formatTime(seg.end)}</div>
                  ) : null}
                </div>

                {/* texto */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {seg.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer mini */}
      <div className="text-[11px] opacity-60">
        Tip: clic en cualquier segmento para saltar al tiempo exacto.
      </div>
    </div>
  );
}
