import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <div className="text-4xl font-bold tracking-tighter text-white flex items-center">
        <div className="relative w-8 h-10 flex items-center justify-center mr-1">
          {/* Geometric U with integrated arrow */}
          <svg viewBox="0 0 100 120" className="w-full h-full fill-current">
            <path d="M20 0 V80 Q20 100 50 100 Q80 100 80 80 V0 H65 V80 Q65 85 50 85 Q35 85 35 80 V0 Z" />
            <path d="M42 50 L50 40 L58 50 M50 40 V70" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span>PDATE</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#CCCCCC]/80 mt-1">
        No metrics. No trackers. Just updates.
      </div>
    </div>
  );
};
