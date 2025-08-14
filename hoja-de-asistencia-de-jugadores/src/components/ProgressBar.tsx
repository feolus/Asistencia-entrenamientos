import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  const formattedPercentage = (percentage * 100).toFixed(0);

  const getBarColor = (p: number) => {
    if (p < 0.5) return 'bg-red-500';
    if (p < 0.75) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  return (
    <div className="w-full bg-slate-200 rounded-full h-6 relative overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(percentage)}`}
        style={{ width: `${formattedPercentage}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-800 mix-blend-screen invert">
        {formattedPercentage}%
      </span>
    </div>
  );
};