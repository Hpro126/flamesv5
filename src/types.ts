export interface User {
  id: string;
  email: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface FlamesRecord {
  id: string;
  userEmail: string;
  name1: string;
  name2: string;
  resultLetter: 'F' | 'L' | 'A' | 'M' | 'E' | 'S' | 'N';
  resultLabel: string;
  timestamp: string;
  syncedToSheet: boolean;
}

export interface SystemSettings {
  googleSheetId: string;
  googleAppScriptUrl: string;
  theme: 'gothic-romance' | 'cupid-cream' | 'cyber-cupid';
  sheetSyncEnabled: boolean;
}
