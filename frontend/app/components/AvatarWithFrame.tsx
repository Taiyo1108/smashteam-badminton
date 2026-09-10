import Image from 'next/image';
import { getShortName } from '@/app/utils/rank';

interface AvatarWithFrameProps {
  avatarUrl: string;
  frameStyle: string | null;
  sizeClass?: string; // e.g. "w-24 h-24"
  alt?: string;
}

export default function AvatarWithFrame({ 
  avatarUrl, 
  frameStyle, 
  sizeClass = "w-24 h-24", 
  alt = "User avatar" 
}: AvatarWithFrameProps) {
  
  let borderStyle = "border-2 border-primary/20";
  let decoratorSvg = null;

  if (frameStyle === "silver-neon") {
    // Silver neon decorative frame
    borderStyle = "border-2 border-slate-300 shadow-[0_0_16px_rgba(203,213,225,0.7)]";
    decoratorSvg = (
      <div className="absolute -inset-2.5 pointer-events-none z-20" aria-hidden="true">
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '14s' }}>
          <circle cx="50" cy="50" r="47" fill="none" stroke="url(#silverGrad)" strokeWidth="2.5" strokeDasharray="30 15 10 15" />
          <defs>
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.9" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  } else if (frameStyle === "purple-glowing") {
    // Purple glowing decorative frame
    borderStyle = "border-2 border-purple-500 shadow-[0_0_22px_rgba(157,78,221,0.85)]";
    decoratorSvg = (
      <div className="absolute -inset-3 pointer-events-none z-20" aria-hidden="true">
        <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#purpleGrad)" strokeWidth="3" strokeDasharray="24 12 36 12" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="#d8b4fe" strokeWidth="1" strokeOpacity="0.6" />
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#9d4edd" />
              <stop offset="100%" stopColor="#7a22e0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  } else if (frameStyle === "gold-dragon" || frameStyle === "gold-champion") {
    // Gold champion frame
    borderStyle = "border-2 border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.8)]";
    decoratorSvg = (
      <div className="absolute -inset-3 pointer-events-none z-20" aria-hidden="true">
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '18s' }}>
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#goldGrad)" strokeWidth="3" strokeDasharray="25 15 20 15" />
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  return (
    <div className={`relative ${sizeClass} aspect-square flex items-center justify-center shrink-0`}>
      {/* Decorative absolute SVG border */}
      {decoratorSvg}
      
      {/* Avatar image container */}
      <div className={`w-full h-full rounded-full overflow-hidden relative z-10 ${borderStyle} bg-secondary flex items-center justify-center transition-transform`}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={alt}
            fill
            sizes="96px"
            className="object-cover"
            priority
          />
        ) : (
          <div className="text-white font-black uppercase select-none px-1 text-center truncate max-w-full">
            <span className={getShortName(alt).length > 2 ? "text-xs sm:text-sm" : "text-base sm:text-lg"}>
              {getShortName(alt) || "U"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
