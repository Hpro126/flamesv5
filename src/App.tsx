/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import { getActiveUser, setActiveUser } from './utils/storage';
import LoginScreen from './components/LoginScreen';
import FlamesGameScreen from './components/FlamesGameScreen';
import AdminScreen from './components/AdminScreen';
import { Heart, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeUser, setActiveUserState] = useState<User | null>(null);
  const [currentRoute, setCurrentRoute] = useState<'game' | 'admin'>('game');

  // Load user and route on mount
  useEffect(() => {
    setActiveUserState(getActiveUser());
    
    const handleUrlRoute = () => {
      if (window.location.pathname.endsWith('/admin')) {
        setCurrentRoute('admin');
      } else {
        setCurrentRoute('game');
      }
    };

    // Initial check
    handleUrlRoute();

    // Listen for back/forward events
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  const navigateTo = (route: 'game' | 'admin') => {
    setCurrentRoute(route);
    const path = route === 'admin' ? '/admin' : '/';
    window.history.pushState({}, '', path);
  };

  const handleLoginSuccess = (user: User) => {
    setActiveUserState(user);
    // If they logged in as an admin and were trying to access /admin, immediately send them there
    if (user.isAdmin && window.location.pathname.endsWith('/admin')) {
      navigateTo('admin');
    } else {
      navigateTo('game');
    }
  };

  const handleLogout = () => {
    setActiveUser(null);
    setActiveUserState(null);
    navigateTo('game');
  };

  return (
    <div className="min-h-screen bg-sand-bg text-black flex flex-col justify-between selection:bg-black selection:text-white relative overflow-x-hidden" id="app-wrapper">
      
      {/* Heavy typographic watermarks in background for brutalist styling */}
      <div className="absolute top-[8%] left-[4%] text-black/5 font-display text-[15vw] select-none pointer-events-none leading-none tracking-tighter">
        FLAMES
      </div>
      <div className="absolute bottom-[5%] right-[4%] text-black/5 font-display text-[12vw] select-none pointer-events-none leading-none tracking-tighter">
        DESTINY
      </div>

      {/* Main Container Wrapper */}
      <main className="flex-grow flex items-center justify-center p-4 py-12 relative z-10" id="main-content-flow">
        {!activeUser ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : currentRoute === 'admin' ? (
          activeUser.isAdmin ? (
            <AdminScreen onBackToGame={() => navigateTo('game')} />
          ) : (
            /* Access Denied Page for non-admins visiting /admin */
            <div className="w-full max-w-md bg-white border-4 border-black p-8 neo-shadow-lg text-center animate-fade-in" id="access-denied-panel">
              <div className="w-16 h-16 bg-brand-pink text-white flex items-center justify-center mx-auto mb-6 border-4 border-black neo-shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-display uppercase tracking-tight text-black">
                ACCESS DENIED 🔒
              </h2>
              <p className="font-mono text-xs text-gray-700 mt-4 leading-relaxed uppercase">
                LoggedIn: <span className="font-bold text-black underline">{activeUser.email}</span>. NO ADMINISTRATOR PRIVILEGES REGISTERED.
              </p>
              
              <div className="mt-6 p-4 bg-sand-bg border-2 border-black font-mono text-[11px] text-black text-left">
                <p className="font-bold flex items-center gap-1.5 mb-2 uppercase text-xs">
                  <ShieldCheck className="w-4 h-4 text-brand-pink shrink-0" />
                  Privileged Setup
                </p>
                Log out and sign in using the administrator email: <span className="font-bold select-all bg-black text-white px-1">thalaforareason586@gmail.com</span>.
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button
                  id="go-to-calc-denied"
                  onClick={() => navigateTo('game')}
                  className="w-full py-4 bg-black hover:bg-brand-pink text-white font-display uppercase text-lg tracking-wider border-2 border-black cursor-pointer hover:scale-[1.01] transition-transform duration-100"
                >
                  Return to calculator
                </button>
                <button
                  id="logout-denied"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-transparent hover:bg-black hover:text-white text-black font-mono text-xs font-bold border-2 border-black tracking-wider transition-colors duration-100 uppercase cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          )
        ) : (
          <FlamesGameScreen 
            user={activeUser} 
            onLogout={handleLogout} 
            onGoToAdmin={() => navigateTo('admin')} 
          />
        )}
      </main>

      <footer className="py-6 text-center font-mono text-xs font-black uppercase tracking-widest text-[#FF4570] relative z-10 border-t-4 border-black bg-white">
        // FLAMES
      </footer>
    </div>
  );
}
