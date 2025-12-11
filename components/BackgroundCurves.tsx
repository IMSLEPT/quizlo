import React from 'react';

export const BackgroundCurves = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Top Left Curve */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] -translate-x-1/3 -translate-y-1/3">
        <svg viewBox="0 0 500 500" className="w-full h-full text-brand-light opacity-20 animate-in fade-in duration-1000">
          <circle cx="250" cy="250" r="250" fill="currentColor" />
        </svg>
      </div>

      {/* Top Left Inner Curve (Darker/Smaller) */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] -translate-x-1/3 -translate-y-1/3">
        <svg viewBox="0 0 500 500" className="w-full h-full text-brand-light opacity-10 animate-in fade-in duration-1000 delay-100">
           <circle cx="250" cy="250" r="250" fill="currentColor" />
        </svg>
      </div>

      {/* Bottom Right Curve */}
      <div className="absolute bottom-0 right-0 w-[900px] h-[900px] translate-x-1/3 translate-y-1/3">
        <svg viewBox="0 0 500 500" className="w-full h-full text-brand-light opacity-20 animate-in fade-in duration-1000 delay-200">
          <circle cx="250" cy="250" r="250" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
};