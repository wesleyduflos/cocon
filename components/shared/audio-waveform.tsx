"use client";

import { useEffect, useRef } from "react";

/* =========================================================================
   <AudioWaveform> — visualisation temps reel d'un MediaStream

   32 barres verticales qui pulsent au rythme du son via Web Audio API +
   AnalyserNode. Style inspire des apps de messagerie (WhatsApp, iMessage).

   Performance : utilise requestAnimationFrame + transform scaleY (composite
   layer GPU, pas de reflow). Pas de canvas pour rester accessible et
   themeable.
   ========================================================================= */

interface Props {
  stream: MediaStream | null;
  /** Nombre de barres (default 32). */
  bars?: number;
  /** Hauteur max d'une barre en px (default 56). */
  height?: number;
  /** Couleur des barres (default safran gradient). */
  color?: string;
}

export function AudioWaveform({
  stream,
  bars = 32,
  height = 56,
  color = "linear-gradient(180deg, #FFC845, #FF6B24)",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !containerRef.current) return;

    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
    if (!AudioCtx) return;

    const audioCtx = new AudioCtx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    // Indices répartis sur la plage de fréquences (low → high) pour avoir
    // une waveform symétrique et expressive.
    const indices: number[] = [];
    const step = Math.floor(analyser.frequencyBinCount / bars);
    for (let i = 0; i < bars; i++) indices.push(i * step);

    const barElements = Array.from(
      containerRef.current.querySelectorAll<HTMLDivElement>("[data-bar]"),
    );

    function tick() {
      analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        const raw = data[indices[i]] / 255; // 0 → 1
        // Courbe en cloche pour rendre les fréquences extrêmes moins
        // dominantes visuellement.
        const distFromCenter = Math.abs(i - bars / 2) / (bars / 2);
        const weight = 1 - distFromCenter * 0.4;
        const scaled = Math.max(0.08, raw * weight);
        const bar = barElements[i];
        if (bar) bar.style.transform = `scaleY(${scaled})`;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream, bars]);

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center gap-[2px] w-full"
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          data-bar
          className="w-1 rounded-full origin-center transition-transform duration-75"
          style={{
            height: `${height}px`,
            background: color,
            transform: "scaleY(0.08)",
          }}
        />
      ))}
    </div>
  );
}
