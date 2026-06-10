import React, { useState, useEffect } from 'react';
import { User, FlamesRecord } from '../types';
import { calculateFlames, FLAMES_DETAILS } from '../utils/flames';
import { getStoredRecords, saveStoredRecords, getStoredSettings, syncRecordToWebhook } from '../utils/storage';
import { Heart, RefreshCw, Star, Info, ShieldAlert, Sparkles, CheckCircle } from 'lucide-react';

interface FlamesGameScreenProps {
  user: User;
  onLogout: () => void;
  onGoToAdmin?: () => void;
}

export default function FlamesGameScreen({ user, onLogout, onGoToAdmin }: FlamesGameScreenProps) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  
  // Game state
  const [gameState, setGameState] = useState<'idle' | 'running' | 'completed'>('idle');
  const [shufflingText, setShufflingText] = useState('PROSTHETIC DATA RETRIEVAL...');
  const [currentResult, setCurrentResult] = useState<any>(null);
  const [activeSettings, setActiveSettings] = useState(getStoredSettings());

  // Animation simulation variables
  const [eliminatedIndices, setEliminatedIndices] = useState<number[]>([]);
  const [currentIndicatorIndex, setCurrentIndicatorIndex] = useState<number | null>(null);
  const [sheetSyncStatus, setSheetSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  useEffect(() => {
    setActiveSettings(getStoredSettings());
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() || !name2.trim()) return;

    const result = calculateFlames(name1, name2);
    setCurrentResult(result);
    setGameState('running');
    setSheetSyncStatus('idle');

    setEliminatedIndices([]);
    setCurrentIndicatorIndex(null);

    if (result.remainingCount === 0) {
      setTimeout(() => {
        setGameState('completed');
        finalizeRecord(result);
      }, 1000);
      return;
    }

    // Step-by-step brutalist circular strikeout simulator
    let currentFlames = ['F', 'L', 'A', 'M', 'E', 'S'];
    let localEliminated: number[] = [];
    let curPointer = 0;
    const remainingCount = result.remainingCount;

    for (let round = 0; round < 5; round++) {
      // Step pointers
      for (let step = 0; step < remainingCount; step++) {
        const checkIndex = (curPointer + step) % currentFlames.length;
        const originalIndex = ['F', 'L', 'A', 'M', 'E', 'S'].indexOf(currentFlames[checkIndex]);
        
        await new Promise((resolve) => {
          setTimeout(() => {
            setCurrentIndicatorIndex(originalIndex);
            resolve(true);
          }, Math.max(80, Math.min(350, 1800 / remainingCount)));
        });
      }

      const elimIndexInCurrent = (curPointer + remainingCount - 1) % currentFlames.length;
      const letterToEliminate = currentFlames[elimIndexInCurrent];
      const targetOriginalIndex = ['F', 'L', 'A', 'M', 'E', 'S'].indexOf(letterToEliminate);
      
      localEliminated.push(targetOriginalIndex);
      setEliminatedIndices([...localEliminated]);
      setShufflingText(`STRICKEN CODE: "${letterToEliminate}" // ROUND ${round + 1}`);

      currentFlames.splice(elimIndexInCurrent, 1);
      curPointer = elimIndexInCurrent % currentFlames.length;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setCurrentIndicatorIndex(null);
    setShufflingText("ASTROLOGICAL COMPATIBILITY SYNCHRONIZED!");
    await new Promise((resolve) => setTimeout(resolve, 600));
    setGameState('completed');
    finalizeRecord(result);
  };

  const finalizeRecord = (result: any) => {
    const newRecord: FlamesRecord = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userEmail: user.email,
      name1: name1.trim(),
      name2: name2.trim(),
      resultLetter: result.resultLetter,
      resultLabel: result.resultLabel,
      timestamp: new Date().toISOString(),
      syncedToSheet: false
    };

    const currentRecords = getStoredRecords();
    const updatedRecords = [newRecord, ...currentRecords];
    saveStoredRecords(updatedRecords);

    const settings = getStoredSettings();
    if (settings.googleAppScriptUrl) {
      setSheetSyncStatus('syncing');
      syncRecordToWebhook(newRecord, settings.googleAppScriptUrl)
        .then((ok) => {
          if (ok) {
            setSheetSyncStatus('synced');
            newRecord.syncedToSheet = true;
            const syncedList = updatedRecords.map(r => r.id === newRecord.id ? { ...r, syncedToSheet: true } : r);
            saveStoredRecords(syncedList);
          } else {
            setSheetSyncStatus('failed');
          }
        })
        .catch(() => setSheetSyncStatus('failed'));
    }
  };

  const handleReset = () => {
    setName1('');
    setName2('');
    setGameState('idle');
    setCurrentResult(null);
    setEliminatedIndices([]);
    setCurrentIndicatorIndex(null);
    setSheetSyncStatus('idle');
  };

  const activeDetail = currentResult ? FLAMES_DETAILS[currentResult.resultLetter as 'F' | 'L' | 'A' | 'M' | 'E' | 'S' | 'N'] : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6" id="flames-calculator-section">
      
      {/* App Header Bar: Brutalist High Contrast layout */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-white border-4 border-black p-4 neo-shadow-sm gap-3">
        <div className="flex items-center gap-2 font-mono text-xs font-black uppercase">
          <span className="w-3 h-3 bg-brand-pink border-2 border-black inline-block animate-pulse"></span>
          <span>SYSTEM ONLINE:</span>
          <span className="underline decoration-wavy decoration-brand-pink text-black max-w-[150px] md:max-w-xs truncate" title={user.email}>
            {user.email}
          </span>
          {user.isAdmin && (
            <span className="px-1.5 py-0.5 bg-black text-white text-[9px] font-mono uppercase tracking-widest">
              [CRITICAL_ADMIN]
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {user.isAdmin && onGoToAdmin && (
            <button
              id="admin-nav-btn"
              onClick={onGoToAdmin}
              className="text-xs bg-yellow-300 hover:bg-black hover:text-yellow-300 text-black font-mono font-black uppercase tracking-wider px-3.5 py-1.5 border-2 border-black cursor-pointer transition-colors"
            >
              Control Panel
            </button>
          )}
          
          <button
            id="logout-btn"
            onClick={onLogout}
            className="text-xs text-black font-mono uppercase underline hover:text-brand-pink tracking-wider font-extrabold cursor-pointer py-1 px-2"
          >
            Logout
          </button>
        </div>
      </div>

      {gameState === 'idle' && (
        <div className="bg-white border-4 border-black p-8 relative overflow-hidden neo-shadow-lg animate-fade-in">
          
          {/* Brutalist Title Header */}
          <div className="mb-10 text-center relative z-10">
            <h2 className="font-display text-7xl md:text-8xl leading-none uppercase tracking-tight text-black flex flex-col justify-center items-center">
              FLAMES
              <span className="text-3xl text-brand-pink font-mono tracking-widest mt-1 font-black">
                [COMPATIBILITY DECODER]
              </span>
            </h2>
            <div className="w-24 h-1.5 bg-black mx-auto mt-4"></div>
          </div>

          <form onSubmit={handleCalculate} className="space-y-8 relative z-10">
            <div className="space-y-8">
              
              {/* Partner 1 Input */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-black uppercase tracking-widest text-zinc-500">
                  PLAYER ONE // YOUR FULL NAME
                </label>
                <input
                  id="name1-input"
                  type="text"
                  required
                  placeholder="E.G. JULIET CAPULET"
                  className="block w-full bg-transparent border-b-4 border-black text-4xl md:text-5xl font-display uppercase tracking-tight focus:outline-none focus:border-brand-pink pb-2 text-black placeholder:text-zinc-200 transition-colors"
                  value={name1}
                  onChange={(e) => setName1(e.target.value)}
                />
              </div>

              {/* Partner 2 Input */}
              <div className="space-y-2">
                <label className="block font-mono text-xs font-black uppercase tracking-widest text-zinc-500">
                  PLAYER TWO // CRUSH NAME
                </label>
                <input
                  id="name2-input"
                  type="text"
                  required
                  placeholder="E.G. ROMEO MONTAGUE"
                  className="block w-full bg-transparent border-b-4 border-black text-4xl md:text-5xl font-display uppercase tracking-tight focus:outline-none focus:border-brand-pink pb-2 text-black placeholder:text-zinc-200 transition-colors"
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                id="calculate-btn"
                type="submit"
                className="w-full py-5 bg-black hover:bg-brand-pink text-white font-display text-3xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer hover:scale-[1.01] active:scale-95 transition-all duration-100"
              >
                Let destiny decide!
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Calculating Status Animation */}
      {gameState === 'running' && (
        <div className="bg-white border-4 border-black p-8 py-14 text-center relative overflow-hidden neo-shadow-lg animate-fade-in" id="calculation-animation-card">
          <div className="absolute top-0 left-0 right-0 h-3 bg-brand-pink"></div>

          <p className="font-mono text-xs tracking-widest text-black font-black uppercase mb-8" id="status-shuffling-text">
            // {shufflingText}
          </p>

          {/* Highlight Name Pair */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-12">
            <span className="font-display text-4xl text-black uppercase tracking-tight max-w-[240px] truncate border-b-4 border-black pb-1">
              {name1}
            </span>
            <div className="w-12 h-12 rounded-none bg-yellow-300 border-4 border-black flex items-center justify-center text-black font-mono font-bold animate-spin">
              VS
            </div>
            <span className="font-display text-4xl text-black uppercase tracking-tight max-w-[240px] truncate border-b-4 border-black pb-1">
              {name2}
            </span>
          </div>

          {/* Letter Circles Grid - Brutalist heavy boxes */}
          <div className="grid grid-cols-6 gap-3 max-w-md mx-auto relative mb-10">
            {['F', 'L', 'A', 'M', 'E', 'S'].map((lettr, idx) => {
              const isEliminated = eliminatedIndices.includes(idx);
              const isActive = currentIndicatorIndex === idx;

              return (
                <div
                  key={lettr}
                  className={`aspect-square flex flex-col items-center justify-center border-4 font-display text-3xl transition-all duration-100 relative ${
                    isEliminated
                      ? 'border-gray-200 bg-gray-100 text-gray-300 scale-95'
                      : isActive
                      ? 'border-black bg-brand-pink text-white scale-110 shadow-none ring-4 ring-yellow-300'
                      : 'border-black bg-white text-black neo-shadow-sm'
                  }`}
                >
                  <span>{lettr}</span>
                  {/* Cancel Sign */}
                  {isEliminated && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[90%] h-1 bg-black rotate-45"></div>
                    </div>
                  )}
                  {/* Small pointer indicator */}
                  {isActive && (
                    <div className="absolute -top-4 bg-black text-white px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold tracking-tighter">
                      ACTIVE
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="max-w-xs mx-auto font-mono text-xs uppercase text-zinc-500 font-bold">
            REMAINING MATCH COUNT: <span className="font-mono text-white font-extrabold text-sm bg-black px-3 py-1 neo-shadow-sm ml-1">{currentResult?.remainingCount || 0}</span>
          </div>
        </div>
      )}

      {/* Result Presentation */}
      {gameState === 'completed' && activeDetail && (
        <div className="bg-white border-4 border-black overflow-hidden neo-shadow-lg animate-fade-in" id="result-victory-card">
          
          {/* Top Banner Ribbon */}
          <div className="py-10 text-center border-b-4 border-black bg-black text-white relative">
            <p className="font-mono text-xs uppercase tracking-widest text-brand-pink font-bold mb-4">
              // FORECAST ESTABLISHED // FATE REVEALED
            </p>
            
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="text-6xl mb-2">{activeDetail.emoji}</span>
              <h1 className="text-7xl font-display uppercase tracking-tight text-white leading-none">
                {activeDetail.label}
              </h1>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <span className="text-xs bg-white text-black font-mono font-black uppercase px-3 py-1 border-2 border-white">
                FATE CODE: {activeDetail.letter}
              </span>
              <span className="text-xs bg-brand-pink text-white font-mono font-black uppercase px-3 py-1 border-2 border-brand-pink">
                SCORE COUNT: {currentResult.remainingCount}
              </span>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-8">
            {/* Names Header */}
            <div className="text-black font-display text-3xl uppercase tracking-wider text-center border-b-4 border-black pb-4 mb-6">
              {name1} + {name2}
            </div>

            {/* Quote of the Day */}
            <blockquote className="border-l-8 border-black pl-5 py-2 text-left text-sm font-mono uppercase bg-yellow-300 text-black mb-8 leading-relaxed font-bold">
              "{activeDetail.quote}"
            </blockquote>

            {/* Description Text */}
            <p className="text-black font-sans leading-relaxed text-sm mb-8 uppercase font-semibold">
              {activeDetail.description}
            </p>

            {/* Google Sheets Sync Indicator if using Webhook */}
            {user.isAdmin && activeSettings.googleAppScriptUrl && (
              <div className="mb-8 p-4 border-4 border-black bg-white inline-flex items-center gap-3 text-xs font-mono text-black w-full text-left uppercase font-bold">
                <span className={`w-3.5 h-3.5 border-2 border-black shrink-0 ${
                  sheetSyncStatus === 'synced' ? 'bg-emerald-500' :
                  sheetSyncStatus === 'syncing' ? 'bg-yellow-300 animate-pulse' :
                  sheetSyncStatus === 'failed' ? 'bg-brand-pink' : 'bg-zinc-300'
                }`}></span>
                <span>
                  {sheetSyncStatus === 'synced' && '✓ SUCCESS: RESULTS STREAMED TO GOOGLE SHEET'}
                  {sheetSyncStatus === 'syncing' && 'STREAMING TO ADMIN GOOGLE SHEET...'}
                  {sheetSyncStatus === 'failed' && 'ERROR: GOOGLE SHEET STREAM FAILED'}
                  {sheetSyncStatus === 'idle' && 'SYSTEM INTEGRATION PRESENT: STANDBY...'}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                id="reset-calculator-btn"
                onClick={handleReset}
                className="py-4 bg-black hover:bg-brand-pink text-white font-display text-2xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer text-center"
              >
                Try Another Crush
              </button>
              
              {user.isAdmin && onGoToAdmin && (
                <button
                  id="admin-results-view"
                  onClick={onGoToAdmin}
                  className="py-4 bg-white hover:bg-zinc-100 text-black font-display text-2xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer text-center"
                >
                  View logs
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
