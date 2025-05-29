
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EVInstance, GameState, ScoreEntry } from './types';
import {
  INITIAL_GAME_DURATION,
  BONUS_DURATION,
  PENALTY_COOLDOWN_DURATION,
  FACILITY_DEMAND_UPDATE_INTERVAL,
  EV_TYPES,
  NORMAL_CHARGER_OUTPUT_RANGE,
  BONUS_CHARGER_OUTPUT_RANGE,
  FACILITY_DEMAND_RANGE,
  GAME_TICK_INTERVAL,
  KWH_PER_TICK_FACTOR,
  CONSECUTIVE_CHARGES_FOR_BONUS,
  RAPID_CHARGER_OUTPUT,
  RAPID_CHARGE_DURATION,
  DEMAND_FORECAST_POINTS,
  CONTRACT_POWER,
  MAX_HIGH_SCORES,
} from './constants';
import EVDisplay from './components/EVDisplay';
import GameInfoDisplay from './components/GameInfoDisplay';
import FacilityStatusDisplay from './components/FacilityStatusDisplay';
import Modal from './components/Modal';
import ZapIcon from './components/icons/ZapIcon';
import UserIcon from './components/icons/UserIcon'; // Added UserIcon
import DemandForecastGraph from './components/DemandForecastGraph';

const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

