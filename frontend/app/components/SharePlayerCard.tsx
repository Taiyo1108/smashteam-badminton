"use client";

import React, { useRef, useState } from "react";
import { 
  X, Copy, Share2, Download, Check, Loader2, 
  Trophy, Flame, Sparkles, TrendingUp, Crown, Shield 
} from "lucide-react";
import { toPng } from "html-to-image";
import AvatarWithFrame from "./AvatarWithFrame";
import { QRCodeCanvas } from "qrcode.react";

interface SharePlayerCardProps {
  isOpen: boolean;
  onClose: () => void;
  player: {
    id: string;
    full_name: string;
    nickname?: string;
    avatar_url?: string;
    selected_avatar_frame?: string;
    selected_title?: string;
    badminton_level?: string;
    academic_info?: string;
  };
  singles?: any;
  doubles?: any;
  achievements?: any[];
  streak?: any;
  title?: any;
}

export default function SharePlayerCard({
  isOpen,
  onClose,
  player,
  singles,
  doubles,
  achievements = [],
  streak,
  title
}: SharePlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [mode, setMode] = useState<"doubles" | "singles">(
    (doubles?.matches || 0) >= (singles?.matches || 0) ? "doubles" : "singles"
  );

  if (!isOpen) return null;

  const currentStats = mode === "doubles" ? doubles : singles;
  const tier = currentStats?.tier || "Bronze";
  const elo = currentStats?.elo || 1000;
  const peakElo = currentStats?.peakElo || elo;
  const matches = currentStats?.matches || 0;
  const wins = currentStats?.wins || 0;
  const losses = currentStats?.losses || 0;
  const winRate = currentStats?.winRate || 0;
  const rank = currentStats?.rank;
  const percentile = currentStats?.percentile;

  const profileUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/profile`
    : "https://smashteam.vn";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Hồ Sơ VĐV ${player.full_name} | SmashTeam Badminton`,
          text: `Xem hồ sơ thi đấu của ${player.full_name} - ELO ${elo} (${tier}) tại SmashTeam Badminton Club!`,
          url: profileUrl
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Generate crisp image
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#0B0F19"
      });

      const link = document.createElement("a");
      link.download = `SmashTeam_Card_${player.full_name.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export image error:", err);
      alert("Không thể xuất ảnh do lỗi mạng hoặc quyền truy cập. Bạn có thể chụp màn hình trực tiếp thẻ đấu nhé!");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white my-8 flex flex-col items-center">
        
        {/* Header Modal Bar */}
        <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-extrabold text-base tracking-wide uppercase">Thẻ VĐV Chia Sẻ (Flex Card)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector for Share Card */}
        <div className="w-full grid grid-cols-2 p-1 bg-black/40 rounded-xl border border-slate-800 mb-4 text-xs font-bold">
          <button
            onClick={() => setMode("doubles")}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "doubles" ? "bg-white/20 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            THỂ THỨC ĐÔI ({doubles?.elo || 1000})
          </button>
          <button
            onClick={() => setMode("singles")}
            className={`py-1.5 rounded-lg transition-all cursor-pointer ${
              mode === "singles" ? "bg-white/20 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            THỂ THỨC ĐƠN ({singles?.elo || 1000})
          </button>
        </div>

        {/* 1080x1350 RATIO EXPORTABLE CARD (Aspect 4:5) */}
        <div className="w-full flex justify-center overflow-hidden py-2">
          <div
            ref={cardRef}
            className="relative w-full aspect-[4/5] max-w-[380px] rounded-3xl bg-gradient-to-b from-[#0F172A] via-[#090D16] to-[#020617] border-2 border-amber-500/40 p-6 flex flex-col justify-between shadow-2xl overflow-hidden"
            style={{
              boxShadow: "0 0 40px rgba(245, 158, 11, 0.15)"
            }}
          >
            {/* Background Geometric / Badminton Mesh Accents */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Brand Banner */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="font-black text-xs tracking-widest uppercase text-white">SMASH TEAM</span>
                  <p className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">BADMINTON CLUB</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 tracking-wider">
                  {tier.toUpperCase()} TIER
                </span>
              </div>
            </div>

            {/* Center Player Identity */}
            <div className="relative z-10 flex flex-col items-center text-center my-auto">
              <AvatarWithFrame
                avatarUrl={player.avatar_url}
                frameStyle={player.selected_avatar_frame}
                sizeClass="w-24 h-24 mb-3"
                alt={player.full_name}
              />

              <h3 className="text-2xl font-black tracking-wide text-white">
                {player.full_name}
              </h3>

              {player.nickname && (
                <p className="text-xs text-amber-400/90 italic font-semibold mt-0.5">
                  "{player.nickname}"
                </p>
              )}

              {title?.name && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>{title.name}</span>
                </div>
              )}

              {/* Core Elo Display */}
              <div className="mt-4 flex items-center gap-6 px-6 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">ELO {mode === "doubles" ? "ĐÔI" : "ĐƠN"}</span>
                  <p className="text-2xl font-black text-white">{elo}</p>
                </div>

                <div className="w-px h-8 bg-white/10" />

                <div className="text-center">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">KỶ LỤC</span>
                  <p className="text-2xl font-black text-emerald-400">{peakElo}</p>
                </div>

                {percentile && (
                  <>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-center">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">XẾP HẠNG</span>
                      <p className="text-xs font-black text-amber-400 mt-1 uppercase">{percentile}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Battle Records Row */}
              <div className="grid grid-cols-3 gap-3 w-full mt-4 text-center">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Số Trận</span>
                  <p className="text-sm font-black text-white">{matches}</p>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Thắng / Thua</span>
                  <p className="text-sm font-black text-white">
                    <span className="text-emerald-400">{wins}</span> / <span className="text-rose-400">{losses}</span>
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[9px] text-slate-400 uppercase font-bold">Tỉ Lệ Thắng</span>
                  <p className="text-sm font-black text-amber-400">{winRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {/* Bottom Card Footer: QR code and club authentication */}
            <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-wider text-white">SMASHTEAM.VN</p>
                <p className="text-[8px] text-slate-400 uppercase">Hồ sơ thi đấu xác thực</p>
              </div>

              <div className="bg-white p-1 rounded-lg">
                <QRCodeCanvas
                  value={profileUrl}
                  size={36}
                  level="M"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? "Đã chép" : "Chép Link"}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Chia Sẻ</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>{isExporting ? "Đang xuất..." : "Tải Ảnh"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
