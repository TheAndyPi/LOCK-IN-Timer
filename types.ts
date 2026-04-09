export enum AppMode {
  ONBOARDING = 'ONBOARDING',
  IDLE = 'IDLE',
  FOCUS = 'FOCUS',
  BREAK_SHORT = 'BREAK_SHORT',
  BREAK_LONG = 'BREAK_LONG',
  VERIFY_TASK = 'VERIFY_TASK',
  PUNISHMENT = 'PUNISHMENT',
  SETTINGS = 'SETTINGS',
}

export interface UserProfile {
  name: string;
  major: string;
  weakness: string;
  ambition: string;
  enemy: string; // The "ex" or rival
  additionalInfo: string; // Paste dump for extra context
}

export interface SessionConfig {
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  sessionsBeforeLongBreak: number;
  enableGemini: boolean;
  punishmentStyle: 'PUBLIC' | 'PRIVATE' | 'SOCIAL' | 'CUSTOM';
  customPunishmentPrompt?: string;
  // New Settings
  enableInsults: boolean;
  enableTabPunishment: boolean;
  maxPauses: number;
  pauseDuration: number; // minutes
}

export interface SessionState {
  mode: AppMode;
  timeLeft: number;
  currentTask: string;
  sessionCount: number;
  pausesLeft: number;
}

export interface SessionData {
  timestamp: number;
  duration: number; // seconds
  type: 'FOCUS' | 'BREAK';
  completed: boolean;
  task?: string;
}

export interface VerificationResult {
  success: boolean;
  message: string;
}

export interface InsultContent {
  text: string;
}

export interface VisionStatus {
  isPresent: boolean;
  hasPhone: boolean;
  isSlouching: boolean;
  isFacingAway: boolean;
}

export interface AttentionSample {
  timestamp: number;
  score: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: {
    accent: string;
    bg: string;
    dim: string;
    text: string;
  };
  font: string;
}