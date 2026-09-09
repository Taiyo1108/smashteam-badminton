"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const PREF_KEY = "bgm_muted";

export default function BgmPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Target volume for BGM
  const TARGET_VOLUME = 0.35;
  const FADE_DURATION = 1500; // 1.5 seconds

  // Volume Fade Helper
  const fadeVolume = (target: number, duration: number) => {
    if (!audioRef.current) return;
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const audio = audioRef.current;
    const startVolume = audio.volume;
    const intervalMs = 50;
    const steps = duration / intervalMs;
    const volumeStep = (target - startVolume) / steps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const nextVolume = startVolume + (volumeStep * currentStep);

      if (currentStep >= steps) {
        audio.volume = target;
        if (target === 0) {
          audio.pause();
        }
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
      } else {
        // Clamp volume between 0 and 1
        audio.volume = Math.max(0, Math.min(1, nextVolume));
      }
    }, intervalMs);
  };

  // Lazy tạo Audio — chỉ tải MP3 khi user tương tác lần đầu hoặc bấm play
  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const bgmUrl = process.env.NEXT_PUBLIC_BGM_URL || "https://assets.codepen.io/25868/synthwave-loop.mp3";
    const audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0; // Start at 0 for fade-in
    audio.preload = "none";
    audioRef.current = audio;
    return audio;
  };

  // Initialize interaction listener client-side
  useEffect(() => {
    // Tôn trọng lựa chọn tắt nhạc trước đó của user
    let muted = false;
    try {
      muted = localStorage.getItem(PREF_KEY) === "1";
    } catch {}

    // First interaction listener to autoplay (trừ khi user đã tắt)
    const handleFirstInteraction = () => {
      setHasInteracted(true);
      cleanupListeners();
      if (muted) return;

      const audio = ensureAudio();
      setIsPlaying(true);

      // Play audio and fade in
      audio.play()
        .then(() => {
          fadeVolume(TARGET_VOLUME, FADE_DURATION);
        })
        .catch((err) => {
          console.warn("Autoplay block prevented background music playing:", err);
          setIsPlaying(false);
        });
    };

    const cleanupListeners = () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    // Attach interaction listeners
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("pointerdown", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    // Component unmount cleanup
    return () => {
      cleanupListeners();
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play / Pause Toggle handler
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering any window click handler

    // If it's the very first interaction and it hasn't played yet
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    if (isPlaying) {
      setIsPlaying(false);
      try {
        localStorage.setItem(PREF_KEY, "1");
      } catch {}
      // Fade out to 0 and pause
      fadeVolume(0, 800);
    } else {
      const audio = ensureAudio();
      setIsPlaying(true);
      try {
        localStorage.setItem(PREF_KEY, "0");
      } catch {}
      audio.play()
        .then(() => {
          fadeVolume(TARGET_VOLUME, FADE_DURATION);
        })
        .catch((err) => {
          console.error("Failed to play audio:", err);
          setIsPlaying(false);
        });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      <button
        onClick={handleTogglePlay}
        className="w-12 h-12 rounded-full flex items-center justify-center bg-black border border-black/10 text-white shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        aria-label={isPlaying ? "Mute Background Music" : "Play Background Music"}
        title={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền"}
      >
        {isPlaying ? (
          <div className="flex items-center justify-center gap-[3px]">
            <Volume2 className="w-5 h-5 animate-pulse" />
            {/* Visual audio soundwaves bar animation */}
            <div className="flex items-end gap-[2px] h-4">
              <span className="sound-wave-bar" style={{ animationDelay: '0.1s' }} />
              <span className="sound-wave-bar" style={{ animationDelay: '0.4s' }} />
              <span className="sound-wave-bar" style={{ animationDelay: '0.7s' }} />
            </div>
          </div>
        ) : (
          <VolumeX className="w-5 h-5 text-slate-400" />
        )}
      </button>
    </div>
  );
}
