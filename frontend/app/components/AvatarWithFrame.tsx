import Image from 'next/image';

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
  
  let borderStyle = "";
  let decoratorSvg = null;

  if (frameStyle === "silver-neon") {
    // Silver neon decorative frame
    borderStyle = "border-2 border-slate-300 shadow-[0_0_15px_rgba(203,213,225,0.7)]";
    decoratorSvg = (
      <div className="absolute -inset-2.5 pointer-events-none z-20">
        <svg className="w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '12s' }}>
          <circle cx="50" cy="50" r="47" fill="none" stroke="url(#silverGrad)" strokeWidth="2.5" strokeDasharray="30 15 10 15" />
          <defs>
            <linearGradient id="silverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  } else if (frameStyle === "purple-glowing") {
    // Purple glowing decorative frame
    borderStyle = "border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)]";
    decoratorSvg = (
      <div className="absolute -inset-3.5 pointer-events-none z-20">
        <svg className="w-full h-full animate-pulse" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="url(#purpleGrad)" strokeWidth="3" strokeDasharray="20 10 40 10" />
          <circle cx="50" cy="50" r="48" fill="none" stroke="#d8b4fe" strokeWidth="1" strokeOpacity="0.5" />
          <defs>
            <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#e879f9" />
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
      <div className={`w-full h-full rounded-full overflow-hidden relative z-10 ${borderStyle} bg-slate-800 flex items-center justify-center`}>
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={alt}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="text-white text-xl font-bold uppercase select-none">
            {alt.charAt(0) || "U"}
          </div>
        )}
      </div>
    </div>
  );
}
