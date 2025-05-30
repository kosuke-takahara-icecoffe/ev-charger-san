
import React from 'react';

interface DemandForecastGraphProps {
  forecastData: number[];
  currentTimeIndex: number;
  currentChargerOutput: number; // This is the charger's intended output rate
  maxGraphValue: number; // Max value for Y-axis scaling
  contractPower: number;
  width?: number;
  height?: number;
}

const DemandForecastGraph: React.FC<DemandForecastGraphProps> = ({
  forecastData,
  currentTimeIndex,
  currentChargerOutput,
  maxGraphValue,
  contractPower,
  width = 500, 
  height = 100, 
}) => {
  if (!forecastData || forecastData.length === 0) {
    return <div className="text-slate-400">需要予測を読み込み中...</div>;
  }

  const padding = { top: 10, right: 10, bottom: 20, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const numPoints = forecastData.length;
  const stepX = numPoints > 1 ? chartWidth / (numPoints - 1) : chartWidth;

  const getY = (value: number) => padding.top + chartHeight - (Math.min(value, maxGraphValue) / maxGraphValue) * chartHeight;

  const points = forecastData
    .map((value, index) => {
      const x = padding.left + index * stepX;
      const y = getY(value);
      return `${x},${y}`;
    })
    .join(' ');

  const currentTimeX = padding.left + currentTimeIndex * stepX;
  const contractPowerY = getY(contractPower);
  const currentActualDemand = forecastData[currentTimeIndex];

  return (
    <div className="bg-slate-700 p-3 sm:p-4 rounded-lg shadow-md">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">施設需要予測 (今後60秒)</h4>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} aria-labelledby="demand-graph-title" role="img">
        <title id="demand-graph-title">今後60秒間の施設電力需要予測、契約電力上限、現在の施設需要、および充電器出力を含む総負荷を示す折れ線グラフ。</title>
        
        {/* Y-Axis Labels */}
        <text x={padding.left - 8} y={padding.top + 5} textAnchor="end" fontSize="10" fill="#a0aec0">{maxGraphValue.toFixed(0)}kW</text>
        <text x={padding.left - 8} y={getY(maxGraphValue / 2) + 3} textAnchor="end" fontSize="10" fill="#a0aec0">{(maxGraphValue / 2).toFixed(0)}kW</text>
        <text x={padding.left - 8} y={getY(0) -2} textAnchor="end" fontSize="10" fill="#a0aec0">0kW</text>
        {contractPowerY < (padding.top + chartHeight - 5) && contractPowerY > (padding.top + 5) && (
            <text x={padding.left - 8} y={contractPowerY +3} textAnchor="end" fontSize="9" fill="#e53e3e" fontWeight="bold">{contractPower}kW 契約</text>
        )}

        {/* X-Axis Line */}
         <line x1={padding.left} y1={padding.top + chartHeight} x2={padding.left + chartWidth} y2={padding.top + chartHeight} stroke="#4a5568" strokeWidth="1"/>

        {/* Contract Power Line */}
        <line
          x1={padding.left}
          y1={contractPowerY}
          x2={padding.left + chartWidth}
          y2={contractPowerY}
          stroke="#e53e3e" // Red for contract power
          strokeWidth="1.5"
          strokeDasharray="5 3"
          aria-label={`契約電力上限: ${contractPower} kW`}
        />

        {/* Forecast Line */}
        {numPoints > 1 && (
          <polyline
            fill="none"
            stroke="#63b3ed" // Light blue
            strokeWidth="2"
            points={points}
          />
        )}

        {/* Current Time Indicator for Demand (Yellow Dot) */}
        {currentTimeIndex >= 0 && currentTimeIndex < numPoints && currentActualDemand !== undefined && (
          <>
            <line // Vertical line for current time
              x1={currentTimeX}
              y1={padding.top}
              x2={currentTimeX}
              y2={padding.top + chartHeight}
              stroke="#f6e05e" // Yellow
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
             <circle // Yellow dot for current actual demand
                cx={currentTimeX} 
                cy={getY(currentActualDemand)} 
                r="4" 
                fill="#f6e05e"
                stroke="#1a202c"
                strokeWidth="1.5"
                aria-label={`現在の施設需要: ${currentActualDemand.toFixed(1)} kW`}
            />
          </>
        )}

        {/* Point representing Facility Demand + Charger Output (Green Dot) */}
        {currentChargerOutput > 0 && currentTimeIndex >= 0 && currentTimeIndex < numPoints && currentActualDemand !== undefined && (
          <circle
            cx={currentTimeX}
            cy={getY(currentActualDemand + currentChargerOutput)} // Y position is demand + charger output
            r="5" 
            fill="#48BB78" // Green
            stroke="#1a202c"
            strokeWidth="1.5"
            aria-label={`総負荷 (需要 + 充電器): ${(currentActualDemand + currentChargerOutput).toFixed(1)} kW (充電器分: ${currentChargerOutput.toFixed(1)} kW)`}
          />
        )}
      </svg>
    </div>
  );
};

export default DemandForecastGraph;
