
import React from 'react';
import FactoryIcon from './icons/FactoryIcon';
import ZapIcon from './icons/ZapIcon';

interface FacilityStatusDisplayProps {
  facilityDemand: number;
  effectiveEVChargeRate: number; // This is what the EV is actually receiving
  isPenaltyActive: boolean;
  isBonusActive: boolean;
  isRapidCharging: boolean;
}

const FacilityStatusDisplay: React.FC<FacilityStatusDisplayProps> = ({ facilityDemand, effectiveEVChargeRate, isPenaltyActive, isBonusActive, isRapidCharging }) => {
  // Demand color logic: Red if facilityDemand is very high (e.g. close to contract power, or if EV is trying to pull more than facilityDemand and causing penalty)
  // This interpretation is tricky. The original penalty was if charger output > facilityDemand.
  // For visual cue: if facilityDemand is high, or if we are in penalty.
  // Let's make it red if penalty is active, or if demand is generally high (e.g., > 80% of typical max).
  // The penalty itself is triggered by charger_intended_output > facilityDemand.
  // The `demandExceeded` in previous version used `actualChargerOutput > facilityDemand`.
  // Let's simplify: `demandColor` is primarily to show the state of `facilityDemand` itself.
  // If penalty is active, the charger output is 0.
  
  const demandColor = isPenaltyActive ? 'text-red-500' : (facilityDemand > 300 ? 'text-orange-400' : 'text-lime-400');

  let outputColor = 'text-sky-400'; // Default normal
  if (isPenaltyActive || effectiveEVChargeRate === 0) { // If penalty, or no charge flowing
    outputColor = 'text-red-500';
  } else if (isRapidCharging) {
    outputColor = 'text-purple-400'; 
  } else if (isBonusActive) {
    outputColor = 'text-yellow-400';
  }


  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 text-lg sm:text-xl my-4">
      <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start">
        <FactoryIcon className={`w-6 h-6 sm:w-7 sm:h-7 mr-2 ${demandColor}`} />
        <span className="font-semibold">需要: <span className={demandColor}>{facilityDemand.toFixed(1)} kW</span></span>
      </div>
      <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start">
        <ZapIcon className={`w-6 h-6 sm:w-7 sm:h-7 mr-2 ${outputColor}`} />
        <span className="font-semibold">充電器: <span className={outputColor}>{effectiveEVChargeRate.toFixed(1)} kW</span></span>
      </div>
    </div>
  );
};

export default FacilityStatusDisplay;
