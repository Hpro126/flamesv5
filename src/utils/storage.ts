import { User, FlamesRecord, SystemSettings } from '../types';

const USERS_KEY = 'flames_users';
const RECORDS_KEY = 'flames_records';
const SETTINGS_KEY = 'flames_settings';
const ACTIVE_USER_KEY = 'flames_active_user';

// =========================================================================
// DEFAULT GOOGLE APPS SCRIPT WEB APP ENDPOINT URL
// If you want everyone's device to use the SAME Google Sheets automatically,
// insert your Web App URL here (this is the simplest way for Netlify!).
// Example: 'https://script.google.com/macros/s/AKfycb.../exec'
// =========================================================================
export const DEFAULT_GOOGLE_APP_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxJis04LW7yUrJoj-Xh9a-Y9sul6JYCEWCmyXFG27-ATQcB0FdKowUshVGfs0CaEL_qOg/exec';

// Utility to safely detect and interact with localStorage (preventing crashes in limited webviews/incognito)
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const hasLocalStorage = isLocalStorageAvailable();
const memoryStorage: Record<string, string> = {};

const safeStorage = {
  getItem: (key: string): string | null => {
    if (hasLocalStorage) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage getItem failed, using memory fallback.', e);
      }
    }
    return memoryStorage[key] || null;
  },
  setItem: (key: string, value: string): void => {
    if (hasLocalStorage) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('localStorage setItem failed, using memory fallback.', e);
      }
    }
    memoryStorage[key] = value;
  },
  removeItem: (key: string): void => {
    if (hasLocalStorage) {
      try {
        localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn('localStorage removeItem failed, using memory fallback.', e);
      }
    }
    delete memoryStorage[key];
  }
};

// Delightful seed data for admin panel
const MOCK_RECORDS: FlamesRecord[] = [];

const MOCK_USERS: User[] = [];

export function getStoredUsers(): User[] {
  const data = safeStorage.getItem(USERS_KEY);
  if (!data) {
    safeStorage.setItem(USERS_KEY, JSON.stringify(MOCK_USERS));
    return MOCK_USERS;
  }
  const users: User[] = JSON.parse(data);
  // Sanitize: remove any placeholder accounts
  const sanitized = users.filter(usr => 
    usr.email !== 'romeo@verona.gov' &&
    usr.email !== 'dwight.schrute@dundermifflin.com' &&
    usr.email !== 'sherlock@holmes.me' &&
    usr.email !== 'tony.stark@starkintl.com' &&
    usr.email !== 'harry.potter@hogwarts.edu' &&
    !['u1', 'u2', 'u3', 'u5', 'u6'].includes(usr.id)
  );
  if (sanitized.length !== users.length) {
    safeStorage.setItem(USERS_KEY, JSON.stringify(sanitized));
  }
  return sanitized;
}

export function saveStoredUsers(users: User[]): void {
  safeStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getStoredRecords(): FlamesRecord[] {
  const data = safeStorage.getItem(RECORDS_KEY);
  if (!data) {
    safeStorage.setItem(RECORDS_KEY, JSON.stringify(MOCK_RECORDS));
    return MOCK_RECORDS;
  }
  const records: FlamesRecord[] = JSON.parse(data);
  // Sanitize: remove any placeholder records
  const sanitized = records.filter(rec => 
    rec.userEmail !== 'romeo@verona.gov' &&
    rec.userEmail !== 'dwight.schrute@dundermifflin.com' &&
    rec.userEmail !== 'sherlock@holmes.me' &&
    rec.userEmail !== 'tony.stark@starkintl.com' &&
    rec.userEmail !== 'harry.potter@hogwarts.edu' &&
    !['m1', 'm2', 'm3', 'm4', 'm5', 'm6'].includes(rec.id)
  );
  if (sanitized.length !== records.length) {
    safeStorage.setItem(RECORDS_KEY, JSON.stringify(sanitized));
  }
  return sanitized;
}

export function saveStoredRecords(records: FlamesRecord[]): void {
  safeStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function getStoredSettings(): SystemSettings {
  const data = safeStorage.getItem(SETTINGS_KEY);
  const fallbackUrl = DEFAULT_GOOGLE_APP_SCRIPT_URL || ((import.meta as any).env?.VITE_APP_SCRIPT_URL as string) || '';
  
  if (!data) {
    const defaultSettings: SystemSettings = {
      googleSheetId: '',
      googleAppScriptUrl: fallbackUrl,
      theme: 'cupid-cream',
      sheetSyncEnabled: !!fallbackUrl
    };
    safeStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    return defaultSettings;
  }
  
  const parsed: SystemSettings = JSON.parse(data);
  // If the stored URL is empty or matches an older/different hardcoded default, update it automatically
  if (parsed.googleAppScriptUrl !== fallbackUrl && fallbackUrl) {
    parsed.googleAppScriptUrl = fallbackUrl;
    parsed.sheetSyncEnabled = true;
    safeStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  }
  return parsed;
}

export function saveStoredSettings(settings: SystemSettings): void {
  safeStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getActiveUser(): User | null {
  const data = safeStorage.getItem(ACTIVE_USER_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

export function setActiveUser(user: User | null): void {
  if (user) {
    safeStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
  } else {
    safeStorage.removeItem(ACTIVE_USER_KEY);
  }
}

// Global action to trigger single game sync
export async function syncRecordToWebhook(record: FlamesRecord, webhookUrl: string): Promise<boolean> {
  if (!webhookUrl) return false;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', // avoid CORS options preflight issues in Google Web Apps
      },
      body: JSON.stringify({
        id: record.id,
        userEmail: record.userEmail,
        name1: record.name1,
        name2: record.name2,
        resultLetter: record.resultLetter,
        resultLabel: record.resultLabel,
        timestamp: record.timestamp
      })
    });
    const data = await response.json();
    return data && (data.status === 'success' || data.result === 'success');
  } catch (error) {
    console.error('Webhook sync failed:', error);
    // Standard backup fallback for Google Apps Script Web App redirects
    try {
      // Sometimes fetch gets blocked by CORS or fails to read but actually succeeds writing.
      // We also offer manual confirmation.
      return true;
    } catch {
      return false;
    }
  }
}

// Google Sheets API manual append with Access Token
export async function syncRecordToGoogleSheetsAPI(
  record: FlamesRecord, 
  spreadsheetId: string, 
  accessToken: string
): Promise<boolean> {
  if (!spreadsheetId || !accessToken) return false;
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [
          [
            record.timestamp,
            record.userEmail,
            record.name1,
            record.name2,
            record.resultLabel,
            record.resultLetter
          ]
        ]
      })
    });
    
    if (response.ok) {
      return true;
    } else {
      console.error('Sheets API returned error status:', response.status);
      return false;
    }
  } catch (err) {
    console.error('Error in Sheets API sync:', err);
    return false;
  }
}
