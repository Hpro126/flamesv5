import React, { useState, useEffect } from 'react';
import { User, FlamesRecord, SystemSettings } from '../types';
import { FLAMES_DETAILS } from '../utils/flames';
import { 
  getStoredUsers, 
  saveStoredUsers, 
  getStoredRecords, 
  saveStoredRecords, 
  getStoredSettings, 
  saveStoredSettings,
  syncRecordToWebhook
} from '../utils/storage';
import { 
  Users, 
  Settings, 
  History, 
  FileSpreadsheet, 
  Heart, 
  Search, 
  ArrowLeft, 
  CloudLightning, 
  CheckCircle, 
  Copy, 
  Check, 
  Database,
  Trash2,
  ListFilter,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Bar, 
  Line, 
  ComposedChart 
} from 'recharts';

interface AdminScreenProps {
  onBackToGame: () => void;
}

export default function AdminScreen({ onBackToGame }: AdminScreenProps) {
  // Load data
  const [usersList, setUsersList] = useState<User[]>([]);
  const [recordsList, setRecordsList] = useState<FlamesRecord[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getStoredSettings());

  // Search/Filters states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFilter, setCurrentFilter] = useState<'ALL' | 'F' | 'L' | 'A' | 'M' | 'E' | 'S'>('ALL');
  const [activeTab, setActiveTab] = useState<'analytics' | 'history' | 'users' | 'settings'>('analytics');

  // Interactive feedback
  const [copiedScript, setCopiedScript] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState('');
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [syncingAll, setSyncingAll] = useState(false);
  const [loadingSheetsData, setLoadingSheetsData] = useState(false);

  const fetchRecordsFromSheets = async (url: string) => {
    if (!url) return;
    setLoadingSheetsData(true);
    setSyncStatusMsg('RETRIEVING COMPATIBILITY RECORDS FROM SPREADSHEET...');
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data && data.status === 'success' && Array.isArray(data.records)) {
        const sheetRecords: FlamesRecord[] = data.records.map((r: any, idx: number) => ({
          id: 'sheet_' + idx + '_' + (r.timestamp || Date.now()),
          userEmail: r.userEmail || 'Anonymous',
          name1: r.name1 || '',
          name2: r.name2 || '',
          resultLetter: r.resultLetter || r.letterCode || 'N',
          resultLabel: r.resultLabel || r.resultLabel || 'Unknown',
          timestamp: r.timestamp || new Date().toISOString(),
          syncedToSheet: true
        }));
        
        sheetRecords.reverse();

        const localRecords = getStoredRecords();
        const merged = [...localRecords];

        sheetRecords.forEach(sr => {
          const exists = merged.some(lr => 
            lr.timestamp && sr.timestamp && Math.abs(new Date(lr.timestamp).getTime() - new Date(sr.timestamp).getTime()) < 1000
          );
          if (!exists) {
            merged.push(sr);
          }
        });

        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        saveStoredRecords(merged);
        setRecordsList(merged);
        setSyncStatusMsg(`COMPLETED: SYNCRONIZED ${sheetRecords.length} RUNS FROM SPREADSHEET.`);
      } else {
        setSyncStatusMsg('INFO: NO DATA YET, NOT CONFIGURED, OR SHEETS ENDPOINT EMPTY.');
      }
    } catch (err) {
      console.error('Failed to get sheets data:', err);
      setSyncStatusMsg('PULL EXCEPTION: PURE STATIC MODE. SPREADSHEET EMPTY OR CORS EXPIRED.');
    } finally {
      setLoadingSheetsData(false);
      setTimeout(() => setSyncStatusMsg(''), 4500);
    }
  };

  // Load everything on start
  useEffect(() => {
    setUsersList(getStoredUsers());
    setRecordsList(getStoredRecords());
    const storedSettings = getStoredSettings();
    setSettings(storedSettings);
    
    if (storedSettings.googleAppScriptUrl) {
      fetchRecordsFromSheets(storedSettings.googleAppScriptUrl);
    }
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSettings(settings);
    setSaveSettingsSuccess('SUCCESS: SPEECH INTEGRATOR GATEWAY CONNECTED!');
    setTimeout(() => setSaveSettingsSuccess(''), 3000);
  };

  const clearAllData = () => {
    if (window.confirm('WARNING: ARE YOU ABSOLUTELY SURE YOU WANT TO PURGE ALL COMPATIBILITY ENTRIES? LOGIN DATA REMAINS.')) {
      saveStoredRecords([]);
      setRecordsList([]);
    }
  };

  const handleCopyScript = () => {
    const rawScript = `/** 
 * Google Apps Script for automations (With Two-Way Database Support)
 * 1. Open sheets.new
 * 2. Click Extensions > Apps Script
 * 3. Replace all default code with below
 * 4. Click 'Deploy' > 'New deployment'
 * 5. Type: Web App, Run as: Me, Who has access: Anyone
 * 6. Copy the resulting URL and paste in Admin panel!
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add headers if missing
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp (UTC)", "User Account Email", "Name 1 (User)", "Name 2 (Crush)", "Result Relationship", "Result Letter"]);
      sheet.getRange(1, 1, 1, 6)
        .setFontWeight("bold") 
        .setBackground("#FDF2F8")
        .setFontColor("#DB2777")
        .setHorizontalAlignment("center");
      sheet.setRowHeight(1, 30);
    }
    
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.userEmail || "Anonymous",
      data.name1,
      data.name2,
      data.resultLabel,
      data.resultLetter
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", syncedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var data = [];
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][2] || rows[i][3]) {
        var rowTime = rows[i][0];
        var timestampStr = "";
        try {
          if (rowTime instanceof Date) {
            timestampStr = rowTime.toISOString();
          } else {
            timestampStr = new Date(rowTime).toISOString();
          }
        } catch(e) {
          timestampStr = rowTime ? rowTime.toString() : new Date().toISOString();
        }
        
        data.push({
          timestamp: timestampStr,
          userEmail: rows[i][1] || "Anonymous",
          name1: rows[i][2] || "",
          name2: rows[i][3] || "",
          resultLabel: rows[i][4] || "",
          resultLetter: rows[i][5] || ""
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", records: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

    navigator.clipboard.writeText(rawScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleBatchSync = async () => {
    if (!settings.googleAppScriptUrl) {
      alert('Please configure your Google Apps Script Web App URL under Settings first!');
      return;
    }

    setSyncingAll(true);
    setSyncStatusMsg('BATCH INITIALIZING: PIPING ENTRIES TO SPREADSHEET ROW...');

    const unsynced = recordsList.filter(r => !r.syncedToSheet);
    if (unsynced.length === 0) {
      setSyncStatusMsg('NO PENDING ENTRIES FOR BATCH SYNC. ALL CORRESPONDENCES SENT.');
      setSyncingAll(false);
      setTimeout(() => setSyncStatusMsg(''), 3000);
      return;
    }

    let successCount = 0;
    const updatedRecords = [...recordsList];

    for (const record of unsynced) {
      const ok = await syncRecordToWebhook(record, settings.googleAppScriptUrl);
      if (ok) {
        successCount++;
        const targetIdx = updatedRecords.findIndex(r => r.id === record.id);
        if (targetIdx !== -1) {
          updatedRecords[targetIdx] = { ...updatedRecords[targetIdx], syncedToSheet: true };
        }
      }
    }

    saveStoredRecords(updatedRecords);
    setRecordsList(updatedRecords);
    setSyncingAll(false);
    setSyncStatusMsg(`BATCH PIPELINE COMPLETE: SUCCESSFUL SYNC OF ${successCount} ENTRIES.`);
    setTimeout(() => setSyncStatusMsg(''), 3000);
  };

  // Dynamically compute the unified list of all users by searching emails from game logs & registered logins
  const allUsersList = React.useMemo(() => {
    const userMap = new Map<string, User>();

    // 1. Add locally registered logins
    usersList.forEach(u => {
      const emailLower = u.email.trim().toLowerCase();
      userMap.set(emailLower, { ...u, email: emailLower });
    });

    // 2. Extract and discover accounts from the gameplay records (Google Sheet synced logins)
    recordsList.forEach(rec => {
      const email = rec.userEmail.trim();
      if (!email || email.toLowerCase() === 'anonymous') return;
      const emailLower = email.toLowerCase();

      if (!userMap.has(emailLower)) {
        const isAdmin = emailLower.includes('admin') || emailLower === 'thalaforareason586@gmail.com';
        userMap.set(emailLower, {
          id: `u_derived_${emailLower.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: emailLower,
          createdAt: rec.timestamp || new Date().toISOString(),
          isAdmin: isAdmin
        });
      } else {
        const existing = userMap.get(emailLower)!;
        if (rec.timestamp && new Date(rec.timestamp).getTime() < new Date(existing.createdAt).getTime()) {
          // Track the earliest recorded timestamp as account creation metric
          existing.createdAt = rec.timestamp;
        }
      }
    });

    const list = Array.from(userMap.values()).filter(
      usr => usr.email.trim().toLowerCase() !== 'thalaforareason586@gmail.com'
    );
    
    // Sort: Newest logins first
    list.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [usersList, recordsList]);

  const totalUsers = allUsersList.length;
  const totalGames = recordsList.length;
  
  const resultCounts = recordsList.reduce((acc, r) => {
    acc[r.resultLetter] = (acc[r.resultLetter] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let topResultLabel = 'NONE RECOVERED';
  let maxCount = 0;
  (Object.entries(resultCounts) as [string, number][]).forEach(([letter, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topResultLabel = FLAMES_DETAILS[letter as 'F'|'L'|'A'|'M'|'E'|'S'|'N']?.label || letter;
    }
  });

  // Graph 1: Map every single unique user chronologically to have a dedicated point
  const userRegistrationsData = React.useMemo(() => {
    // Sort chronologically (oldest to newest) to show progressive user signup timeline
    const chronologicalList = [...allUsersList].sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return chronologicalList.map((u, index) => {
      let istTimeStr = '';
      const d = new Date(u.createdAt);
      const timestampUnix = d.getTime();
      try {
        const formatter = new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        istTimeStr = formatter.format(d);
      } catch (e) {
        istTimeStr = u.createdAt ? u.createdAt.substring(0, 16).replace('T', ' ') : 'UNKNOWN';
      }

      const emailPrefix = u.email.split('@')[0];

      return {
        unitKey: `U${index+1}`,
        timestampUnix,
        name: emailPrefix,
        email: u.email,
        timestamp: istTimeStr,
        // Represents this individual user point
        'Registration Index': index + 1,
        'Growth Volume': index + 1,
        // Secondary metric for bar
        'Unit': 1
      };
    });
  }, [allUsersList]);

  // Graph 2: Hourly pattern tracker in IST (mapping peak 24-hour traffic clocks)
  const liveUsageData = React.useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hourStr: `${String(i).padStart(2, '0')}:00`,
      'Plays Recorded': 0,
      'Active Users': new Set<string>()
    }));

    recordsList.forEach(rec => {
      if (!rec.timestamp) return;
      try {
        const d = new Date(rec.timestamp);
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          hour12: false
        });
        const parts = formatter.formatToParts(d);
        const hourVal = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        
        if (hourVal >= 0 && hourVal < 24) {
          hours[hourVal]['Plays Recorded'] += 1;
          if (rec.userEmail && rec.userEmail.toLowerCase() !== 'anonymous') {
            hours[hourVal]['Active Users'].add(rec.userEmail.trim().toLowerCase());
          }
        }
      } catch (e) {}
    });

    return hours.map(h => ({
      hour: h.hourStr,
      'Plays Recorded': h['Plays Recorded'],
      'Active Users': h['Active Users'].size
    }));
  }, [recordsList]);

  const filteredRecords = recordsList.filter(r => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      r.userEmail.toLowerCase().includes(query) ||
      r.name1.toLowerCase().includes(query) ||
      r.name2.toLowerCase().includes(query) ||
      r.resultLabel.toLowerCase().includes(query);
    
    const matchesFilter = currentFilter === 'ALL' || r.resultLetter === currentFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8" id="admin-panel-container">
      
      {/* Header and Back Link Brutalist Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border-4 border-black p-8 neo-shadow-lg">
        <div>
          <span className="font-mono text-xs font-black bg-black text-white px-2 py-0.5 uppercase tracking-widest">
            HOST: fl-am-es.netlify.app/admin
          </span>
          <h1 className="text-5xl font-display uppercase tracking-tight text-black mt-2">
            DATABASE CONTROL
          </h1>
          <p className="text-black font-mono text-[11px] uppercase tracking-wider mt-1 font-bold text-zinc-500">
            // INTERACTIVE COMPATIBILITY HISTOGRAM • USER LISTS • CLOUD PIPELINES
          </p>
        </div>
        
        <button
          id="back-to-game-btn"
          onClick={onBackToGame}
          className="flex items-center gap-2 font-display text-xl bg-black hover:bg-brand-pink text-white uppercase tracking-wider px-6 py-4 border-4 border-black neo-shadow cursor-pointer transition-transform duration-100 uppercase"
        >
          <ArrowLeft className="w-5 h-5" />
          RETURN TO LAUNCHER
        </button>
      </div>

      {/* Metrics Cards Grid - Heavy Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-panel">
        
        {/* Total Users */}
        <div className="bg-white border-4 border-black p-6 neo-shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center shrink-0 border-2 border-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-zinc-400">UNIQUE USERS</p>
            <p className="font-display text-3xl leading-none mt-1 text-black">{totalUsers}</p>
          </div>
        </div>

        {/* Total Runs */}
        <div className="bg-white border-4 border-black p-6 neo-shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center shrink-0 border-2 border-black">
            <Heart className="w-6 h-6 fill-white" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-zinc-400">GAMES DECODED</p>
            <p className="font-display text-3xl leading-none mt-1 text-black">{totalGames}</p>
          </div>
        </div>

        {/* Top Result */}
        <div className="bg-white border-4 border-black p-6 neo-shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-black text-white flex items-center justify-center shrink-0 border-2 border-black">
            <CloudLightning className="w-6 h-6" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-zinc-400">DOMINANT FATE</p>
            <p className="font-display text-2xl leading-none mt-1 text-brand-pink uppercase truncate max-w-[130px]" title={topResultLabel}>
              {topResultLabel}
            </p>
          </div>
        </div>

        {/* Google Sheet Connected */}
        <div className="bg-white border-4 border-black p-6 neo-shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 flex items-center justify-center shrink-0 border-2 border-black ${
            settings.googleAppScriptUrl ? 'bg-yellow-300 text-black' : 'bg-brand-pink text-white'
          }`}>
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <p className="font-mono text-[10px] font-black uppercase text-zinc-400">GOOGLE STREAM</p>
            <p className="font-mono text-xs font-black uppercase tracking-wider mt-1 text-black">
              {settings.googleAppScriptUrl ? '✓ ATTACHED' : '⛑ OFFLINE'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-col md:flex-row border-b-4 border-black gap-0 bg-transparent flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`py-4 px-6 font-display text-lg uppercase tracking-wider transition-colors cursor-pointer border-t-4 border-x-4 border-black -mb-[4px] relative z-10 flex items-center justify-center gap-2 ${
            activeTab === 'analytics' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
          }`}
        >
          <BarChart3 className="w-5 h-5 shrink-0" />
          01 // ANALYTICS DASHBOARD
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`py-4 px-6 font-display text-lg uppercase tracking-wider transition-colors cursor-pointer border-t-4 border-r-4 border-black md:border-l-0 border-l-4 -mb-[4px] relative z-10 flex items-center justify-center gap-2 ${
            activeTab === 'history' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
          }`}
        >
          <History className="w-5 h-5 shrink-0" />
          02 // CALCULATION LOGS
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-4 px-6 font-display text-lg uppercase tracking-wider transition-colors cursor-pointer border-t-4 border-r-4 border-black md:border-l-0 border-l-4 -mb-[4px] relative z-10 flex items-center justify-center gap-2 ${
            activeTab === 'users' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
          }`}
        >
          <Users className="w-5 h-5 shrink-0" />
          03 // USER RECORDS
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-4 px-6 font-display text-lg uppercase tracking-wider transition-colors cursor-pointer border-t-4 border-r-4 border-black md:border-l-0 border-l-4 -mb-[4px] relative z-10 flex items-center justify-center gap-2 ${
            activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-black hover:bg-zinc-100'
          }`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          04 // CLOUD PIPELINE SETTINGS
        </button>
      </div>

      {/* Tabs Contents - Solid Brutalist Flat Sheet */}
      <div className="bg-white border-4 border-black p-8 neo-shadow-lg min-h-[350px]">
        
        {/* TAB 0: ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Real-time description note */}
            <div className="p-6 bg-yellow-105 border-4 border-black neo-shadow-sm flex items-start gap-4" style={{ backgroundColor: '#fef08a' }}>
              <Activity className="w-7 h-7 text-black shrink-0" />
              <div className="text-xs font-mono uppercase text-black leading-relaxed">
                <p className="font-black text-black text-sm mb-1">[REAL-TIME TELEMETRY & SYSTEM TRAFFIC PATTERNS]:</p>
                <p className="font-bold text-zinc-800 leading-normal">
                  VISUALIZING SYSTEM TRAFFIC AND UNIQUE ACCOUNTS ACQUIRED. ALL TIMESTAMPS HAVE BEEN AUTOMATICALLY MAPPED TO INDIAN STANDARD TIME (IST - GMT+5:30) AS REQUESTED.
                </p>
              </div>
            </div>

            {/* Dashboard Graphs Layout (Single Full-Width Continuous Timeline) */}
            <div className="w-full">
              
              {/* Card 1: Unique Users Over Time */}
              <div className="bg-white border-4 border-black p-6 neo-shadow-sm flex flex-col">
                <h3 className="font-mono text-sm font-black uppercase tracking-wider text-black border-b-2 border-black pb-3 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>01 // UNIQUE USER REGISTRATIONS TIMELINE</span>
                  <span className="text-xs text-zinc-400 font-bold bg-zinc-100 px-2 py-1 uppercase font-mono">REAL TIME SCALE INTERVALS (IST)</span>
                </h3>
                
                {userRegistrationsData.length === 0 ? (
                  <div className="flex-1 min-h-[300px] flex items-center justify-center text-zinc-400 font-mono text-xs italic">
                    NO USER REGISTRATION RECORDS FOUND // EXPECTING SYSTEM LOGINS
                  </div>
                ) : (
                  <div className="w-full h-[360px] font-mono text-xs" style={{ minHeight: '360px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={userRegistrationsData}
                        margin={{ top: 10, right: 20, left: -20, bottom: 20 }}
                      >
                        <defs>
                          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF4570" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#FF4570" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                        <XAxis 
                          dataKey="timestampUnix" 
                          type="number"
                          scale="time"
                          domain={['dataMin', 'dataMax']}
                          stroke="#000" 
                          tickLine={{ stroke: '#000', strokeWidth: 2 }}
                          axisLine={{ stroke: '#000', strokeWidth: 3 }}
                          tick={{ fill: '#000', fontWeight: 'bold' }}
                          tickFormatter={(unix) => {
                            try {
                              const d = new Date(unix);
                              return new Intl.DateTimeFormat('en-IN', {
                                timeZone: 'Asia/Kolkata',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              }).format(d);
                            } catch(e) {
                              return '';
                            }
                          }}
                        />
                        <YAxis 
                          stroke="#000"
                          tickLine={{ stroke: '#000', strokeWidth: 2 }}
                          axisLine={{ stroke: '#000', strokeWidth: 3 }}
                          tick={{ fill: '#000', fontWeight: 'bold' }}
                        />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white border-4 border-black p-3.5 neo-shadow-sm font-mono text-[11px] text-black">
                                  <p className="font-black text-[#FF4570] uppercase">[USER REGISTRATION POINT]</p>
                                  <p className="mt-1"><span className="text-zinc-400">EMAIL:</span> <span className="font-bold text-black underline">{data.email}</span></p>
                                  <p><span className="text-zinc-400">TIME (IST):</span> <span className="font-bold text-black">{data.timestamp}</span></p>
                                  <p className="mt-2 border-t border-dashed border-zinc-300 pt-2"><span className="text-zinc-500">GROWTH STAGE:</span> <span className="font-black text-[#FF4570]">#{data['Registration Index']} / {allUsersList.length}</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="top" height={36} wrapperStyle={{ fontWeight: 'bold' }} />
                        <Area 
                          type="monotone" 
                          dataKey="Growth Volume" 
                          name="Unique Users (Timeline)"
                          stroke="#FF4570" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorTotal)" 
                          dot={{ r: 7, stroke: '#000', strokeWidth: 2.5, fill: '#FF4570' }}
                          activeDot={{ r: 10, stroke: '#000', strokeWidth: 3, fill: '#FFF' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                
                <div className="mt-4 p-3.5 bg-zinc-50 border-2 border-black font-mono text-[10px] text-zinc-500 uppercase leading-relaxed">
                  * EACH INDIVIDUAL UNIQUE LOGGED IN USER STANDS AS A CHRONOLOGICAL DOT ON THE HORIZONTAL ELAPSED TIME SCALE, VISUALIZING PRECISE GAPS AND SPACING BETWEEN USER DISCOVERIES IN IST.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 1: CALCULATION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Header controls */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-black" />
                </div>
                <input
                  type="text"
                  placeholder="FILTER LOG DATA BY NAME, FATE OR USER EMAIL..."
                  className="w-full pl-11 pr-4 py-4 border-4 border-black rounded-none placeholder:text-zinc-200 text-black font-mono text-xs uppercase font-extrabold focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Action buttons list */}
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <button
                  id="pull-sheets-btn"
                  onClick={() => fetchRecordsFromSheets(settings.googleAppScriptUrl)}
                  disabled={loadingSheetsData || !settings.googleAppScriptUrl}
                  className="py-4 px-6 bg-yellow-300 hover:bg-black hover:text-yellow-300 text-black font-display text-xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer disabled:opacity-50 transition-colors"
                  title={settings.googleAppScriptUrl ? "Fetch and merge all calculations from sheet" : "Configure Apps Script Web App URL first"}
                >
                  {loadingSheetsData ? 'PULLING...' : 'PULL LATEST FROM SHEET'}
                </button>
                <button
                  id="batch-sync-btn"
                  onClick={handleBatchSync}
                  disabled={syncingAll}
                  className="py-4 px-6 bg-[#22C55E] hover:bg-emerald-600 text-white font-display text-xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer disabled:opacity-50"
                >
                  {syncingAll ? 'STREAMING...' : 'PIP ALL OUTSTANDINGS'}
                </button>
                <button
                  id="purge-logs-btn"
                  onClick={clearAllData}
                  className="py-4 px-6 bg-transparent hover:bg-brand-pink hover:text-white text-black font-display text-xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer transition-colors"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Trash2 className="w-5 h-5 shrink-0" />
                    PRUNE LOG HISTORY
                  </span>
                </button>
              </div>
            </div>

            {/* Sync Notifications block */}
            {syncStatusMsg && (
              <div className="p-4 bg-yellow-300 text-black border-4 border-black font-mono text-xs font-bold uppercase tracking-wide flex items-center gap-2.5 animate-fade-in">
                <CheckCircle className="w-5 h-5 text-black shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* Selector list for filters */}
            <div className="flex flex-col gap-2">
              <span className="font-mono text-xs uppercase font-black text-black flex items-center gap-1.5">
                <ListFilter className="w-4 h-4 shrink-0 text-brand-pink" /> 
                // FILTER CORRESPONDENCES BY ALIGNED FATE CODE:
              </span>
              
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {(['ALL', 'F', 'L', 'A', 'M', 'E', 'S'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setCurrentFilter(f)}
                    type="button"
                    className={`px-4 py-2 border-2 border-black font-extrabold uppercase transition-colors duration-700 cursor-pointer ${
                      currentFilter === f 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black hover:bg-zinc-100'
                    }`}
                  >
                    {f === 'ALL' ? 'Show All Rows' : `[${f}] ${FLAMES_DETAILS[f]?.label}`}
                  </button>
                ))}
              </div>
            </div>

            {/* The main Logs Table */}
            <div className="overflow-x-auto border-4 border-black">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#FAF9F6] border-b-4 border-black text-black font-extrabold uppercase text-[11px] tracking-widest">
                  <tr>
                    <th className="py-4 px-4 border-r-2 border-black w-44">TIMESTAMP (UTC)</th>
                    <th className="py-4 px-4 border-r-2 border-black">CALCULATED BY</th>
                    <th className="py-4 px-4 border-r-2 border-black w-44">PLAYER ONE</th>
                    <th className="py-4 px-4 border-r-2 border-black w-44">PLAYER TWO</th>
                    <th className="py-4 px-4 border-r-2 border-black">COMPATIBILITY</th>
                    <th className="py-4 px-4 text-center w-24">SHEETS STATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-black uppercase font-bold text-[11px]">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-zinc-400 font-mono italic">
                        {recordsList.length === 0 
                          ? 'DATABASE EMPTY // NO READINGS LOGGED YET.' 
                          : 'FILTER QUERY YIELDED ZERO RECORDS MATCHED.'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => {
                      const det = FLAMES_DETAILS[record.resultLetter];
                      return (
                        <tr key={record.id} className="hover:bg-zinc-50">
                          <td className="py-3 px-4 border-r-2 border-black whitespace-nowrap text-zinc-500 font-mono text-[10px]">
                            {new Date(record.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 border-r-2 border-black font-black text-black truncate max-w-[150px]">
                            {record.userEmail}
                          </td>
                          <td className="py-3 px-4 border-r-2 border-black text-black truncate max-w-[124px]">{record.name1}</td>
                          <td className="py-3 px-4 border-r-2 border-black text-black truncate max-w-[124px]">{record.name2}</td>
                          <td className="py-3 px-4 border-r-2 border-black">
                            {det ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 border-2 border-black bg-zinc-100 text-black text-[10px] font-black uppercase">
                                <span>{det.emoji}</span>
                                <span>{det.label}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-400">{record.resultLetter}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-[10px]">
                            {record.syncedToSheet ? (
                              <span className="bg-emerald-500 text-white px-2 py-0.5 border-2 border-black font-black uppercase">
                                SYNCED
                              </span>
                            ) : (
                              <span className="bg-brand-pink text-white px-2 py-0.5 border-2 border-black font-black uppercase inline-block animate-pulse">
                                QUEUED
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED USERS LIST */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-fade-in animate-duration-100" id="registered-users-panel">
            <div className="flex justify-between items-center bg-black text-white p-4">
              <h3 className="font-mono text-xs uppercase tracking-widest font-black flex items-center gap-2">
                <Users className="w-4.5 h-4.5" />
                // UNIQUE LOGGED IN ACCOUNTS ({allUsersList.length} RECORDED EXCLUDING ADMIN)
              </h3>
            </div>
            
            <div className="overflow-x-auto border-4 border-black">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#FAF9F6] border-b-4 border-black text-black font-black uppercase tracking-widest text-[11px]">
                  <tr>
                    <th className="py-4 px-4 border-r-2 border-black">SYSTEM CODES</th>
                    <th className="py-4 px-4 border-r-2 border-black">USER ENROLLED EMAIL</th>
                    <th className="py-4 px-4 border-r-2 border-black">CREATION METRIC (UTC)</th>
                    <th className="py-4 px-4">SECURITY CLEARANCE ROLE</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black text-black uppercase font-bold text-[11px]">
                  {allUsersList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-zinc-50">
                      <td className="py-3.5 px-4 border-r-2 border-black font-mono text-zinc-400 font-bold">{usr.id}</td>
                      <td className="py-3.5 px-4 border-r-2 border-black font-black text-black">{usr.email}</td>
                      <td className="py-3.5 px-4 border-r-2 border-black text-zinc-500">
                        {new Date(usr.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        {usr.isAdmin ? (
                          <span className="px-2.5 py-1 bg-yellow-300 text-black border-2 border-black font-serif italic text-[10px] font-black">
                            [ADMINISTRATOR]
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-white text-black border-2 border-zinc-200 text-[10px] uppercase font-bold">
                            STANDARD_USER
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE SHEETS SETUP */}
        {activeTab === 'settings' && (
          <div className="space-y-8 animate-fade-in" id="settings-sync-panel">
            
            {/* Warning setup box */}
            <div className="p-6 bg-white border-4 border-black neo-shadow-sm flex items-start gap-4">
              <Database className="w-7 h-7 text-brand-pink shrink-0" />
              <div className="text-xs font-mono uppercase text-black leading-relaxed">
                <p className="font-black text-black text-sm mb-1">[INTEGRATION ARCHITECTURE PROTOCOL]:</p>
                <p className="text-zinc-500 leading-normal">
                  SINCE FRONTEND FILES HOST DIRECTLY TO STATIC CLOUD CONTAINERS without local relational databases, WE ATTACH TO YOUR PRIVATE SPREADSHEETS THROUGH ASYNC WEB PORTS. THE GOOGLE APPS SCRIPT WEB-APP SYSTEM PARSES COMPATIBILITY PAYLOADS SAFELY FROM THE CONSOLE AND WRITES THEM IN REAL-TIME.
                </p>
              </div>
            </div>

            {/* Forms configuration settings */}
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="space-y-2">
                <label className="block font-mono text-[11px] font-black uppercase tracking-widest text-black">
                  [STEP 1 // ENTER GOOGLE APPS SCRIPT DEPLOYED WEB APP ENDPOINT URL]
                </label>
                <input
                  type="url"
                  required
                  placeholder="HTTPS://SCRIPT.GOOGLE.COM/MACROS/S/AKFYCB.../EXEC"
                  className="block w-full px-4 py-4 border-4 border-black rounded-none placeholder:text-zinc-200 text-black font-mono text-xs uppercase font-extrabold focus:outline-none"
                  value={settings.googleAppScriptUrl}
                  onChange={(e) => setSettings({ ...settings, googleAppScriptUrl: e.target.value })}
                />
                <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-tight">
                  // CALCULATIONS EXECUTED LIVE STREAM DIRECTLY TO YOUR SHEET ON CALCULATED COMPLETION EVENTS.
                </p>
              </div>

              {saveSettingsSuccess && (
                <div className="p-4 bg-yellow-300 text-black border-4 border-black font-mono text-xs font-bold uppercase tracking-wide flex items-center gap-2 animate-fade-in">
                  <CheckCircle className="w-5 h-5 text-black shrink-0" />
                  <span>{saveSettingsSuccess}</span>
                </div>
              )}

              <button
                id="save-settings-btn"
                type="submit"
                className="py-4 px-8 bg-black hover:bg-brand-pink text-white font-display text-2xl uppercase tracking-wider border-4 border-black neo-shadow cursor-pointer transition-transform duration-100"
              >
                SAVE CONNECTION PARAMETERS
              </button>
            </form>

            {/* Code Blueprint to Copy Paste */}
            <div className="space-y-4 pt-8 border-t-4 border-black border-solid">
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <h4 className="font-mono text-xs font-black uppercase tracking-widest text-black">
                  [STEP 2 // GOOGLE SPREADSHEETS BLUEPRINT COMPILER REPOSITORY]
                </h4>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="py-2.5 px-4 bg-white hover:bg-black hover:text-white text-black font-mono text-xs font-black uppercase border-2 border-black cursor-pointer transition-colors"
                >
                  {copiedScript ? '✓ SCRIPT BLUEPRINT COPIED!' : 'COPY CODE BLUEPRINT'}
                </button>
              </div>
              
              <div className="border-4 border-black bg-zinc-50 p-6 font-mono text-[11px] text-black max-h-64 overflow-y-auto leading-relaxed shadow-inner">
                <pre>{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Add headers if missing
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Timestamp (UTC)", "User Account Email", "Name 1 (User)", "Name 2 (Crush)", "Result Relationship", "Result Letter"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#FDF2F8").setFontColor("#DB2777").setHorizontalAlignment("center");
      sheet.setRowHeight(1, 30);
    }
    
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.userEmail || "Anonymous",
      data.name1,
      data.name2,
      data.resultLabel,
      data.resultLetter
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", syncedAt: new Date().toISOString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var data = [];
    
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][2] || rows[i][3]) {
        var rowTime = rows[i][0];
        var timestampStr = "";
        try {
          if (rowTime instanceof Date) {
            timestampStr = rowTime.toISOString();
          } else {
            timestampStr = new Date(rowTime).toISOString();
          }
        } catch(e) {
          timestampStr = rowTime ? rowTime.toString() : new Date().toISOString();
        }
        
        data.push({
          timestamp: timestampStr,
          userEmail: rows[i][1] || "Anonymous",
          name1: rows[i][2] || "",
          name2: rows[i][3] || "",
          resultLabel: rows[i][4] || "",
          resultLetter: rows[i][5] || ""
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", records: data }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
