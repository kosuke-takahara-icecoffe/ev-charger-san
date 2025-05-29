
import React from 'react';

interface CarIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// Note: This is a placeholder icon. For better visuals, a more detailed car SVG would be preferable.
// This specific SVG is a simplified "bus" icon from Heroicons. A side-profile car would be better.
// For now, it serves as a visual placeholder.
//
// Corrected simple car icon:
// <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
//   <path d="M8.25 18.75a.75.75 0 01.75-.75h6a.75.75 0 010 1.5h-6a.75.75 0 01-.75-.75z" />
//   <path fillRule="evenodd" d="M4.75 9.347c0-.29.155-.551.408-.698l5.403-3.119a1.125 1.125 0 011.13 0l5.402 3.119c.254.146.408.407.408.698v5.72c0 .79-.537 1.478-1.293 1.712l-.706.222c-.17.053-.282.223-.282.402V18a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.597c0-.179-.112-.349-.282-.402l-.706-.222A1.99 1.99 0 014.75 15.066V9.347zm9.017 5.029L15 14.956l-.267-.08V11.5h-1.5v3.375l-.267.081-1.233.387.267.417.966-.303.001.002 1.034.325v.881h1.5v-.882l1.034-.325.001-.001.966.302.267-.417-1.233-.386zM6.75 11.5h1.5v3.375l-.267.081L6.75 15.344V11.5z" clipRule="evenodd" />
// </svg>
// Using an even simpler one for now for clarity with sizing:
// <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
// </svg>
//
// Okay, using a proper simple car SVG:
// Source: heroicons.com (mini -> truck) - slightly modified for less detail to scale better as a block.
/*
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
  <path d="M3.5 3A1.5 1.5 0 002 4.5V12.5A1.5 1.5 0 003.5 14h.013A2.25 2.25 0 016 15.75V16H4.75a.75.75 0 000 1.5h10.5a.75.75 0 000-1.5H14v-.25a2.25 2.25 0 012.487-2.25H16.5A1.5 1.5 0 0018 12.5V4.5A1.5 1.5 0 0016.5 3h-13zM6 4.5A1.5 1.5 0 017.5 6h5A1.5 1.5 0 0114 4.5H6z" />
</svg>
This one is "TruckIcon" from heroicons mini.
Let's use the `BeakerIcon` as a very abstract car for simplicity of path.
*/

// FIX: Renamed CarIconPlaceholder to CarIcon and ensured it's the sole default export.
// Simpler car-like shape for better dynamic sizing visualization
const CarIcon: React.FC<CarIconProps> = ({ className, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 30" // Viewbox matches aspect ratio
      fill="currentColor"
      className={className}
      {...props}
      aria-hidden="true" // Decorative
    >
      {/* Body */}
      <path d="M5,20 Q5,10 15,10 L45,10 Q55,10 55,20 Z" />
      {/* Roof */}
      <path d="M15,10 L20,5 L40,5 L45,10 Z" />
      {/* Wheels */}
      <circle cx="15" cy="22" r="4" />
      <circle cx="45" cy="22" r="4" />
    </svg>
  );
  
export default CarIcon;