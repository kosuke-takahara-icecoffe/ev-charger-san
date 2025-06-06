
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EVInstance, GameState, ScoreEntry } from './types';
import {
  INITIAL_GAME_DURATION,
  BONUS_DURATION,
  PENALTY_COOLDOWN_DURATION,
  FACILITY_DEMAND_UPDATE_INTERVAL,
  EV_TYPES,
  NORMAL_CHARGER_OUTPUT_RANGE,
  FIXED_BONUS_CHARGER_OUTPUT,
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
import UserIcon from './components/icons/UserIcon';
import DemandForecastGraph from './components/DemandForecastGraph';
import { useSound } from './components/hooks/useSound';
import { supabase } from './supabaseClient'; 

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

  const [message, setMessage] = useState("EVチャージャーさんへようこそ！");

  const [playerName, setPlayerName] = useState("");
  const [highScores, setHighScores] = useState<ScoreEntry[]>([]);
  const [highScoresLoading, setHighScoresLoading] = useState<boolean>(true);
  const [highScoresError, setHighScoresError] = useState<string | null>(null);

  // Screen effects state
  const [screenFlashColor, setScreenFlashColor] = useState<string | null>(null);
  const [shakeScreen, setShakeScreen] = useState<boolean>(false);
  const [showResultAnnouncement, setShowResultAnnouncement] = useState<boolean>(false);
  const [isGameOverTransition, setIsGameOverTransition] = useState<boolean>(false);


  const gameTickIntervalRef = useRef<number | null>(null);
  const mainTimerIntervalRef = useRef<number | null>(null);
  const penaltyTimerIntervalRef = useRef<number | null>(null);
  const bonusTimerIntervalRef = useRef<number | null>(null);
  const rapidChargeTimerIntervalRef = useRef<number | null>(null);

  const scoreRef = useRef(score);
  const gameStateRef = useRef<GameState>(gameState);
  const bonusTimeActiveRef = useRef(bonusTimeActive);
  const isRapidChargingRef = useRef(isRapidCharging);
  const currentEVRef = useRef(currentEV);
  const facilityDemandRef = useRef(facilityDemand);
  const rapidChargeTimeLeftRef = useRef(rapidChargeTimeLeft);
  const playerNameRef = useRef(playerName);
  const isSavingScoreRef = useRef(false);

  const { play: playStartSound } = useSound('./sounds/game_start.mp3');
  const { play: playChargeNormalLoopSound, stop: stopChargeNormalLoopSound } = useSound('./sounds/charging_normal_loop.mp3');
  const { play: playChargeRapidLoopSound, stop: stopChargeRapidLoopSound } = useSound('./sounds/charging_rapid_loop.mp3');
  const { play: playChargeBonusLoopSound, stop: stopChargeBonusLoopSound } = useSound('./sounds/charging_bonus_loop.mp3');
  const { play: playChargeStopSound } = useSound('./sounds/charge_stop.mp3');
  const { play: playBonusStartSound } = useSound('./sounds/bonus_start.mp3');
  const { play: playGameOverSound } = useSound('./sounds/game_over.mp3');
  
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

  const triggerScreenFlash = (color: 'green' | 'red') => {
    setScreenFlashColor(color);
    setTimeout(() => setScreenFlashColor(null), 300); // Flash duration
  };

  const triggerShakeScreen = () => {
    setShakeScreen(true);
    setTimeout(() => setShakeScreen(false), 300); // Shake duration (must match animation iterations * duration)
  };

  const fetchHighScores = useCallback(async () => {
    if (!supabase) {
      setHighScoresError("ランキング機能は現在利用できません。クライアント設定を確認してください。");
      setHighScoresLoading(false);
      return;
    }
    setHighScoresLoading(true);
    setHighScoresError(null);
    try {
      const { data, error, status } = await supabase
        .from('high_scores')
        .select('name, score')
        .order('score', { ascending: false })
        .limit(MAX_HIGH_SCORES);

      if (error) {
        console.error(`ハイスコアの読み込みエラー (ステータス: ${status}):`, error);
        throw error; 
      }
      setHighScores(data || []);
    } catch (err: any) {
      let detailedMessage = "スコアの読み込みに失敗しました。";
      if (err && err.message) {
        detailedMessage += ` (エラー: ${err.message})`;
      }
      console.error("キャッチされたハイスコア読み込みエラー:", err);
      setHighScoresError(detailedMessage + " ネットワーク接続またはSupabaseの設定を確認してください。");
      setHighScores([]);
    } finally {
      setHighScoresLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchHighScores();
  }, [fetchHighScores]);


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
    if (gameStateRef.current === GameState.PenaltyCoolDown || penaltyTimeLeft > 0) {
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


  const endGame = useCallback(async () => {
    if (gameStateRef.current === GameState.GameOver || isSavingScoreRef.current || showResultAnnouncement) {
      console.warn("endGame called but game is already over, score saving is in progress, or result announcement is active. Skipping duplicate execution.");
      return;
    }
    
    isSavingScoreRef.current = true;
    
    // Start game over transition
    setIsCharging(false);
    setIsRapidCharging(false); 
    clearAllIntervals();
    stopAllLoopingSoundsAndPlayStop(false);

    setIsGameOverTransition(true);
    setShowResultAnnouncement(true);
    setMessage(`ゲーム終了！`); // Clear previous messages
    
    setTimeout(async () => {
        setShowResultAnnouncement(false);
        // setIsGameOverTransition(false); // Keep the backdrop for the modal or let modal handle it
        
        setGameState(GameState.GameOver);
        const finalScore = scoreRef.current;
        setMessage(`ゲームオーバー、${playerNameRef.current || "プレイヤー"}！最終スコア: ${finalScore.toFixed(1)} kWh`);
        playGameOverSound();

        try {
          if (supabase) {
            const { error } = await supabase
              .from('high_scores')
              .insert([{ name: playerNameRef.current || "名無し", score: finalScore }]);
            
            if (error) {
              console.error("スコアの保存に失敗しました (Supabaseエラー):", error);
              setHighScoresError(`スコアの保存に失敗しました: ${error.message}`);
            } else {
              await fetchHighScores(); 
            }
          } else {
             console.warn("Supabaseクライアントが利用できないため、スコアは保存されません。");
             setHighScoresError("ランキング機能は現在利用できません。スコアは保存されませんでした。");
              setHighScores(prevHighScores => {
                const newScoreEntry: ScoreEntry = { name: playerNameRef.current || "名無し", score: finalScore };
                const updatedScores = [...prevHighScores, newScoreEntry];
                updatedScores.sort((a, b) => b.score - a.score);
                return updatedScores.slice(0, MAX_HIGH_SCORES);
              });
          }
        } catch (err: any) { 
          console.error("スコア保存処理中に予期せぬエラー:", err);
          setHighScoresError(`スコア保存処理中にエラーが発生しました: ${err.message || '不明なエラー'}`);
        } finally {
          isSavingScoreRef.current = false; 
        }
    }, 3000); // 3 second delay for "結果発表！"

  }, [clearAllIntervals, playGameOverSound, stopAllLoopingSoundsAndPlayStop, fetchHighScores, supabase, showResultAnnouncement]);

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
    setMessage("「充電開始」または「急速充電開始」をクリックしてください。");
    setIsGameOverTransition(false); // Ensure this is reset
  }, [spawnNewEV, generateDemandForecast]);

  const startGame = useCallback(() => {
    if (playerName.trim() === "") {
        setMessage("ゲームを開始するにはお名前を入力してください。");
        return;
    }
    playStartSound();
    resetGame();
    setGameState(GameState.Playing);
    setHighScoresError(null); 
    fetchHighScores();
  }, [resetGame, playStartSound, playerName, fetchHighScores]);
  
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
            setMessage("ペナルティ終了。再び充電できます！");
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
            setMessage("ボーナスタイム終了！");
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
            setMessage("急速充電時間が終了しました！");
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
          
          if (!bonusTimeActiveRef.current && (facilityDemandRef.current + intendedChargerOutput > CONTRACT_POWER)) { 
            stopAllLoopingSoundsAndPlayStop(); 
            setGameState(GameState.PenaltyCoolDown);
            setPenaltyTimeLeft(PENALTY_COOLDOWN_DURATION);
            setIsCharging(false); 
            if(isRapidChargingRef.current) setIsRapidCharging(false); 
            setConsecutiveSuccessfulCharges(0); 
            setMessage(`需要超過！施設過負荷。充電停止（${PENALTY_COOLDOWN_DURATION}秒）`);
            triggerScreenFlash('red');
            triggerShakeScreen();
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
              triggerScreenFlash('green'); // Success flash
              const rapidChargeContinuesForNextEV = isRapidChargingRef.current && rapidChargeTimeLeftRef.current > 0;

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
                
                const eligibleForBonusIncrement = !wasBonusActiveForThisEV;
                const newCount = eligibleForBonusIncrement ? prevSuccessCharges + 1 : prevSuccessCharges;
                
                if (newCount >= CONSECUTIVE_CHARGES_FOR_BONUS && !wasBonusActiveForThisEV) {
                  playBonusStartSound();
                  setBonusTimeActive(true);
                  setBonusTimeRemaining(BONUS_DURATION); 
                  setCurrentBonusOutput(FIXED_BONUS_CHARGER_OUTPUT); 
                  
                  if (!isRapidChargingRef.current) { 
                    setGameState(GameState.Bonus);
                  }
                  // setTimeLeft(prevTime => prevTime + BONUS_DURATION); // Removed: Bonus time no longer adds to game time
                  setMessage("ボーナスタイム！強化充電作動中！");
                  spawnNewEV(); 
                  return 0; 
                }
                
                setMessage(`${chargedEVName}が満充電です！ (+${chargedCapacity.toFixed(0)} kWh) 次のEVが到着します。`);
                spawnNewEV(); 
                return newCount; 
              });
              return null; 
            }
            return { ...prevEV, currentCharge: newCharge };
          });

          if (chargeAmount > 0) {
             if (isRapidChargingRef.current) setMessage(`急速充電中 ${actualRateEVAccepts.toFixed(1)} kW！`);
             else if (bonusTimeActiveRef.current) setMessage(`ボーナス充電中 ${actualRateEVAccepts.toFixed(1)} kW！`);
             else setMessage(`${actualRateEVAccepts.toFixed(1)} kWで充電中...`);
          } else if (intendedChargerOutput > 0) {
             setMessage("EVが最大入力に達したか、充電器からの電力供給がありません。需要を確認してください！");
          } else { 
             setMessage("充電器は作動していますが、電力が出力されていません。需要を確認してください！");
          }

        } else { 
            if (gameStateRef.current === GameState.Playing) {
                 if (bonusTimeActiveRef.current) {
                    setMessage("ボーナスタイム！「ボーナス充電開始」をクリック！");
                 } else {
                    setMessage("「充電開始」または「急速充電開始」をクリックしてください。");
                 }
            } else if (gameStateRef.current === GameState.Bonus) {
                 setMessage("ボーナスタイム！「ボーナス充電開始」をクリック！");
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
    if (isRapidChargingRef.current || (gameStateRef.current as GameState) === GameState.PenaltyCoolDown) return;

    if (isCharging) {
      setIsCharging(false);
      stopChargeNormalLoopSound(); 
      stopChargeBonusLoopSound();
      playChargeStopSound();
      setMessage("充電を停止しました。");
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
    if ((gameStateRef.current as GameState) === GameState.PenaltyCoolDown) return;

    if (isRapidCharging) { 
      setIsRapidCharging(false);
      setMessage(`急速充電を一時停止しました。残り${rapidChargeTimeLeftRef.current.toFixed(0)}秒です。`);
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
        setMessage("このゲームでは急速充電を使い切りました。");
        return;
      }

      if(isCharging) setIsCharging(false); 
      stopChargeNormalLoopSound(); 
      stopChargeBonusLoopSound(); 

      setIsRapidCharging(true);
      setHasActivatedRapidChargeThisGame(true); 
      
      setMessage(`急速充電作動！残り${rapidChargeTimeLeftRef.current.toFixed(0)}秒です。`);
      playChargeRapidLoopSound(true); 
    }
  };
  
  const mainButtonText = (): string => {
    if (isRapidCharging) return "N/A (急速充電中)";
    if (isCharging) {
        if (effectiveEVChargeRate > 0) return bonusTimeActive ? "ボーナス停止" : "充電停止";
        return "電力なし";
    }
    return bonusTimeActive ? "ボーナス充電開始" : "充電開始";
  };

  const mainButtonAriaLabel = (): string => {
    if (isRapidCharging) return "急速充電中は通常充電は利用できません";
    if (isCharging) return bonusTimeActive ? "ボーナス充電を停止" : "通常充電を停止";
    return bonusTimeActive ? "ボーナス充電を開始" : "通常充電を開始";
  };

  const rapidChargeButtonText = (): string => {
    if (isRapidCharging) return `急速停止 (${rapidChargeTimeLeft.toFixed(0)}秒)`;
    if (rapidChargeTimeLeft <= 0 && hasActivatedRapidChargeThisGame) return "急速充電使用済み";
    return `急速開始 (${RAPID_CHARGER_OUTPUT}kW / 残り${rapidChargeTimeLeft.toFixed(0)}秒)`;
  };
  
  const isRapidChargeButtonDisabled = (): boolean => {
    if (gameState === GameState.PenaltyCoolDown) return true; 
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
    if (gameState === GameState.PenaltyCoolDown) return 'bg-red-700 cursor-not-allowed'; 
    if (isRapidCharging) return 'bg-slate-600 cursor-not-allowed'; 
    if (bonusTimeActive) return isCharging ? 'bg-yellow-400' : 'bg-yellow-600 hover:bg-yellow-500';
    return isCharging ? 'bg-sky-500' : 'bg-sky-700 hover:bg-sky-600';
  };
  
  const handlePlayerNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerName(event.target.value);
  };

  const getScreenFlashClass = () => {
    if (!screenFlashColor) return 'opacity-0';
    if (screenFlashColor === 'green') return 'bg-green-500/30 opacity-100';
    if (screenFlashColor === 'red') return 'bg-red-500/30 opacity-100';
    return 'opacity-0';
  };


  return (
    <div className={`relative flex flex-col items-center min-h-screen p-4 selection:bg-sky-500 selection:text-sky-900 overflow-y-auto ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Screen Flash Overlay */}
      <div 
        className={`fixed inset-0 z-[1000] pointer-events-none transition-opacity duration-100 ${getScreenFlashClass()}`}
        aria-hidden="true"
      />

      {/* Game Over Transition Overlay and Message */}
      {isGameOverTransition && (
        <div 
          className="fixed inset-0 z-[1001] bg-black/70 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300"
          aria-hidden="true"
        >
          {showResultAnnouncement && (
            <h2 className="text-6xl sm:text-7xl font-extrabold text-white animate-pulse">
              結果発表！
            </h2>
          )}
        </div>
      )}


      <Modal isOpen={gameState === GameState.Idle} title="EVチャージャーさん">
        <p className="text-slate-300 mb-4 text-lg">刻一刻と変化するデマンド値に注意しながら、500kWの電力契約を超えないようにEVに充電しましょう。ランキング1位を目指せ！</p>
        
        <div className="mb-6">
          <label htmlFor="playerName" className="block text-sky-300 text-sm font-bold mb-2">お名前を入力してください:</label>
          <div className="flex items-center bg-slate-700 rounded-md shadow">
            <span className="pl-3 pr-2 text-slate-400">
              <UserIcon className="w-5 h-5" />
            </span>
            <input 
              type="text"
              id="playerName"
              value={playerName}
              onChange={handlePlayerNameChange}
              placeholder="例: チャージマスター"
              className="w-full p-3 bg-transparent text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-r-md"
              maxLength={20}
            />
          </div>
        </div>
        <button
          onClick={startGame}
          disabled={playerName.trim() === ""}
          className={`w-full text-xl sm:text-2xl font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-150 ease-in-out
            ${playerName.trim() === "" 
              ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-500 text-white transform hover:scale-105'}`}
          aria-label={playerName.trim() === "" ? "ゲームを開始するにはお名前を入力してください" : "ゲームを開始"}
        >
          ゲーム開始
        </button>
        <div className="mt-8 pt-6 border-t border-slate-700">
            <h3 className="text-2xl font-semibold mb-4 text-sky-400">ハイスコア</h3>
            {highScoresLoading && <p className="text-slate-300">スコアを読み込み中...</p>}
            {highScoresError && <p className="text-red-400 px-2 py-1 bg-red-900/50 rounded">{highScoresError}</p>}
            {!highScoresLoading && !highScoresError && highScores.length === 0 && <p className="text-slate-400">まだハイスコアはありません。</p>}
            {!highScoresLoading && !highScoresError && highScores.length > 0 && (
                <ul className="space-y-2 text-left">
                    {highScores.map((entry, index) => (
                        <li key={index} className="flex justify-between items-center p-2 bg-slate-700 rounded-md">
                            <span className="text-slate-300 font-medium">{index + 1}. {entry.name}</span>
                            <span className="text-sky-300 font-bold">{entry.score.toFixed(1)} kWh</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </Modal>

      <Modal 
        isOpen={gameState === GameState.GameOver && !showResultAnnouncement} 
        title="ゲームオーバー"
        className="z-[1002]"
      >
        <p className="text-slate-300 mb-6 text-xl">{message}</p>
        <div className="mb-6 pt-6 border-t border-slate-700">
            <h3 className="text-2xl font-semibold mb-4 text-sky-400">ハイスコアランキング</h3>
            {highScoresLoading && <p className="text-slate-300">ランキングを読み込み中...</p>}
            {highScoresError && <p className="text-red-400 px-2 py-1 bg-red-900/50 rounded">{highScoresError}</p>}
            {!highScoresLoading && !highScoresError && highScores.length === 0 && <p className="text-slate-400">まだランキングはありません。</p>}
            {!highScoresLoading && !highScoresError && highScores.length > 0 && (
                <ul className="space-y-2 text-left">
                    {highScores.map((entry, index) => (
                         <li key={index} className={`flex justify-between items-center p-3 rounded-md ${entry.name === (playerNameRef.current || "名無し") && entry.score === scoreRef.current ? 'bg-sky-600 ring-2 ring-sky-400' : 'bg-slate-700'}`}>
                            <span className="text-slate-200 font-medium text-lg">{index + 1}. {entry.name}</span>
                            <span className="text-amber-400 font-bold text-lg">{entry.score.toFixed(1)} kWh</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
        <button
          onClick={() => {
            setGameState(GameState.Idle);
            fetchHighScores(); 
            setIsGameOverTransition(false); // Reset transition state
          }}
          className="w-full text-xl sm:text-2xl font-bold py-3 px-6 bg-sky-600 hover:bg-sky-500 text-white rounded-lg shadow-lg transition-all duration-150 ease-in-out transform hover:scale-105"
          aria-label="タイトル画面に戻る"
        >
          タイトルに戻る
        </button>
      </Modal>

      {(gameState === GameState.Playing || gameState === GameState.Bonus || gameState === GameState.PenaltyCoolDown) && (
        <div className="w-full max-w-3xl bg-slate-800 text-white p-4 sm:p-6 rounded-xl shadow-2xl my-auto"> 
          <div className="mb-4 sm:mb-6">
            <GameInfoDisplay 
              playerName={playerName}
              score={score} 
              timeLeft={timeLeft} 
              bonusTimeActive={bonusTimeActive} 
              consecutiveCharges={consecutiveSuccessfulCharges}
              chargesForBonus={CONSECUTIVE_CHARGES_FOR_BONUS}
            />
          </div>
          
          <div className="mb-4 sm:mb-6">
            <EVDisplay ev={currentEV} />
          </div>

          <div className="mb-4 sm:mb-6">
            <DemandForecastGraph 
              forecastData={facilityDemandForecast}
              currentTimeIndex={currentDemandForecastIndex}
              currentChargerOutput={effectiveEVChargeRate}
              maxGraphValue={maxGraphYValue}
              contractPower={CONTRACT_POWER}
              height={120}
            />
          </div>

          <div className="mb-4 sm:mb-6">
            <FacilityStatusDisplay 
              facilityDemand={facilityDemand}
              effectiveEVChargeRate={effectiveEVChargeRate}
              isPenaltyActive={gameState === GameState.PenaltyCoolDown || penaltyTimeLeft > 0}
              isBonusActive={bonusTimeActive}
              isRapidCharging={isRapidCharging}
            />
          </div>

          <div 
            className={`p-2 sm:p-3 rounded-md mb-4 text-center font-medium transition-colors duration-300
              ${gameState === GameState.PenaltyCoolDown ? 'bg-red-500 text-white' : 
              (bonusTimeActive && !isRapidCharging ? 'bg-yellow-500 text-yellow-900' : 
              (isRapidCharging ? 'bg-purple-500 text-white' :
              'bg-slate-700 text-slate-300'))}`}
            role="alert"
            aria-live="polite"
          >
            {message}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              onClick={handleNormalChargeToggle}
              disabled={isRapidCharging || gameState === GameState.PenaltyCoolDown}
              className={`w-full text-lg sm:text-xl font-semibold py-3 sm:py-4 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800
                ${mainChargeButtonBgColor()}
                ${!isRapidCharging && gameState !== GameState.PenaltyCoolDown ? 'hover:opacity-90 transform hover:scale-105' : ''}
                ${bonusTimeActive && !isRapidCharging ? 'text-yellow-900 focus:ring-yellow-300' : 'text-white focus:ring-sky-400'}
              `}
              aria-label={mainButtonAriaLabel()}
              aria-pressed={isCharging && !isRapidCharging}
            >
              <ZapIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              {mainButtonText()}
            </button>
            
            <button
              onClick={handleRapidChargeButtonClick}
              disabled={isRapidChargeButtonDisabled()}
              className={`w-full text-lg sm:text-xl font-semibold py-3 sm:py-4 px-4 rounded-lg shadow-md transition-all duration-150 ease-in-out flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800
                ${isRapidCharging ? 'bg-purple-500 text-white hover:bg-purple-400 transform hover:scale-105 focus:ring-purple-300' : 
                 (isRapidChargeButtonDisabled() ? 'bg-slate-600 text-slate-400 cursor-not-allowed focus:ring-slate-500' : 'bg-teal-600 text-white hover:bg-teal-500 transform hover:scale-105 focus:ring-teal-400')}
              `}
              aria-label={isRapidCharging ? `急速充電を停止 (残り ${rapidChargeTimeLeft.toFixed(0)}秒)` : (isRapidChargeButtonDisabled() ? "急速充電は利用できません" : `急速充電を開始 (${RAPID_CHARGER_OUTPUT}kW、残り${rapidChargeTimeLeft.toFixed(0)}秒)`)}
              aria-pressed={isRapidCharging}
            >
              <ZapIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2" />
              {rapidChargeButtonText()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
