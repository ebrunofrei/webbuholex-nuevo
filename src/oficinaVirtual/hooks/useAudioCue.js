// src/hooks/useAudioCue.js
export function playCue(src, volume = 0.5) {
  try {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play();
  } catch {}
}
