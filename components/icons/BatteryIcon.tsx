
import React from 'react';

interface BatteryIconProps {
  className?: string;
  percentage?: number; // 0-100, optional for visual fill
}

const BatteryIcon: React.FC<BatteryIconProps> = ({ className, percentage }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={`w-6 h-6 ${className}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5H18V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6.375A2.25 2.25 0 0018.75 7.125h-15A2.25 2.25 0 001.5 9.375v6.375A2.25 2.25 0 003.75 18z" />
    {percentage !== undefined && (
      <rect
        x="4.5"
        y="10.5"
        width={(13.5 * Math.min(100, Math.max(0, percentage))) / 100}
        height="4.5"
        fill="currentColor"
      />
    )}
  </svg>
);

export default BatteryIcon;
