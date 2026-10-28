import React from 'react';

export const BatakGorgaBorder: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full overflow-hidden flex items-center justify-center py-1 opacity-75 ${className}`}>
      <svg className="w-full h-3.5" preserveAspectRatio="none" viewBox="0 0 400 14" fill="none">
        <path
          d="M0 7 C 25 0, 50 14, 75 7 C 100 0, 125 14, 150 7 C 175 0, 200 14, 225 7 C 250 0, 275 14, 300 7 C 325 0, 350 14, 375 7 L 400 7"
          stroke="#2E6B34"
          strokeWidth="2.5"
          fill="none"
        />
        <path
          d="M0 7 C 25 14, 50 0, 75 7 C 100 14, 125 0, 150 7 C 175 14, 200 0, 225 7 C 250 14, 275 0, 300 7 C 325 14, 350 0, 375 7 L 400 7"
          stroke="#7A5230"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <circle cx="75" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="150" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="225" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="300" cy="7" r="2.5" fill="#A8D5A2" />
        <circle cx="375" cy="7" r="2.5" fill="#A8D5A2" />
      </svg>
    </div>
  );
};

export const BatakCornerMotif: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg className={`w-10 h-10 text-[#2E6B34]/15 ${className}`} viewBox="0 0 50 50" fill="currentColor">
      <path d="M0 0 L50 0 C40 10, 30 25, 25 50 C20 30, 10 20, 0 0 Z" />
      <circle cx="15" cy="15" r="4" fill="#A8D5A2" opacity="0.4" />
    </svg>
  );
};
