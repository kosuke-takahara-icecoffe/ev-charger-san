
import React from 'react';
import TimerIcon from './icons/TimerIcon';
import StarIcon from './icons/StarIcon';
import UserIcon from './icons/UserIcon'; // Import UserIcon

interface GameInfoDisplayProps {
  playerName?: string; // Added playerName
  score: number;
  timeLeft: number;
  bonusTimeActive: boolean;
  consecutiveCharges: number;
  chargesForBonus: number;
}

const GameInfoDisplay: React.FC<GameInfoDisplayProps> = ({ playerName, score, timeLeft, bonusTimeActive, consecutiveCharges, chargesForBonus }) => {
  return (
    // Updated grid to handle 4 items, or flow nicely on smaller screens
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-lg sm:text-xl mb-4">
      {playerName && (
        <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start col-span-1 md:col-span-1">
            <UserIcon className="w-6 h-6 sm:w-7 sm:h-7 mr-2 text-teal-400" />
            <span className="font-semibold whitespace-nowrap truncate" title={playerName}>{playerName}</span>
        </div>
      )}
      <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start col-span-1 md:col-span-1">
        <StarIcon className="w-6 h-6 sm:w-7 sm:h-7 mr-2 text-amber-400" filled />
        <span className="font-semibold whitespace-nowrap">スコア: {score.toFixed(1)} kWh</span>
      </div>
      <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start col-span-1 md:col-span-1">
        <TimerIcon className="w-6 h-6 sm:w-7 sm:h-7 mr-2 text-cyan-400" />
        <span className="font-semibold whitespace-nowrap">時間: {timeLeft}s</span>
      </div>
      <div className={`bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md flex items-center justify-center sm:justify-start col-span-1 md:col-span-1 ${playerName ? '' : 'col-span-2 md:col-span-1'}`}>
         <StarIcon className={`w-6 h-6 sm:w-7 sm:h-7 mr-2 ${bonusTimeActive ? 'text-yellow-400 animate-pulse' : 'text-slate-500'}`} filled={bonusTimeActive}/>
        <span className="font-semibold whitespace-nowrap">
          ボーナス: {bonusTimeActive ? '作動中！' : `${consecutiveCharges}/${chargesForBonus}`}
        </span>
      </div>
    </div>
  );
};

export default GameInfoDisplay;
