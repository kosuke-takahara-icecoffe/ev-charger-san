
import React from 'react';
import { EVInstance } from '../types';
import BatteryIcon from './icons/BatteryIcon';
import CarIcon from './icons/CarIcon'; // Assuming a new CarIcon component
import { 
  EV_MIN_CAPACITY_FOR_SCALING, 
  EV_MAX_CAPACITY_FOR_SCALING,
  EV_GFX_BASE_WIDTH,
  EV_GFX_MAX_WIDTH,
  EV_GFX_ASPECT_RATIO
} from '../constants';

interface EVDisplayProps {
  ev: EVInstance | null;
}

const EVDisplay: React.FC<EVDisplayProps> = ({ ev }) => {
  if (!ev) {
    return (
      <div className="h-56 bg-slate-700 rounded-lg flex flex-col items-center justify-center text-slate-400 shadow-lg p-4">
        <CarIcon className="w-16 h-16 text-slate-500 mb-2" />
        EV待機中...
      </div>
    );
  }

  const chargePercentage = (ev.currentCharge / ev.capacity) * 100;

  // Calculate dynamic size for EV graphic
  const capacityRange = EV_MAX_CAPACITY_FOR_SCALING - EV_MIN_CAPACITY_FOR_SCALING;
  const capacityDelta = Math.max(0, Math.min(capacityRange, ev.capacity - EV_MIN_CAPACITY_FOR_SCALING));
  
  let scaleFactor = 0;
  if (capacityRange > 0) {
    scaleFactor = capacityDelta / capacityRange;
  }

  const evGraphicWidth = EV_GFX_BASE_WIDTH + scaleFactor * (EV_GFX_MAX_WIDTH - EV_GFX_BASE_WIDTH);
  const evGraphicHeight = evGraphicWidth / EV_GFX_ASPECT_RATIO;

  return (
    <div className={`p-4 sm:p-6 rounded-lg shadow-xl text-white ${ev.color} transition-colors duration-500 ease-in-out`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className={`text-2xl sm:text-3xl font-bold ${ev.textColor}`}>{ev.name}</h3>
        <div 
          className={`rounded flex items-center justify-center shadow-inner p-1 ${ev.textColor === 'text-white' || ev.textColor === 'text-green-50' || ev.textColor === 'text-blue-50' || ev.textColor === 'text-indigo-50' || ev.textColor === 'text-red-50' ? 'bg-black/20' : 'bg-white/30'}`}
          style={{ width: `${evGraphicWidth}px`, height: `${evGraphicHeight}px` }}
          aria-label={`${ev.name}の視覚的表現`}
        >
            <CarIcon className={`${ev.textColor}`} style={{width: `${evGraphicWidth * 0.75}px`, height: `${evGraphicHeight * 0.75}px` }} />
        </div>
      </div>
      <div className={`flex items-center justify-between mb-2 text-sm sm:text-base ${ev.textColor}`}>
        <div className="flex items-center">
          <BatteryIcon className="w-5 h-5 mr-2" />
          <span>容量: {ev.capacity.toFixed(0)} kWh</span>
        </div>
        <span>充電量: {ev.currentCharge.toFixed(1)} kWh</span>
      </div>
      <div className="w-full bg-slate-300 bg-opacity-50 rounded-full h-6 sm:h-8 shadow-inner">
        <div
          className="bg-sky-400 h-full rounded-full transition-all duration-100 ease-linear flex items-center justify-end"
          style={{ width: `${Math.min(chargePercentage, 100)}%` }}
          aria-hidden="true"
        >
          <span className="text-xs sm:text-sm font-medium text-sky-900 pr-2">{chargePercentage.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
};

export default EVDisplay;
