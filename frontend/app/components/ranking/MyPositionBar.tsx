"use client";

import React from "react";
import { ChevronRight, TrendingUp, TrendingDown, Minus, Sparkles, Target } from "lucide-react";
import { RankedPlayer } from "./types";

interface MyPositionBarProps {
  myPosition: RankedPlayer | null;
  onOpenMyModal: () => void;
}

export default function MyPositionBar({
  myPosition,
  onOpenMyModal
}: MyPositionBarProps) {
  if (!myPosition) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-2xl animate-fade-in-up">
      <div 
        onClick={onOpenMyModal}
        className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-slate-950/90 text-white backdrop-blur-md border border-purple-400/30 shadow-[0_8px_32px_rgba(0,0,0,0.4)] cursor-pointer hover:border-purple-400/60 transition-all group"
      >
        {/* Left: Position & Movement */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
          <div className="flex flex-col items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-purple-600/30 border border-purple-400/40 text-center">
            <span className="text-[9px] uppercase font-bold text-purple-200">Hạng</span>
            {myPosition.isProvisional || !myPosition.rank ? (
              <span className="text-[10px] font-black text-amber-300 leading-tight">
                Vô hạng
              </span>
            ) : (
              <span className="text-base font-black text-white leading-none tabular-nums">
                #{myPosition.rank}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white truncate">
                Vị trí của bạn
              </span>
              {myPosition.isProvisional || !myPosition.rank ? (
                <span className="inline-flex items-center text-[10px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-500/40">
                  Chờ xếp hạng ({myPosition.matches}/3)
                </span>
              ) : (
                <>
                  {myPosition.movement === 'UP' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                      <TrendingUp className="w-3 h-3 mr-0.5" />+{myPosition.rankChange}
                    </span>
                  )}
                  {myPosition.movement === 'DOWN' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-500/40">
                      <TrendingDown className="w-3 h-3 mr-0.5" />{myPosition.rankChange}
                    </span>
                  )}
                  {myPosition.movement === 'NEW' && (
                    <span className="inline-flex items-center text-[10px] font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-500/40">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5" />Mới
                    </span>
                  )}
                  {myPosition.movement === 'SAME' && (
                    <span className="inline-flex items-center text-[10px] font-medium text-slate-400">
                      <Minus className="w-2.5 h-2.5 mr-0.5" />Giữ hạng
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-amber-300 font-bold truncate">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{myPosition.gapCopy}</span>
            </div>
          </div>
        </div>

        {/* Right: ELO & Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-lg font-black text-amber-400 tabular-nums leading-none">
              {myPosition.elo}
            </p>
            <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
              ELO
            </p>
          </div>

          <div className="w-8 h-8 rounded-xl bg-white/10 group-hover:bg-primary text-white flex items-center justify-center transition-colors">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
