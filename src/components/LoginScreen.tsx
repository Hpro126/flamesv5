import React, { useState } from 'react';
import { User } from '../types';
import { getStoredUsers, saveStoredUsers, setActiveUser } from '../utils/storage';
import { Mail, Sparkles, ShieldAlert } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const isAdminEmail = trimmedEmail === 'thalaforareason586@gmail.com';

  const validateEmail = (val: string) => {
    return /\S+@\S+\.\S+/.test(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const currentTrimmedEmail = email.trim().toLowerCase();
    if (!currentTrimmedEmail) {
      setError('Please provide your email address.');
      return;
    }

    if (!validateEmail(currentTrimmedEmail)) {
      setError('Please provide a valid email format (e.g., name@domain.com).');
      return;
    }

    // Passcode security checks for Admin Account
    if (currentTrimmedEmail === 'thalaforareason586@gmail.com') {
      const trimmedPass = password.trim();
      if (!trimmedPass) {
        setError('This is a highly privileged account. Passcode is strictly required.');
        return;
      }
      if (trimmedPass !== '5689jkqw') {
        setError('ACCESS SYSTEM REJECTED: Invalid administrator passcode.');
        return;
      }
    }

    const users = getStoredUsers();
    let user = users.find((u) => u.email === currentTrimmedEmail);

    if (!user) {
      // Streamline: If user doesn't exist, register them automatically on the fly!
      const isAdmin = currentTrimmedEmail.includes('admin') || currentTrimmedEmail === 'thalaforareason586@gmail.com';
      user = {
        id: 'u_' + Math.random().toString(36).substring(2, 11),
        email: currentTrimmedEmail,
        createdAt: new Date().toISOString(),
        isAdmin: isAdmin
      };

      const updatedUsers = [...users, user];
      saveStoredUsers(updatedUsers);
    }

    // Set success & trigger immediate login
    setSuccess('Access Approved! Initializing FLAMES Matchmaker...');
    const targetUser = user;
    setTimeout(() => {
      setActiveUser(targetUser);
      onLoginSuccess(targetUser);
    }, 800);
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in" id="login-container">
      <div className="bg-white border-4 border-black neo-shadow-lg overflow-hidden relative">
        
        {/* Bold Title Bar */}
        <div className="bg-black text-white p-8 text-center border-b-4 border-black">
          <div className="font-display text-8xl leading-none tracking-tight text-center uppercase text-white hover:text-brand-pink transition-colors cursor-default select-none">
            FLAMES
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-[#FF4570] text-center mt-2.5 font-bold">
            // ENTER SYSTEM TO DECODE RELATIONSHIPS
          </p>
        </div>

        {/* Streamlined Identity Form */}
        <div className="p-8 bg-white">
          <form onSubmit={handleSubmit} id="auth-form" className="space-y-6">
            <div>
              <label htmlFor="email-input" className="block font-mono text-[11px] font-black uppercase tracking-widest text-black mb-3">
                [PROVIDE EMAIL ADDRESS TO ACCESS COMPATIBILITY ENGINE]
              </label>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-black" />
                </div>
                <input
                  id="email-input"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  className="block w-full pl-11 pr-4 py-4 border-4 border-black rounded-none focus:bg-yellow-50/20 focus:outline-none placeholder:text-zinc-300 text-black font-mono text-xs uppercase font-extrabold focus:ring-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {isAdminEmail && (
              <div className="animate-fade-in space-y-2">
                <label htmlFor="password-input" className="block font-mono text-[11px] font-black uppercase tracking-widest text-[#FF4570] mb-3">
                  [ADMIN PRIVILEGED ACCOUNT DETECTED - ENTER PASSCODE]
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                    <ShieldAlert className="h-4.5 w-4.5 text-[#FF4570]" />
                  </div>
                  <input
                    id="password-input"
                    type="password"
                    required
                    placeholder="••••••••••••••"
                    className="block w-full pl-11 pr-4 py-4 border-4 border-[#FF4570] bg-pink-50/10 focus:bg-pink-50/25 focus:outline-none placeholder:text-zinc-300 text-black font-mono text-xs uppercase font-extrabold focus:ring-0"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-brand-pink text-white border-2 border-black neo-shadow-sm font-mono text-xs flex items-start gap-2.5" id="error-message">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span className="uppercase font-bold tracking-tight">{error}</span>
              </div>
            )}

            {success && (
              <div className="p-4 bg-yellow-300 text-black border-2 border-black neo-shadow-sm font-mono text-xs flex items-start gap-2.5 animate-fade-in" id="success-message">
                <Sparkles className="w-4.5 h-4.5 shrink-0 text-black" />
                <span className="uppercase font-black tracking-tight">{success}</span>
              </div>
            )}

            <button
              id="submit-auth-btn"
              type="submit"
              className="w-full py-5 bg-black hover:bg-brand-pink text-white font-display text-2xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer hover:scale-[1.01] active:scale-95 transition-all duration-100"
            >
              Continue to Game →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
