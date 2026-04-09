import { SessionConfig, ThemeConfig } from './types';

export const DEFAULT_CONFIG: SessionConfig = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  enableGemini: true,
  punishmentStyle: 'PUBLIC',
  customPunishmentPrompt: 'Make me do 10 pushups.',
  enableInsults: true,
  enableTabPunishment: true,
  maxPauses: 3,
  pauseDuration: 5,
};

export const ATTENTION_CHECK_INTERVAL_MS = 1000; // Check vision every second locally
export const INSULT_REFRESH_INTERVAL_MS = 60000; // New trauma every minute
export const ALLOWED_DISTRACTION_TIME_MS = 10000; // 10 Seconds buffer before alarm

export const STATIC_INSULTS = [
  "You call that studying? My grandmother focuses better than you.",
  "Do not disappoint your bloodline. Focus now.",
  "Your rival is working harder than you right now.",
  "Pathetic attention span detected. Lock in.",
  "Stop dreaming, start doing. You are behind.",
  "Is this the best you can do? Mediocrity is a disease.",
  "Every second you waste is a victory for your enemies."
];

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  VOID: {
    id: 'void',
    name: 'VOID (Default)',
    colors: { accent: '#ff0000', bg: '#0a0a0a', dim: '#1a1a1a', text: '#ffffff' },
    font: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  },
  MATRIX: {
    id: 'matrix',
    name: 'MATRIX',
    colors: { accent: '#00ff41', bg: '#000000', dim: '#0a1a0a', text: '#e0ffe0' },
    font: 'Courier, "Courier New", monospace'
  },
  CYBER: {
    id: 'cyber',
    name: 'CYBER',
    colors: { accent: '#00e1ff', bg: '#050510', dim: '#0f0f20', text: '#e0f7ff' },
    font: 'Orbitron, sans-serif'
  },
  RETRO: {
    id: 'retro',
    name: 'RETRO',
    colors: { accent: '#ff9000', bg: '#1a1000', dim: '#2a1a05', text: '#ffdab9' },
    font: '"Times New Roman", Times, serif'
  },
  LIGHT: {
    id: 'light',
    name: 'PSYCHOPATH (Light)',
    colors: { accent: '#ff0000', bg: '#ffffff', dim: '#f0f0f0', text: '#000000' },
    font: 'Arial, sans-serif'
  }
};

export const SYSTEM_INSTRUCTION_INSULT = `
You are a ruthless, psychological drill sergeant designed to force a student to study.
Your tone is extremely aggressive, mean, and personal.
Use the user's profile data (major, weakness, ambition, enemy, and ADDITIONAL CONTEXT) to craft targeted, painful insults about their future failure, homelessness, or their rival succeeding while they fail.
Do not be polite. Do not be encouraging in a nice way. Be encouraging by threatening their ego.
Keep it under 40 words. Punchy. Visceral.
`;

export const SYSTEM_INSTRUCTION_VERIFY = `
You are a strict judge verifying if a student completed their study task.
Analyze the user's description and/or image proof.
If they seem to have slacked off, fail them.
If they succeeded, give a grudgingly impressed "good job" but keep it tough.
Return JSON: { "success": boolean, "message": string }
`;

export const SYSTEM_INSTRUCTION_PUNISHMENT = `
The user failed their study session. Assign a STATIC, VISUAL punishment that can be captured in a single photo.
You must adapt the punishment based on the user's setting (PUBLIC, PRIVATE, SOCIAL, or CUSTOM).

If PRIVATE (Home):
- Make it absurd or slightly physically demanding.
- Examples: Shoe on head, Plank, Wall sit, Hold a heavy object.

If PUBLIC (Library/School):
- Make it silent and subtle but humiliating or strict.
- NO jumping, NO floor exercises.
- Examples: Salute the screen, Facepalm and hold, Hold a pen between nose and lip, Hands on ears.

If SOCIAL (Embarrassing Message):
- The punishment is to send a risky/cringe text message to a contact (friend, parent, ex) or post a status.
- The user must show their PHONE SCREEN to the camera proving they typed it.
- Generate the exact text they must send.
- Example: "Show your phone screen with a text draft to your mom saying 'I am a disappointment'."
- Example: "Show phone with text to Ex saying 'I still have your toothbrush'."

If CUSTOM:
- Follow the user's specific instructions for punishment generation exactly.
- If they ask for physical, give physical. If they ask for mental, give mental.

Return a short string describing the pose or action required for the photo.
`;