export function App(): JSX.Element {
  const [gameState, setGameState] = useState<GameState>(GameState.Idle);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_GAME_DURATION);
  const [currentEV, setCurrentEV] = useState<EVInstance | null>(null);
  
  const [baseNormalChargerOutput, setBaseNormalChargerOutput] = useState(NORMAL_CHARGER_OUTPUT_RANGE.min);
  const [currentBonusOutput, setCurrentBonusOutput] = useState(0);
  const [effectiveEVChargeRate, setEffectiveEVChargeRate] = useState(0);

  const [facilityDemand, setFacilityDemand] = useState(FACILITY_DEMAND_RANGE.min);
  const [facilityDemandForecast, setFacilityDemandForecast] = useState<number[]>([]);

  const [isCharging, setIsCharging] = useState(false); 
  const [penaltyTimeLeft, setPenaltyTimeLeft] = useState(0);
  
  const [bonusTimeActive, setBonusTimeActive] = useState(false);
  const [bonusTimeRemaining, setBonusTimeRemaining] = useState(0);
  const [consecutiveSuccessfulCharges, setConsecutiveSuccessfulCharges] = useState(0);
  
  const [isRapidCharging, setIsRapidCharging] = useState(false);
  const [rapidChargeTimeLeft, setRapidChargeTimeLeft] = useState(RAPID_CHARGE_DURATION);
  const [hasActivatedRapidChargeThisGame, setHasActivatedRapidChargeThisGame] = useState(false);

  const [message, setMessage] = useState("Welcome to EV Charger-san!");

  // Player Name and High Scores
  const [playerName, setPlayerName] = useState("");
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);

  const gameTickIntervalRef = useRef<number | null>(null);
  const mainTimerIntervalRef = useRef<number | null>(null);
  const penaltyTimerIntervalRef = useRef<number | null>(null);
  const bonusTimerIntervalRef = useRef<number | null>(null);
  const rapidChargeTimerIntervalRef = useRef<number | null>(null);

  const scoreRef = useRef(score);
  const gameStateRef = useRef(gameState);
  const bonusTimeActiveRef = useRef(bonusTimeActive);
  const isRapidChargingRef = useRef(isRapidCharging);
  const currentEVRef = useRef(currentEV);
  const facilityDemandRef = useRef(facilityDemand);
  const rapidChargeTimeLeftRef = useRef(rapidChargeTimeLeft);
  const playerNameRef = useRef(playerName);


  const playStartSound = useCallback(() => {/* NOOP */}, []);
  const stopChargeNormalLoopSound = useCallback(() => {/* NOOP */}, []);
  const playChargeNormalLoopSound = useCallback((loop?: boolean) => {/* NOOP */}, []); 
  const stopChargeRapidLoopSound = useCallback(() => {/* NOOP */}, []);
  const playChargeRapidLoopSound = useCallback((loop?: boolean) => {/* NOOP */}, []); 
  const stopChargeBonusLoopSound = useCallback(() => {/* NOOP */}, []);
  const playChargeBonusLoopSound = useCallback((loop?: boolean) => {/* NOOP */}, []); 
  const playChargeStopSound = useCallback(() => {/* NOOP */}, []);
  const playBonusStartSound = useCallback(() => {/* NOOP */}, []);
  const playGameOverSound = useCallback(() => {/* NOOP */}, []);
  
  const stopAllLoopingSoundsAndPlayStop = useCallback((playStopSnd = true) => {
    stopChargeNormalLoopSound();
    stopChargeBonusLoopSound();
    stopChargeRapidLoopSound();
    if (playStopSnd) playChargeStopSound();
   }, [stopChargeNormalLoopSound, stopChargeBonusLoopSound, stopChargeRapidLoopSound, playChargeStopSound]);


  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { bonusTimeActiveRef.current = bonusTimeActive; }, [bonusTimeActive]);
  useEffect(() => { isRapidChargingRef.current = isRapidCharging; }, [isRapidCharging]);
  useEffect(() => { currentEVRef.current = currentEV; }, [currentEV]);
  useEffect(() => { facilityDemandRef.current = facilityDemand; }, [facilityDemand]);
  useEffect(() => { rapidChargeTimeLeftRef.current = rapidChargeTimeLeft; }, [rapidChargeTimeLeft]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);


  const clearAllIntervals = useCallback(() => {
    const intervalsToClear = [
      gameTickIntervalRef, mainTimerIntervalRef, penaltyTimerIntervalRef, 
      bonusTimerIntervalRef, rapidChargeTimerIntervalRef
    ];
    intervalsToClear.forEach(ref => {
      if (ref.current) {
        clearInterval(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const spawnNewEV = useCallback(() => {
    const evType = EV_TYPES[getRandomInt(0, EV_TYPES.length - 1)];
    let maxInputRate = 100;
    if (evType.name === "Long Hauler") {
      maxInputRate = 200;
    }
    setCurrentEV({
      ...evType,
      id: Date.now().toString() + Math.random().toString(),
      currentCharge: 0,
      maxAcceptableInputRate: maxInputRate,
    });
    const newNormalOutput = getRandomFloat(NORMAL_CHARGER_OUTPUT_RANGE.min, NORMAL_CHARGER_OUTPUT_RANGE.max);
    setBaseNormalChargerOutput(newNormalOutput);
  }, []);
  
  useEffect(() => {
    let targetChargerOutput = 0;
    if (gameStateRef.current === GameState.PenaltyCoolDown || penaltyTimeLeft > 0) { // Use ref here for consistency if penaltyTimeLeft is also tied to state
      targetChargerOutput = 0;
    } else if (isRapidChargingRef.current) { 
      targetChargerOutput = RAPID_CHARGER_OUTPUT;
    } else if (isCharging) { 
      if (bonusTimeActiveRef.current) {
        targetChargerOutput = currentBonusOutput;
      } else {
        targetChargerOutput = baseNormalChargerOutput;
      }
    } else { 
      targetChargerOutput = 0;
    }
    setEffectiveEVChargeRate(targetChargerOutput);
  }, [gameState, penaltyTimeLeft, isRapidCharging, isCharging, bonusTimeActive, baseNormalChargerOutput, currentBonusOutput]);


  const endGame = useCallback(() => {
    setGameState(GameState.GameOver);
    setIsCharging(false);
    setIsRapidCharging(false); 
    
    const finalScore = scoreRef.current;
    setMessage(`Game Over, ${playerNameRef.current}! Final Score: ${finalScore.toFixed(1)} kWh`);
    
    // Add to high scores
    setHighScores(prevHighScores => {
      const newScoreEntry: ScoreEntry = { name: playerNameRef.current, score: finalScore };
      const updatedScores = [...prevHighScores, newScoreEntry];
      updatedScores.sort((a, b) => b.score - a.score); // Sort descending
      return updatedScores.slice(0, MAX_HIGH_SCORES); // Keep top N
    });

    clearAllIntervals();
    playGameOverSound();
    stopAllLoopingSoundsAndPlayStop(false);
  }, [clearAllIntervals, playGameOverSound, stopAllLoopingSoundsAndPlayStop]);

  const generateDemandForecast = useCallback(() => {
    const forecast: number[] = new Array(DEMAND_FORECAST_POINTS).fill(0);
    for (let i = 0; i < DEMAND_FORECAST_POINTS; i++) {
      forecast[i] = getRandomFloat(FACILITY_DEMAND_RANGE.min, FACILITY_DEMAND_RANGE.max);
    }
    setFacilityDemandForecast(forecast);
    if (forecast.length > 0) {
      setFacilityDemand(forecast[0]);
    }
  }, []);

  const resetGame = useCallback(() => {
    // Player name is not reset here, it persists from Idle screen.
    setScore(0);
    setTimeLeft(INITIAL_GAME_DURATION);
    setBonusTimeActive(false);
    setBonusTimeRemaining(0);
    setCurrentBonusOutput(0);
    setPenaltyTimeLeft(0);
    setConsecutiveSuccessfulCharges(0);
    
    setRapidChargeTimeLeft(RAPID_CHARGE_DURATION); 
    setHasActivatedRapidChargeThisGame(false);
    setIsRapidCharging(false);

    setIsCharging(false); 
    generateDemandForecast();
    spawnNewEV();
    setMessage("Click 'Start Charge' or 'Start Rapid Charge'.");
  }, [spawnNewEV, generateDemandForecast]);

  const startGame = useCallback(() => {
    if (playerName.trim() === "") {
        setMessage("Please enter your name to start the game.");
        return;
    }
    playStartSound();
    resetGame();
    setGameState(GameState.Playing);
  }, [resetGame, playStartSound, playerName]);
  
  useEffect(() => {
    if (gameState === GameState.Playing || gameState === GameState.Bonus || gameState === GameState.PenaltyCoolDown || isRapidChargingRef.current) {
      mainTimerIntervalRef.current = window.setInterval(() => {
        setTimeLeft(prevTimeLeft => {
          if (prevTimeLeft <= 1) {
            endGame();
            return 0;
          }
          const newTimeLeft = prevTimeLeft - 1;
          if (facilityDemandForecast.length > 0) {
            const elapsedSeconds = INITIAL_GAME_DURATION - newTimeLeft;
            const forecastIntervalSeconds = FACILITY_DEMAND_UPDATE_INTERVAL / 1000;
            const forecastIndex = Math.floor(elapsedSeconds / forecastIntervalSeconds);
            const currentDemand = facilityDemandForecast[Math.min(Math.max(0, forecastIndex), facilityDemandForecast.length - 1)];
            setFacilityDemand(currentDemand);
          }
          return newTimeLeft;
        });
      }, 1000);
    }
    return () => {
      if (mainTimerIntervalRef.current) clearInterval(mainTimerIntervalRef.current);
      mainTimerIntervalRef.current = null;
    };
  }, [gameState, endGame, facilityDemandForecast, isRapidCharging]); 

  useEffect(() => {
    if (penaltyTimeLeft > 0 && gameState === GameState.PenaltyCoolDown) {
      penaltyTimerIntervalRef.current = window.setInterval(() => {
        setPenaltyTimeLeft(prev => {
          if (prev <= 1) {
            setGameState(bonusTimeActiveRef.current ? GameState.Bonus : GameState.Playing); 
            setMessage("Penalty over. You can charge again!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (penaltyTimerIntervalRef.current) clearInterval(penaltyTimerIntervalRef.current);
      penaltyTimerIntervalRef.current = null;
    };
  }, [penaltyTimeLeft, gameState]); 

  useEffect(() => {
    if (bonusTimeActive && bonusTimeRemaining > 0) {
      bonusTimerIntervalRef.current = window.setInterval(() => {
        setBonusTimeRemaining(prev => {
          if (prev <= 1) {
            setBonusTimeActive(false);
            setCurrentBonusOutput(0); 
             if (!isRapidChargingRef.current && gameStateRef.current !== GameState.PenaltyCoolDown) {
                setGameState(GameState.Playing);
             }
            setMessage("Bonus time over!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (!bonusTimeActive && bonusTimerIntervalRef.current) {
        clearInterval(bonusTimerIntervalRef.current);
        bonusTimerIntervalRef.current = null;
    }
    return () => {
      if (bonusTimerIntervalRef.current) clearInterval(bonusTimerIntervalRef.current);
      bonusTimerIntervalRef.current = null;
    };
  }, [bonusTimeActive, bonusTimeRemaining]); 

  useEffect(() => {
    if (isRapidCharging && rapidChargeTimeLeft > 0) {
      rapidChargeTimerIntervalRef.current = window.setInterval(() => {
        setRapidChargeTimeLeft(prev => {
          if (prev <= 1) {
            setIsRapidCharging(false); 
            setMessage("Rapid charge duration finished!");
            stopChargeRapidLoopSound(); 
            playChargeStopSound();

            if (bonusTimeActiveRef.current && gameStateRef.current !== GameState.PenaltyCoolDown) {
                 setGameState(GameState.Bonus);
            } else if (gameStateRef.current !== GameState.PenaltyCoolDown) {
                 setGameState(GameState.Playing);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if ((!isRapidCharging || rapidChargeTimeLeft <= 0) && rapidChargeTimerIntervalRef.current) { 
        clearInterval(rapidChargeTimerIntervalRef.current);
        rapidChargeTimerIntervalRef.current = null;
    }
    return () => {
      if (rapidChargeTimerIntervalRef.current) clearInterval(rapidChargeTimerIntervalRef.current);
      rapidChargeTimerIntervalRef.current = null;
    };
  }, [isRapidCharging, rapidChargeTimeLeft, playChargeStopSound, stopChargeRapidLoopSound]); 

  useEffect(() => {
    if ((gameStateRef.current === GameState.Playing || gameStateRef.current === GameState.Bonus) && 
        currentEVRef.current) {
      
      gameTickIntervalRef.current = window.setInterval(() => {
        const activeChargingMode = isRapidChargingRef.current || isCharging;

        if (activeChargingMode) {
          let intendedChargerOutput = 0;
          if (isRapidChargingRef.current) {
            intendedChargerOutput = RAPID_CHARGER_OUTPUT;
          } else if (isCharging) { 
            if (bonusTimeActiveRef.current) {
              intendedChargerOutput = currentBonusOutput;
            } else {
              intendedChargerOutput = baseNormalChargerOutput;
            }
          }
          
          if (facilityDemandRef.current + intendedChargerOutput > CONTRACT_POWER) { 
            stopAllLoopingSoundsAndPlayStop(); 
            setGameState(GameState.PenaltyCoolDown);
            setPenaltyTimeLeft(PENALTY_COOLDOWN_DURATION);
            setIsCharging(false); 
            if(isRapidChargingRef.current) setIsRapidCharging(false); 
            setConsecutiveSuccessfulCharges(0);
            setMessage(`DEMAND EXCEEDED! Facility overload. Charging disabled for ${PENALTY_COOLDOWN_DURATION}s.`);
            return;
          }

          const evToCharge = currentEVRef.current;
          if (!evToCharge) return;

          const actualRateEVAccepts = Math.min(intendedChargerOutput, evToCharge.maxAcceptableInputRate);
          const chargeAmount = actualRateEVAccepts * KWH_PER_TICK_FACTOR;

          if (chargeAmount > 0) {
            setScore(prev => prev + chargeAmount);
          }

          setCurrentEV(prevEV => {
            if (!prevEV) return null; 

            const newCharge = prevEV.currentCharge + chargeAmount;
            if (newCharge >= prevEV.capacity) {
              const evCompletedDuringRapid = isRapidChargingRef.current;
              const rapidChargeContinuesForNextEV = evCompletedDuringRapid && rapidChargeTimeLeftRef.current > 0;

              if (rapidChargeContinuesForNextEV) {
                if(isCharging) setIsCharging(false); 
                stopChargeNormalLoopSound();         
                stopChargeBonusLoopSound();          
                playChargeStopSound(); 
              } else {
                stopAllLoopingSoundsAndPlayStop(true); 
                
                if (isRapidChargingRef.current) setIsRapidCharging(false); 
                if (isCharging) setIsCharging(false);                    
              }

              const chargedEVName = prevEV.name;
              const chargedCapacity = prevEV.capacity;

              setConsecutiveSuccessfulCharges(prevSuccessCharges => {
                const wasBonusActiveForThisEV = bonusTimeActiveRef.current; 
                
                const eligibleForNormalBonusIncrement = !wasBonusActiveForThisEV && !evCompletedDuringRapid;
                const newCount = eligibleForNormalBonusIncrement ? prevSuccessCharges + 1 : prevSuccessCharges;
                
                if (newCount >= CONSECUTIVE_CHARGES_FOR_BONUS && !wasBonusActiveForThisEV && !evCompletedDuringRapid) {
                  playBonusStartSound();
                  setBonusTimeActive(true);
                  setBonusTimeRemaining(BONUS_DURATION);
                  const newBonusOutputVal = getRandomFloat(BONUS_CHARGER_OUTPUT_RANGE.min, BONUS_CHARGER_OUTPUT_RANGE.max);
                  setCurrentBonusOutput(newBonusOutputVal);
                  
                  if (!isRapidChargingRef.current) { 
                    setGameState(GameState.Bonus);
                  }
                  setTimeLeft(prevTime => prevTime + BONUS_DURATION); 
                  setMessage("BONUS TIME! Enhanced charging active!");
                  spawnNewEV(); 
                  return 0; 
                }
                
                setMessage(`${chargedEVName} fully charged! (+${chargedCapacity.toFixed(0)} kWh) Next EV arriving.`);
                spawnNewEV(); 
                return newCount; 
              });
              return null; 
            }
            return { ...prevEV, currentCharge: newCharge };
          });

          if (chargeAmount > 0) {
             if (isRapidChargingRef.current) setMessage(`RAPID CHARGING at ${actualRateEVAccepts.toFixed(1)} kW!`);
             else if (bonusTimeActiveRef.current) setMessage(`BONUS CHARGING at ${actualRateEVAccepts.toFixed(1)} kW!`);
             else setMessage(`Charging at ${actualRateEVAccepts.toFixed(1)} kW...`);
          } else if (intendedChargerOutput > 0) {
             setMessage("EV at max input or no power from charger. Check demand!");
          } else { 
             setMessage("Charger active but no power output. Check demand!");
          }

        } else { 
            if (gameStateRef.current === GameState.Playing) {
                 if (bonusTimeActiveRef.current) {
                    setMessage("Bonus Time! Click 'Start Bonus Charge'!");
                 } else {
                    setMessage("Click 'Start Charge' or 'Start Rapid Charge'.");
                 }
            } else if (gameStateRef.current === GameState.Bonus) {
                 setMessage("Bonus Time! Click 'Start Bonus Charge'!");
            }
        }
      }, GAME_TICK_INTERVAL);
    }
    return () => {
      if (gameTickIntervalRef.current) clearInterval(gameTickIntervalRef.current);
      gameTickIntervalRef.current = null;
    };
  }, [isCharging, facilityDemand, baseNormalChargerOutput, currentBonusOutput, spawnNewEV, endGame, playBonusStartSound, stopAllLoopingSoundsAndPlayStop, stopChargeNormalLoopSound, stopChargeBonusLoopSound, playChargeStopSound]); 


  const handleNormalChargeToggle = () => {
    if (isRapidChargingRef.current || gameStateRef.current === GameState.PenaltyCoolDown) return;

    if (isCharging) {
      setIsCharging(false);
      stopChargeNormalLoopSound(); 
      stopChargeBonusLoopSound();
      playChargeStopSound();
      setMessage("Charging stopped.");
    } else {
      if (gameState === GameState.Playing || gameState === GameState.Bonus) {
        setIsCharging(true);
        if (bonusTimeActiveRef.current) {
          playChargeBonusLoopSound(true);
        } else {
          playChargeNormalLoopSound(true);
        }
      }
    }
  };

  const handleRapidChargeButtonClick = () => {
    if (gameStateRef.current === GameState.PenaltyCoolDown) return;

    if (isRapidCharging) { 
      setIsRapidCharging(false);
      setMessage(`Rapid charge paused. ${rapidChargeTimeLeftRef.current.toFixed(0)}s remaining.`);
      stopChargeRapidLoopSound(); 
      playChargeStopSound();
      
      if (gameStateRef.current !== GameState.PenaltyCoolDown) {
        if (bonusTimeActiveRef.current) {
          setGameState(GameState.Bonus);
        } else {
          setGameState(GameState.Playing);
        }
      }
    } else { 
      if (rapidChargeTimeLeft <= 0) { 
        setMessage("Rapid charge fully used for this game.");
        return;
      }

      if(isCharging) setIsCharging(false); 
      stopChargeNormalLoopSound(); 
      stopChargeBonusLoopSound(); 

      setIsRapidCharging(true);
      setHasActivatedRapidChargeThisGame(true); 
      
      setMessage(`Rapid Charge Activated! ${rapidChargeTimeLeftRef.current.toFixed(0)}s available.`);
      playChargeRapidLoopSound(true); 
      if (gameStateRef.current !== GameState.PenaltyCoolDown) {
         setGameState(GameState.Bonus); // Set to Bonus to reflect active high-power charging state visually if desired
      }
    }
  };
  
  const mainButtonText = (): string => {
    if (isRapidCharging) return "N/A (Rapid Active)";
    if (isCharging) {
        if (effectiveEVChargeRate > 0) return bonusTimeActive ? "STOP BONUS" : "STOP CHARGE";
        return "NO POWER";
    }
    return bonusTimeActive ? "START BONUS CHARGE" : "START CHARGE";
  };

  const mainButtonAriaLabel = (): string => {
    if (isRapidCharging) return "Normal charge unavailable while rapid charging";
    if (isCharging) return bonusTimeActive ? "Stop bonus charging" : "Stop normal charging";
    return bonusTimeActive ? "Start bonus charging" : "Start normal charge";
  };

  const rapidChargeButtonText = (): string => {
    if (isRapidCharging) return `Stop Rapid (${rapidChargeTimeLeft.toFixed(0)}s)`;
    if (rapidChargeTimeLeft <= 0 && hasActivatedRapidChargeThisGame) return "Rapid Charge Used";
    return `Start Rapid (${RAPID_CHARGER_OUTPUT}kW / ${rapidChargeTimeLeft.toFixed(0)}s left)`;
  };
  
  const isRapidChargeButtonDisabled = (): boolean => {
    if (gameState === GameState.PenaltyCoolDown) return true; // Direct state check is fine here for UI logic
    return !isRapidCharging && rapidChargeTimeLeft <= 0 && hasActivatedRapidChargeThisGame;
  }

  const currentDemandForecastIndex = facilityDemandForecast.length > 0 ? 
    Math.min(facilityDemandForecast.length - 1, Math.max(0, Math.floor((INITIAL_GAME_DURATION - timeLeft) / (FACILITY_DEMAND_UPDATE_INTERVAL / 1000))))
    : 0;
  
  const maxGraphYValue = Math.max(CONTRACT_POWER, FACILITY_DEMAND_RANGE.max) + 50;

  useEffect(() => {
    return () => {
        stopAllLoopingSoundsAndPlayStop(false); 
    };
  }, [stopAllLoopingSoundsAndPlayStop]);

  const mainChargeButtonBgColor = (): string => {
    if (gameState === GameState.PenaltyCoolDown) return 'bg-red-700 cursor-not-allowed'; // Direct state check fine for UI
    if (isRapidCharging) return 'bg-slate-600 cursor-not-allowed'; 
    if (bonusTimeActive) return isCharging ? 'bg-yellow-400' : 'bg-yellow-600 hover:bg-yellow-500';
    return isCharging ? 'bg-sky-500' : 'bg-sky-700 hover:bg-sky-600';
  };
  
  const handlePlayerNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(event.target.value);
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 selection:bg-sky-500 selection:text-sky-900">
      <Modal isOpen={gameState === GameState.Idle} title="EV Charger-san">
        <p className="text-slate-300 mb-4 text-lg">Charge EVs, manage power, and hit bonus rounds! Watch the facility demand and stay under contract power. Use your rapid charger wisely!</p>
        
        <div className="mb-6">
          <label htmlFor="playerName" className="block text-slate-300 text-sm font-bold mb-2">Enter Your Name:</label>
          <input 
            type="text"
            id="playerName"
            value={playerName}
            onChange={handlePlayerNameChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 bg-slate-700 text-slate-100 leading-tight focus:outline-none focus:shadow-outline focus:border-sky-500"
            placeholder="Charger Master"
            maxLength={20}
          />
        </div>
        
        <button
          onClick={startGame}
          disabled={playerName.trim() === ""}
          className={`w-full font-bold py-3 px-6 rounded-lg text-xl shadow-lg transition duration-150 ease-in-out transform hover:scale-105
                      ${playerName.trim() === "" ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400 text-white'}`}
          aria-label="Start Game"
          aria-disabled={playerName.trim() === ""}
        >
          Start Game
        </button>
        
        <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="text-xl font-semibold text-sky-400 mb-3">High Scores</h3>
            {highScores.length > 0 ? (
              <ol className="list-decimal list-inside text-slate-300 space-y-1">
                {highScores.map((entry, index) => (
                  <li key={index} className="text-lg">
                    <span className="font-medium text-amber-400">{entry.name}</span>: {entry.score.toFixed(1)} kWh
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-slate-400 italic">No high scores yet. Be the first!</p>
            )}
        </div>

      </Modal>

      <Modal isOpen={gameState === GameState.GameOver} title="Game Over!">
        <p className="text-slate-200 mb-2 text-2xl">Well done, <span className="font-bold text-sky-400">{playerNameRef.current || "Player"}</span>!</p>
        <p className="text-slate-200 mb-4 text-2xl">Final Score: <span className="font-bold text-amber-400">{scoreRef.current.toFixed(1)} kWh</span></p>
        <p className="text-slate-300 mb-8 text-lg">Great job managing the chargers!</p>
        <button
          onClick={() => setGameState(GameState.Idle)}
          className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 px-6 rounded-lg text-xl shadow-lg transition duration-150 ease-in-out transform hover:scale-105"
          aria-label="Play Again - Return to Title"
        >
          Play Again
        </button>
      </Modal>

      {(gameState !== GameState.Idle && gameState !== GameState.GameOver) && (
        <div className="w-full max-w-2xl mx-auto">
          <header className="mb-4 sm:mb-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-sky-400 tracking-tight">EV Charger-san</h1>
          </header>

          <main className="space-y-4 sm:space-y-6">
            <GameInfoDisplay 
              playerName={playerName}
              score={score} 
              timeLeft={timeLeft} 
              bonusTimeActive={bonusTimeActive || isRapidCharging}
              consecutiveCharges={consecutiveSuccessfulCharges}
              chargesForBonus={CONSECUTIVE_CHARGES_FOR_BONUS}
            />
            <EVDisplay ev={currentEV} />
            
            {facilityDemandForecast.length > 0 && (
              <DemandForecastGraph 
                forecastData={facilityDemandForecast}
                currentTimeIndex={currentDemandForecastIndex}
                currentChargerOutput={effectiveEVChargeRate} 
                maxGraphValue={maxGraphYValue} 
                contractPower={CONTRACT_POWER}
                width={500} 
                height={120}
              />
            )}
            <FacilityStatusDisplay 
              facilityDemand={facilityDemand} 
              effectiveEVChargeRate={effectiveEVChargeRate} 
              isPenaltyActive={gameState === GameState.PenaltyCoolDown} 
              isBonusActive={bonusTimeActive}
              isRapidCharging={isRapidCharging}
            />

            <div className="mt-2 sm:mt-4 p-3 bg-slate-700 rounded-lg shadow-md text-center min-h-[3em] flex items-center justify-center">
              <p className="text-sm sm:text-base italic text-slate-300">{message}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <button
                onClick={handleNormalChargeToggle}
                disabled={gameState === GameState.PenaltyCoolDown || isRapidCharging} 
                className={`w-full py-4 sm:py-5 px-6 rounded-lg font-bold text-xl sm:text-2xl shadow-xl transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 select-none 
                            ${mainChargeButtonBgColor()} 
                            ${isRapidCharging ? 'text-slate-400' : (bonusTimeActive ? 'text-yellow-900' : 'text-white')}
                            ${(gameState === GameState.PenaltyCoolDown || isRapidCharging) ? 'opacity-50' : 'hover:scale-105'}`} 
                aria-pressed={isCharging && !isRapidCharging}
                aria-label={mainButtonAriaLabel()}
              >
                <span className="flex items-center justify-center">
                  <ZapIcon className={`w-7 h-7 mr-2 ${isCharging && !isRapidCharging && effectiveEVChargeRate > 0 ? (bonusTimeActive ? 'animate-bounce' : 'animate-pulse') : ''}`}/>
                  {mainButtonText()}
                </span>
              </button>
              
              <button
                onClick={handleRapidChargeButtonClick}
                disabled={isRapidChargeButtonDisabled()}
                className={`w-full py-4 sm:py-5 px-6 rounded-lg font-bold text-xl sm:text-2xl shadow-xl transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50 select-none
                            ${isRapidChargeButtonDisabled() ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' : 
                            (isRapidCharging ? 'bg-purple-500 text-purple-50 animate-pulse hover:bg-purple-400' : 'bg-purple-600 hover:bg-purple-500 text-white')}`}
                aria-pressed={isRapidCharging}
                aria-label={isRapidCharging ? "Stop rapid charge" : (rapidChargeTimeLeft > 0 ? `Start or resume rapid charge, ${rapidChargeTimeLeft.toFixed(0)} seconds remaining` : "Rapid charge used")}
              >
                 <span className="flex items-center justify-center">
                   <ZapIcon className={`w-7 h-7 mr-2 ${isRapidCharging ? 'animate-ping' : ''}`}/>
                    {rapidChargeButtonText()}
                 </span>
              </button>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
