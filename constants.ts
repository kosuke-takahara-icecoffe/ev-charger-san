import { EVType } from './types';

export const INITIAL_GAME_DURATION = 60; // seconds
export const BONUS_DURATION = 15; // seconds
export const PENALTY_COOLDOWN_DURATION = 5; // seconds
export const FACILITY_DEMAND_UPDATE_INTERVAL = 1000; // ms - Changed from 5000 to 1000 for 1-second updates

export const EV_TYPES: EVType[] = [
  { name: "Eco Mini", capacity: 20, color: "bg-green-600", textColor: "text-green-50" },
  { name: "City Hopper", capacity: 40, color: "bg-blue-600", textColor: "text-blue-50" },
  { name: "Family Cruiser", capacity: 80, color: "bg-indigo-600", textColor: "text-indigo-50" },
  { name: "Workhorse Van", capacity: 120, color: "bg-amber-500", textColor: "text-amber-900" },
  { name: "Long Hauler", capacity: 200, color: "bg-red-600", textColor: "text-red-50" },
];

export const NORMAL_CHARGER_OUTPUT_RANGE = { min: 3, max: 6 }; // kW
export const BONUS_CHARGER_OUTPUT_RANGE = { min: 50, max: 450 }; // kW

// Facility Demand and Contract Power
export const CONTRACT_POWER = 500; // kW
// Facility demand range changed to 0-500kW. Mountain demand logic removed.
export const FACILITY_DEMAND_RANGE = { min: 0, max: 500 }; // kW 

export const GAME_TICK_INTERVAL = 100; // ms, for charging logic updates
export const KWH_PER_TICK_FACTOR = GAME_TICK_INTERVAL / 1000;
export const CONSECUTIVE_CHARGES_FOR_BONUS = 3;

export const RAPID_CHARGER_OUTPUT = 100; // kW
export const RAPID_CHARGE_DURATION = 20; // seconds (変更: 10秒から20秒へ)

// DEMAND_FORECAST_POINTS will now be INITIAL_GAME_DURATION because FACILITY_DEMAND_UPDATE_INTERVAL is 1000ms
export const DEMAND_FORECAST_POINTS = INITIAL_GAME_DURATION / (FACILITY_DEMAND_UPDATE_INTERVAL / 1000);

// EV Visual Scaling Parameters
export const EV_MIN_CAPACITY_FOR_SCALING = 20; // kWh (Smallest EV)
export const EV_MAX_CAPACITY_FOR_SCALING = 200; // kWh (Largest EV)
export const EV_GFX_BASE_WIDTH = 50; // px for min capacity EV
export const EV_GFX_MAX_WIDTH = 120; // px for max capacity EV
export const EV_GFX_ASPECT_RATIO = 2; // width / height ratio for the EV graphic

export const MAX_HIGH_SCORES = 100; // Max number of high scores to display
