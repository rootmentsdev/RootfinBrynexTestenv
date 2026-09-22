import React from 'react';
import rootfinRoundLogo from '../assets/rootfin-round-logo.png';
import rootfinLogo from '../assets/rootfin-logo.png';

const LoadingScreen = ({
  fullScreen = true,
  title = "ROOTFIN",
  subtitle = "BRYNEX FINANCIAL SOFTWARE",
  logoSrc = rootfinRoundLogo
}) => {
  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-[9999]' : 'w-full h-full min-h-[400px]'
      } bg-black flex flex-col items-center justify-center p-6 text-white font-sans select-none overflow-hidden transition-all duration-300`}>

      {/* Keyframe animations */}
      <style>{`
        @keyframes logoShake {
          0%, 60%, 100% {
            transform: rotate(0deg) translateX(0);
          }
          6% {
            transform: rotate(-3deg) translateX(-3px);
          }
          12% {
            transform: rotate(3deg) translateX(3px);
          }
          18% {
            transform: rotate(-2deg) translateX(-2px);
          }
          24% {
            transform: rotate(2deg) translateX(2px);
          }
          30% {
            transform: rotate(-1deg) translateX(-1px);
          }
          36% {
            transform: rotate(1deg) translateX(1px);
          }
          42% {
            transform: rotate(0deg) translateX(0);
          }
        }
      `}</style>

      {/* Central Round Logo with Shake Animation */}
      <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center mb-8">
        <img
          src={logoSrc}
          alt="RootFin"
          className="w-full h-full object-contain rounded-full select-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          style={{ animation: 'logoShake 2s ease-in-out infinite' }}
        />
      </div>

      {/* RootFin Logo Image Writing */}
      <div className="flex items-center justify-center">
        <img
          src={rootfinLogo}
          alt="RootFin"
          className="h-8 sm:h-9 w-auto object-contain select-none drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
        />
      </div>

      {/* Subtitle with increased spacing */}
      {subtitle && (
        <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.35em] text-zinc-400 uppercase mt-7 sm:mt-8 opacity-85">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;
