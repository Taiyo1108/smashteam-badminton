"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function BgmPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Initialize Audio client-side
  useEffect(() => {
    const bgmUrl = process.env.NEXT_PUBLIC_BGM_URL || "https://assets.codepen.io/25868/synthwave-loop.mp3";
    
    // Create audio object asynchronously on the client
    const audio = new Audio(bgmUrl);
    audio.loop = true;
    audio.volume = 0; // Start at 0 for fade-in
    audioRef.current = audio;

    // First interaction listener to autoplay
    const handleFirstInteraction = () => {
      setHasInteracted(true);
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

      // Cleanup event listeners
      cleanupListeners();
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
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Play / Pause Toggle handler
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering any window click handler
    
    if (!audioRef.current) return;
    
    // If it's the very first interaction and it hasn't played yet
    if (!hasInteracted) {
      setHasInteracted(true);
    }

    if (isPlaying) {
      setIsPlaying(false);
      // Fade out to 0 and pause
      fadeVolume(0, 800);
    } else {
      setIsPlaying(true);
      audioRef.current.play()
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
        className="w-12 h-12 rounded-full flex items-center justify-center bg-smash-dark border-2 border-smash-violet text-smash-violet shadow-[0_0_15px_rgba(157,78,221,0.6)] hover:shadow-[0_0_25px_rgba(157,78,221,0.9)] hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
        aria-label={isPlaying ? "Mute Background Music" : "Play Background Music"}
        title={isPlaying ? "Tắt nhạc nền" : "Bật nhạc nền"}
      >
        {isPlaying ? (
          <div className="flex items-center justify-center gap-[3px]">
            <Volume2 className="w-5 h-5 animate-pulse" />
            {/* Visual audio soundwaves bar animation */}
            <div className="flex items-end gap-[1.5px] h-3">
              <span className="w-[1.5px] h-1 bg-smash-violet rounded-full animate-soundwave-1" />
              <span className="w-[1.5px] h-1 bg-smash-violet rounded-full animate-soundwave-2" />
              <span className="w-[1.5px] h-1 bg-smash-violet rounded-full animate-soundwave-3" />
            </div>
          </div>
        ) : (
          <VolumeX className="w-5 h-5 text-slate-400" />
        )}
      </button>
    </div>
  );
}
