import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    Play, Pause, RotateCcw, Settings as SettingsIcon, 
    Camera, Eye, AlertTriangle, TrendingUp, CheckSquare, XSquare, SkipForward,
    Plus, Minus, RefreshCw, X, HelpCircle, Smartphone, User, Palette, Monitor, BrainCircuit, Trash2, Library, Home, MessageCircle, Edit3, Lock, ShieldAlert, Timer, ArrowLeft
} from 'lucide-react';
import { AppMode, UserProfile, SessionConfig, SessionData, InsultContent, VisionStatus, AttentionSample, ThemeConfig, SessionState } from './types';
import { DEFAULT_CONFIG, ATTENTION_CHECK_INTERVAL_MS, INSULT_REFRESH_INTERVAL_MS, ALLOWED_DISTRACTION_TIME_MS, THEME_PRESETS, STATIC_INSULTS, STATIC_ENCOURAGEMENTS } from './constants';
import * as GeminiService from './services/gemini';
import * as VisionService from './services/vision';
import { playAlarm, stopAlarm, playSuccessChime, playBreakEndChime } from './utils/audio';
import { Stats } from './components/Stats';

// --- Sub-Components ---

const VisualWarning: React.FC<{ modeStyle: 'HAPPY' | 'EVIL' }> = ({ modeStyle }) => {
    if (modeStyle === 'HAPPY') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-blue-500 animate-pulse opacity-20 mix-blend-overlay"></div>
                <div className="relative z-10 flex flex-col items-center justify-center text-center animate-bounce">
                    <h1 className="text-[10vw] font-black text-blue-400 leading-none drop-shadow-[0_0_15px_rgba(0,0,0,1)] stroke-black">
                        GENTLE
                    </h1>
                    <h1 className="text-[10vw] font-black text-white leading-none drop-shadow-[0_0_15px_rgba(0,0,255,1)]">
                        REMINDER
                    </h1>
                    <p className="text-2xl font-bold bg-black text-blue-400 px-4 py-2 mt-4 uppercase tracking-widest border-2 border-blue-400">
                        Please refocus
                    </p>
                </div>
            </div>
        );
    }
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden">
            {/* Strobe Background */}
            <div className="absolute inset-0 bg-danger-red animate-pulse opacity-50 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-void-black/80 animate-flash-panic"></div>
            
            {/* Aggressive Text */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center animate-bounce">
                <h1 className="text-[15vw] font-black text-danger-red leading-none drop-shadow-[0_0_15px_rgba(0,0,0,1)] stroke-black">
                    LOOK
                </h1>
                <h1 className="text-[15vw] font-black text-white leading-none drop-shadow-[0_0_15px_rgba(255,0,0,1)]">
                    AT ME
                </h1>
                <p className="text-2xl font-bold bg-black text-danger-red px-4 py-2 mt-4 uppercase tracking-widest border-2 border-danger-red">
                    Failure Imminent
                </p>
            </div>
        </div>
    );
};

const SettingsModal: React.FC<{ 
    config: SessionConfig, 
    profile: UserProfile,
    currentTheme: ThemeConfig,
    onSaveConfig: (c: SessionConfig) => void,
    onSaveTheme: (t: ThemeConfig) => void,
    onSaveProfile: (p: UserProfile) => void,
    onClose: () => void 
}> = ({ config, profile, currentTheme, onSaveConfig, onSaveTheme, onSaveProfile, onClose }) => {
    const [activeTab, setActiveTab] = useState<'protocol' | 'identity' | 'appearance'>('protocol');
    const [localConfig, setLocalConfig] = useState(config);
    const [localTheme, setLocalTheme] = useState(currentTheme);
    const [localProfile, setLocalProfile] = useState(profile);

    const handleReset = () => {
        if (window.confirm("CRITICAL WARNING: This will permanently delete your profile, stats, and settings. This cannot be undone.\n\nAre you sure you want to factory reset?")) {
            localStorage.removeItem('lock_in_data');
            localStorage.removeItem('lock_in_heartbeat');
            window.location.reload();
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-dim-gray border border-gray-700 p-6 rounded-lg w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-main">SETTINGS</h2>
                    <button onClick={onClose}><X className="text-main/50 hover:text-main"/></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 mb-6">
                    <button 
                        onClick={() => setActiveTab('protocol')}
                        className={`flex-1 pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'protocol' ? 'text-danger-red border-b-2 border-danger-red' : 'text-main/50 hover:text-main/80'}`}
                    >
                        Protocol
                    </button>
                    <button 
                        onClick={() => setActiveTab('identity')}
                        className={`flex-1 pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'identity' ? 'text-danger-red border-b-2 border-danger-red' : 'text-main/50 hover:text-main/80'}`}
                    >
                        Identity
                    </button>
                    <button 
                        onClick={() => setActiveTab('appearance')}
                        className={`flex-1 pb-2 text-sm font-bold uppercase tracking-wider ${activeTab === 'appearance' ? 'text-danger-red border-b-2 border-danger-red' : 'text-main/50 hover:text-main/80'}`}
                    >
                        Appearance
                    </button>
                </div>
                
                <div className="overflow-y-auto flex-1 pr-2 space-y-6">
                    {activeTab === 'protocol' ? (
                        <div className="space-y-4">
                            {/* Timing */}
                            <h3 className="text-xs uppercase text-main/30 font-bold border-b border-gray-800 pb-1">Timer Configuration</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Focus (min)</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.focusDuration}
                                        onChange={e => setLocalConfig({...localConfig, focusDuration: parseInt(e.target.value) || 25})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Sessions / Cycle</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.sessionsBeforeLongBreak}
                                        onChange={e => setLocalConfig({...localConfig, sessionsBeforeLongBreak: parseInt(e.target.value) || 4})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Short Break</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.shortBreakDuration}
                                        onChange={e => setLocalConfig({...localConfig, shortBreakDuration: parseInt(e.target.value) || 5})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Long Break</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.longBreakDuration}
                                        onChange={e => setLocalConfig({...localConfig, longBreakDuration: parseInt(e.target.value) || 15})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                            </div>

                            {/* Pause Settings */}
                            <h3 className="text-xs uppercase text-main/30 font-bold border-b border-gray-800 pb-1 pt-2">Pause Logic</h3>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Max Pauses</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.maxPauses}
                                        onChange={e => setLocalConfig({...localConfig, maxPauses: parseInt(e.target.value) || 0})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1">Pause Dur (min)</label>
                                    <input 
                                        type="number" 
                                        value={localConfig.pauseDuration}
                                        onChange={e => setLocalConfig({...localConfig, pauseDuration: parseInt(e.target.value) || 5})}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    />
                                </div>
                            </div>


                            {/* Punishment Style */}
                            <div className="pt-2">
                                <label className="text-xs uppercase text-main/50 block mb-2">
                                    {localConfig.modeStyle === 'HAPPY' ? 'Activity Context' : 'Punishment Context'}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setLocalConfig({...localConfig, punishmentStyle: 'PUBLIC'})}
                                        className={`p-3 rounded border flex flex-col items-center gap-1 transition-all ${
                                            localConfig.punishmentStyle === 'PUBLIC' 
                                            ? 'bg-danger-red text-on-accent border-danger-red' 
                                            : 'bg-void-black border-gray-700 text-main/50 hover:border-gray-500'
                                        }`}
                                    >
                                        <Library size={18} />
                                        <span className="text-xs font-bold uppercase">Library</span>
                                        <span className="text-[9px] opacity-70">Subtle, silent</span>
                                    </button>
                                    <button 
                                        onClick={() => setLocalConfig({...localConfig, punishmentStyle: 'PRIVATE'})}
                                        className={`p-3 rounded border flex flex-col items-center gap-1 transition-all ${
                                            localConfig.punishmentStyle === 'PRIVATE' 
                                            ? 'bg-danger-red text-on-accent border-danger-red' 
                                            : 'bg-void-black border-gray-700 text-main/50 hover:border-gray-500'
                                        }`}
                                    >
                                        <Home size={18} />
                                        <span className="text-xs font-bold uppercase">Home</span>
                                        <span className="text-[9px] opacity-70">Physical, absurd</span>
                                    </button>
                                     <button 
                                        onClick={() => setLocalConfig({...localConfig, punishmentStyle: 'SOCIAL'})}
                                        className={`p-3 rounded border flex flex-col items-center gap-1 transition-all ${
                                            localConfig.punishmentStyle === 'SOCIAL' 
                                            ? 'bg-danger-red text-on-accent border-danger-red' 
                                            : 'bg-void-black border-gray-700 text-main/50 hover:border-gray-500'
                                        }`}
                                    >
                                        <MessageCircle size={18} />
                                        <span className="text-xs font-bold uppercase">Social</span>
                                        <span className="text-[9px] opacity-70">Embarrassing</span>
                                    </button>
                                     <button 
                                        onClick={() => setLocalConfig({...localConfig, punishmentStyle: 'CUSTOM'})}
                                        className={`p-3 rounded border flex flex-col items-center gap-1 transition-all ${
                                            localConfig.punishmentStyle === 'CUSTOM' 
                                            ? 'bg-danger-red text-on-accent border-danger-red' 
                                            : 'bg-void-black border-gray-700 text-main/50 hover:border-gray-500'
                                        }`}
                                    >
                                        <Edit3 size={18} />
                                        <span className="text-xs font-bold uppercase">Custom</span>
                                        <span className="text-[9px] opacity-70">User Defined</span>
                                    </button>
                                </div>
                                {localConfig.punishmentStyle === 'CUSTOM' && (
                                    <div className="mt-2 animate-fade-in">
                                        <textarea
                                            value={localConfig.customPunishmentPrompt || ''}
                                            onChange={e => setLocalConfig({...localConfig, customPunishmentPrompt: e.target.value})}
                                            placeholder="E.g. Only jumping jacks, or Make me balance things on my head..."
                                            className="w-full bg-void-black border border-gray-600 rounded p-2 text-xs text-main h-16 outline-none focus:border-danger-red"
                                        />
                                    </div>
                                )}
                            </div>
                            
                            {/* Toggles */}
                            <div className="pt-4 mt-4 border-t border-gray-800 space-y-3">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="flex items-center gap-2 text-sm font-bold uppercase text-main/80 group-hover:text-main">
                                        <Palette size={16} /> Mode Style (Happy/Evil)
                                    </span>
                                    <select 
                                        value={localConfig.modeStyle}
                                        onChange={e => setLocalConfig({...localConfig, modeStyle: e.target.value as 'HAPPY' | 'EVIL'})}
                                        className="bg-void-black border border-gray-600 rounded p-1 text-xs text-main outline-none focus:border-danger-red"
                                    >
                                        <option value="HAPPY">Happy (Default)</option>
                                        <option value="EVIL">Evil (Hurtful)</option>
                                    </select>
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="flex items-center gap-2 text-sm font-bold uppercase text-main/80 group-hover:text-main">
                                        <BrainCircuit size={16} /> Enable Gemini AI Features
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={localConfig.enableGemini ?? true} 
                                        onChange={e => setLocalConfig({...localConfig, enableGemini: e.target.checked})}
                                        className="w-5 h-5 accent-danger-red"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="flex items-center gap-2 text-sm font-bold uppercase text-main/80 group-hover:text-main">
                                        <MessageCircle size={16} /> Enable {localConfig.modeStyle === 'HAPPY' ? 'Encouragements' : 'Insults'}
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={localConfig.enableInsults ?? true} 
                                        onChange={e => setLocalConfig({...localConfig, enableInsults: e.target.checked})}
                                        className="w-5 h-5 accent-danger-red"
                                    />
                                </label>

                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="flex items-center gap-2 text-sm font-bold uppercase text-main/80 group-hover:text-main">
                                        <ShieldAlert size={16} /> Tab Closure {localConfig.modeStyle === 'HAPPY' ? 'Activity' : 'Punishment'}
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={localConfig.enableTabPunishment ?? true} 
                                        onChange={e => setLocalConfig({...localConfig, enableTabPunishment: e.target.checked})}
                                        className="w-5 h-5 accent-danger-red"
                                    />
                                </label>
                            </div>
                        </div>
                    ) : activeTab === 'identity' ? (
                        <div className="space-y-4">
                             <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Name</label>
                                <input 
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    value={localProfile.name}
                                    onChange={e => setLocalProfile({...localProfile, name: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Major</label>
                                <input 
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    value={localProfile.major}
                                    onChange={e => setLocalProfile({...localProfile, major: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Weakness</label>
                                <input 
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    value={localProfile.weakness}
                                    onChange={e => setLocalProfile({...localProfile, weakness: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Ambition</label>
                                <input 
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    value={localProfile.ambition}
                                    onChange={e => setLocalProfile({...localProfile, ambition: e.target.value})}
                                />
                            </div>
                             <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Enemy</label>
                                <input 
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none"
                                    value={localProfile.enemy}
                                    onChange={e => setLocalProfile({...localProfile, enemy: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase text-main/50 block mb-1">Additional Context</label>
                                <textarea
                                    className="w-full bg-void-black border border-gray-600 rounded p-2 text-main focus:border-danger-red outline-none h-24"
                                    value={localProfile.additionalInfo}
                                    onChange={e => setLocalProfile({...localProfile, additionalInfo: e.target.value})}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Presets */}
                            <div>
                                <label className="text-xs uppercase text-main/50 block mb-2">Presets</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.values(THEME_PRESETS).map(preset => (
                                        <button 
                                            key={preset.id}
                                            onClick={() => setLocalTheme(preset)}
                                            className={`p-2 rounded text-xs font-bold uppercase border transition-all ${
                                                localTheme.id === preset.id 
                                                ? 'border-danger-red bg-void-black text-main' 
                                                : 'border-gray-700 bg-black/20 text-main/50 hover:border-gray-500 hover:text-main'
                                            }`}
                                        >
                                            {preset.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Manual Overrides */}
                            <div className="space-y-3 pt-4 border-t border-gray-700">
                                <label className="text-xs uppercase text-main/50 block">Custom Colors</label>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-main/80">Accent Color</span>
                                    <input 
                                        type="color" 
                                        value={localTheme.colors.accent}
                                        onChange={(e) => setLocalTheme({
                                            ...localTheme, 
                                            id: 'custom', 
                                            colors: { ...localTheme.colors, accent: e.target.value }
                                        })}
                                        className="bg-transparent h-8 w-12 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-main/80">Background</span>
                                    <input 
                                        type="color" 
                                        value={localTheme.colors.bg}
                                        onChange={(e) => setLocalTheme({
                                            ...localTheme, 
                                            id: 'custom', 
                                            colors: { ...localTheme.colors, bg: e.target.value }
                                        })}
                                        className="bg-transparent h-8 w-12 cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-main/80">Text Color</span>
                                    <input 
                                        type="color" 
                                        value={localTheme.colors.text}
                                        onChange={(e) => setLocalTheme({
                                            ...localTheme, 
                                            id: 'custom', 
                                            colors: { ...localTheme.colors, text: e.target.value }
                                        })}
                                        className="bg-transparent h-8 w-12 cursor-pointer"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-xs uppercase text-main/50 block mb-1 mt-2">Font Family</label>
                                    <select 
                                        value={localTheme.font}
                                        onChange={(e) => setLocalTheme({
                                            ...localTheme, 
                                            id: 'custom', 
                                            font: e.target.value
                                        })}
                                        className="w-full bg-void-black border border-gray-600 rounded p-2 text-xs text-main outline-none"
                                    >
                                        <option value="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">Monospace (Default)</option>
                                        <option value="Arial, sans-serif">Sans Serif (Arial)</option>
                                        <option value="'Times New Roman', serif">Serif (Times)</option>
                                        <option value="'Courier New', Courier, monospace">Retro Courier</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 pt-4 border-t border-gray-800 space-y-4">
                     <button 
                        onClick={() => {
                            onSaveConfig(localConfig);
                            onSaveTheme(localTheme);
                            onSaveProfile(localProfile);
                        }}
                        className="w-full bg-danger-red hover:brightness-110 text-on-accent font-bold py-3 rounded uppercase transition-all"
                    >
                        Apply Changes
                    </button>
                    
                     <button 
                        onClick={handleReset}
                        className="w-full flex items-center justify-center gap-2 bg-red-950/30 hover:bg-red-900/50 text-red-500 font-bold py-2 rounded uppercase text-xs border border-red-900/50 transition-colors"
                    >
                        <Trash2 size={14} /> Factory Reset Memory
                    </button>
                </div>
            </div>
        </div>
    );
}

const Onboarding: React.FC<{ onComplete: (profile: UserProfile) => void }> = ({ onComplete }) => {
  const [data, setData] = useState<UserProfile>({ 
      name: '', major: '', weakness: '', ambition: '', enemy: '', additionalInfo: '' 
  });
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-void-black text-main max-w-lg mx-auto overflow-y-auto">
      <h1 className="text-4xl font-black mb-2 text-danger-red uppercase tracking-widest text-center mt-8">Identity Check</h1>
      <p className="mb-8 text-main/50 text-center">Tell me about yourself.</p>
      
      <div className="w-full space-y-4 mb-8">
        <input 
          placeholder="Name"
          className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors placeholder:text-main/30"
          onChange={e => setData({...data, name: e.target.value})}
        />
        <input 
          placeholder="Major / Field of Study"
          className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors placeholder:text-main/30"
          onChange={e => setData({...data, major: e.target.value})}
        />
         <input 
          placeholder="Biggest Weakness / Insecurity"
          className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors placeholder:text-main/30"
          onChange={e => setData({...data, weakness: e.target.value})}
        />
         <input 
          placeholder="What do you want to achieve?"
          className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors placeholder:text-main/30"
          onChange={e => setData({...data, ambition: e.target.value})}
        />
         <input 
          placeholder="Name of your Rival/Ex (The Enemy)"
          className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors placeholder:text-main/30"
          onChange={e => setData({...data, enemy: e.target.value})}
        />
        <textarea
            placeholder="ADDITIONAL CONTEXT (Paste anything here: Grades, shame list, parent expectations...)"
            className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none transition-colors h-32 placeholder:text-main/30"
            onChange={e => setData({...data, additionalInfo: e.target.value})}
        />
        
        <button 
          onClick={() => {
              if(Object.values(data).slice(0,5).every(s => (s as string).length > 0)) onComplete(data);
              else alert("Fill out the main fields. Don't be lazy already.");
          }}
          className="w-full bg-danger-red hover:brightness-110 text-on-accent font-bold py-4 rounded uppercase tracking-wider mt-4 transition-all"
        >
          Initialize Protocol
        </button>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<AppMode>(AppMode.ONBOARDING);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);
  const [theme, setTheme] = useState<ThemeConfig>(THEME_PRESETS.VOID);
  
  const [timeLeft, setTimeLeft] = useState(DEFAULT_CONFIG.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [currentTask, setCurrentTask] = useState('');

  // Pause State
  const [isPaused, setIsPaused] = useState(false);
  const [pausesLeft, setPausesLeft] = useState(DEFAULT_CONFIG.maxPauses);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(DEFAULT_CONFIG.pauseDuration * 60);
  
  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsPinned, setStatsPinned] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  
  // Monitoring
  const [integrity, setIntegrity] = useState(100); // 0 - 100
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isVisionReady, setIsVisionReady] = useState(false);
  const [visionStatus, setVisionStatus] = useState<VisionStatus>({ isPresent: false, hasPhone: false, isSlouching: false, isFacingAway: false });
  
  // Data Collection for Graphs
  const [attentionHistory, setAttentionHistory] = useState<AttentionSample[]>([]);
  const attentionBuffer = useRef<number[]>([]);
  const lastSampleTime = useRef<number>(Date.now());

  // Content
  const [insult, setInsult] = useState<InsultContent | null>(null);
  const [punishment, setPunishment] = useState<string>('');
  const [snapshotPreview, setSnapshotPreview] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState(false);
  
  // Verification
  const [verifyText, setVerifyText] = useState('');
  const [verificationLoading, setVerificationLoading] = useState(false);
  
  // Stats
  const [history, setHistory] = useState<SessionData[]>([]);
  
  // Timer Reference for accurate tracking
  const endTimeRef = useRef<number>(Date.now());

  // --- Helpers ---
  const getContrastColor = (hex: string) => {
    // Basic hex support
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return '#ffffff';

    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  const startCamera = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Wait for video to be ready
            videoRef.current.onloadedmetadata = () => {
               videoRef.current?.play();
               setCameraActive(true);
            }
        }
    } catch (e) {
        console.warn("Camera init failed:", e);
        // Retry logic or silent fail if already running
    }
  };

  const generateNewInsult = useCallback(async () => {
    if(!profile) return;
    if(!config.enableInsults) return;
    
    // Fallback if Gemini is disabled
    if (!config.enableGemini) {
        const arr = config.modeStyle === 'HAPPY' ? STATIC_ENCOURAGEMENTS : STATIC_INSULTS;
        const text = arr[Math.floor(Math.random() * arr.length)];
        setInsult({ text });
        return;
    }

    setLoadingMessage(true);
    const content = await GeminiService.generateInsult(profile, currentTask, config.modeStyle);
    setInsult(content);
    setLoadingMessage(false);
  }, [profile, config, currentTask]);

  // --- Effects ---

  // Load from storage AND Check for Dirty Exit (Tab Closure Punishment)
  useEffect(() => {
    const saved = localStorage.getItem('lock_in_data');
    const heartbeat = localStorage.getItem('lock_in_heartbeat');
    
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.profile) setProfile(parsed.profile);
      if (parsed.history) setHistory(parsed.history);
      if (parsed.config) setConfig(parsed.config);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.statsPinned) setStatsPinned(parsed.statsPinned);
      if (parsed.attentionHistory) setAttentionHistory(parsed.attentionHistory);
      
      // RESTORE SESSION STATE IF AVAILABLE (Always do this first to enable Resume)
      if (parsed.sessionState && parsed.sessionState.mode === AppMode.FOCUS) {
          const state: SessionState = parsed.sessionState;
          setTimeLeft(state.timeLeft);
          setCurrentTask(state.currentTask);
          setSessionCount(state.sessionCount);
          setPausesLeft(state.pausesLeft);
      }

      // Determine Start Mode
      if (parsed.profile) {
          // ANTI-CHEAT CHECK
          // If a heartbeat exists, it means the session was interrupted (tab closed)
          if (heartbeat && parsed.config?.enableTabPunishment) {
               const hbData = JSON.parse(heartbeat);
               if (hbData.mode === 'FOCUS') {
                   setMode(AppMode.PUNISHMENT);
                   setPunishment("YOU TRIED TO RUN. GENERATING PUNISHMENT...");
                   
                   // CRITICAL: Ensure camera starts for punishment view
                   setTimeout(() => startCamera(), 500);

                   // Trigger AI Punishment Generation immediately
                   if (parsed.config.enableGemini) {
                       GeminiService.generatePunishment(parsed.config.punishmentStyle, parsed.config.modeStyle, parsed.config.customPunishmentPrompt)
                        .then(text => setPunishment(text))
                        .catch(() => setPunishment(parsed.config.modeStyle === 'HAPPY' ? "Smile at the camera for 30 seconds." : "Salute the camera for 30 seconds."));
                   }
               } else {
                   setMode(AppMode.IDLE);
               }
          } else if (parsed.sessionState && parsed.sessionState.mode === AppMode.FOCUS) {
              // Standard Resume (No dirty exit detected, or feature disabled)
              setMode(AppMode.FOCUS);
              setIsRunning(true);
              setIsPaused(true); // Restore as PAUSED so they can lock in again
              setTimeout(() => startCamera(), 500); // Activate camera for resume
          } else {
              setMode(AppMode.IDLE);
          }
      } else {
          setMode(AppMode.ONBOARDING);
      }
    }
    
    // Load Vision Model
    VisionService.loadModel().then(() => setIsVisionReady(true));
  }, []);

  // Save to storage (Including running session state)
  useEffect(() => {
    if (profile) {
      // Limit attention history to last 24h roughly (1440 points) to prevent explosion
      const prunedAttention = attentionHistory.slice(-1440);
      
      const currentSessionState: SessionState | null = mode === AppMode.FOCUS ? {
          mode: AppMode.FOCUS,
          timeLeft,
          currentTask,
          sessionCount,
          pausesLeft
      } : null;

      localStorage.setItem('lock_in_data', JSON.stringify({ 
          profile, 
          history, 
          config, 
          theme,
          statsPinned, 
          attentionHistory: prunedAttention,
          sessionState: currentSessionState 
      }));
    }
  }, [profile, history, config, theme, statsPinned, attentionHistory, mode, timeLeft, currentTask, sessionCount, pausesLeft]);

  // Heartbeat for Anti-Cheat
  useEffect(() => {
      if (mode === AppMode.FOCUS && isRunning && !isPaused && config.enableTabPunishment) {
          const interval = setInterval(() => {
              localStorage.setItem('lock_in_heartbeat', JSON.stringify({
                  timestamp: Date.now(),
                  mode: 'FOCUS'
              }));
          }, 1000);
          return () => clearInterval(interval);
      } else if (mode !== AppMode.FOCUS && mode !== AppMode.PUNISHMENT) {
          // Clear heartbeat on safe exit/break
          localStorage.removeItem('lock_in_heartbeat');
      }
  }, [mode, isRunning, isPaused, config.enableTabPunishment]);

  // Apply Theme CSS Variables
  useEffect(() => {
      const root = document.documentElement;
      root.style.setProperty('--color-accent', theme.colors.accent);
      root.style.setProperty('--color-bg', theme.colors.bg);
      root.style.setProperty('--color-dim', theme.colors.dim);
      root.style.setProperty('--color-text', theme.colors.text);
      root.style.setProperty('--font-main', theme.font);
      
      const accentContrast = getContrastColor(theme.colors.accent);
      root.style.setProperty('--color-accent-text', accentContrast);
  }, [theme]);

  // Handle Timer Complete with Ref to avoid stale closure
  const handleTimerCompleteRef = useRef<() => void>(() => {});
  
  useEffect(() => {
      handleTimerCompleteRef.current = () => {
        setIsRunning(false);
        stopAlarm();
        localStorage.removeItem('lock_in_heartbeat'); // Clean exit
        
        if (mode === AppMode.FOCUS) {
            playSuccessChime(); // Pleasant success
            // Complete the session
            const nextSessionCount = sessionCount + 1;
            setSessionCount(nextSessionCount);
            
            setHistory(prev => [...prev, {
                timestamp: Date.now(),
                duration: config.focusDuration * 60,
                type: 'FOCUS',
                completed: true,
                task: currentTask
            }]);

            if (nextSessionCount >= config.sessionsBeforeLongBreak) {
                // End of Cycle -> Verify
                setMode(AppMode.VERIFY_TASK);
                setSessionCount(0); 
            } else {
                // Short break
                setMode(AppMode.BREAK_SHORT);
                setTimeLeft(config.shortBreakDuration * 60);
                setIsRunning(true);
            }
        } else if (mode === AppMode.BREAK_SHORT) {
            playBreakEndChime(); // Alert back to work
            // Short break over -> Auto start next focus
            setMode(AppMode.FOCUS);
            setTimeLeft(config.focusDuration * 60);
            setIsRunning(true);
            setIntegrity(100);
            setPausesLeft(config.maxPauses);
            // Generate new insult for new session
            generateNewInsult();
        } else if (mode === AppMode.BREAK_LONG) {
            playBreakEndChime();
            // Long break over -> Reset to IDLE
            setMode(AppMode.IDLE);
        }
      };
  }, [mode, sessionCount, config, currentTask, setHistory, setSessionCount, setMode, setTimeLeft, setIsRunning, generateNewInsult]);

  // Main Timer Tick (Accurate Version)
  useEffect(() => {
    let interval: any;
    if (isRunning && !isPaused) {
      // Set the anchor time based on current timeLeft state
      endTimeRef.current = Date.now() + timeLeft * 1000;

      interval = setInterval(() => {
        const now = Date.now();
        const diff = endTimeRef.current - now;
        const secondsRemaining = Math.ceil(diff / 1000);

        if (secondsRemaining <= 0) {
            setTimeLeft(0);
            // Invoke the ref to get fresh state without re-running effect
            handleTimerCompleteRef.current(); 
        } else {
            // Only update if value is different to avoid excessive renders, though state setter handles this
            setTimeLeft(secondsRemaining);
        }
      }, 200); // Check frequently to catch the second boundary closely
    }
    return () => clearInterval(interval);
  }, [isRunning, isPaused, mode]); // Intentionally exclude timeLeft to avoid re-anchoring on every tick

  // Pause Timer Tick
  useEffect(() => {
      let interval: any;
      if (isPaused && pauseTimeLeft > 0) {
          interval = setInterval(() => {
              setPauseTimeLeft(prev => prev - 1);
          }, 1000);
      } else if (isPaused && pauseTimeLeft === 0) {
          // Auto Resume
          setIsPaused(false);
      }
      return () => clearInterval(interval);
  }, [isPaused, pauseTimeLeft]);

  // Monitoring Effect
  useEffect(() => {
      if (mode !== AppMode.FOCUS || !isRunning || !isVisionReady || isPaused) return;
      
      const timer = setInterval(async () => {
         if (!videoRef.current) return;
         const status = await VisionService.monitorUser(videoRef.current);
         setVisionStatus(status);
         
         setIntegrity(prev => {
             let next = prev;
             const isGood = status.isPresent && !status.hasPhone && !status.isSlouching && !status.isFacingAway;
             
             if (isGood) next = Math.min(100, next + 2); // Recover
             else {
                 if (!status.isPresent) next -= 10; // 10s grace
                 if (status.isSlouching) next -= 15; // Fast warning
                 if (status.isFacingAway) next -= 5; // Looking away
                 if (status.hasPhone) next -= 50; // INSTANT REGRET
             }
             const final = Math.max(0, next);
             
             // Side Effect: Audio
             if (final <= 0) playAlarm();
             else stopAlarm();
             
             // Side Effect: Data Collection
             attentionBuffer.current.push(final);
             
             // If 60 seconds passed, aggregate minute sample
             if (Date.now() - lastSampleTime.current >= 60000) {
                 const sum = attentionBuffer.current.reduce((a, b) => a + b, 0);
                 const avg = Math.round(sum / (attentionBuffer.current.length || 1));
                 
                 setAttentionHistory(prev => [...prev, { timestamp: Date.now(), score: avg }]);
                 
                 attentionBuffer.current = [];
                 lastSampleTime.current = Date.now();
             }

             return final;
         });
      }, 1000);
      
      return () => {
          clearInterval(timer);
          stopAlarm();
      };
  }, [mode, isRunning, isVisionReady, isPaused]);


  // Initial Insult
  useEffect(() => {
    if (mode === AppMode.FOCUS && isRunning && profile && !insult && !isPaused && config.enableInsults) {
       // Only gen if we don't have one (fresh session)
       if (!insult) generateNewInsult();
    }
  }, [mode, isRunning, profile, config.enableInsults]);

  // --- Handlers ---

  const handleStartSession = async () => {
    if (!currentTask.trim()) {
        alert("State your task. Don't hide.");
        return;
    }
    if (!cameraActive) await startCamera();
    
    // Reset buffers for new session to ensure clean data start
    attentionBuffer.current = [];
    lastSampleTime.current = Date.now();
    
    setMode(AppMode.FOCUS);
    setTimeLeft(config.focusDuration * 60);
    setIsRunning(true);
    setIntegrity(100);
    setSnapshotPreview(null);
    setPausesLeft(config.maxPauses); // Reset pauses for the session
    setIsPaused(false);
  };

  const handlePause = () => {
      if (pausesLeft > 0 && !isPaused) {
          setIsPaused(true);
          setPausesLeft(prev => prev - 1);
          setPauseTimeLeft(config.pauseDuration * 60);
          stopAlarm(); // Stop any screaming while paused
      } else if (isPaused) {
          // Manual Resume
          setIsPaused(false);
      }
  };

  const handleSkip = () => {
      // Use the ref to skip safely
      handleTimerCompleteRef.current();
  };
  
  const adjustTimer = (seconds: number) => {
      setTimeLeft(prev => {
          const newVal = Math.max(0, prev + seconds);
          if (isRunning && !isPaused) {
              // Adjust the end time anchor so the interval respects the manual change
              endTimeRef.current += (seconds * 1000);
          }
          return newVal;
      });
  };

  const captureWebcam = (): string | null => {
      if (!videoRef.current) return null;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg');
  };

  const handleVerification = async (hasImage: boolean, imageData?: string) => {
      // Bypass if Gemini disabled
      if (!config.enableGemini) {
          setMode(AppMode.BREAK_LONG);
          setTimeLeft(config.longBreakDuration * 60);
          setIsRunning(true);
          return;
      }

      setVerificationLoading(true);
      try {
          const result = await GeminiService.verifyTaskCompletion(currentTask, verifyText, config.modeStyle, imageData);
          if (result.success) {
              setMode(AppMode.BREAK_LONG);
              setTimeLeft(config.longBreakDuration * 60);
              setIsRunning(true);
          } else {
              // Fail
              const punishmentTask = await GeminiService.generatePunishment(config.punishmentStyle, config.modeStyle, config.customPunishmentPrompt);
              setPunishment(punishmentTask);
              setMode(AppMode.PUNISHMENT);
          }
      } catch (e) {
          alert("Error verifying. I'll let it slide this time because I'm broken.");
          setMode(AppMode.BREAK_LONG);
          setTimeLeft(config.longBreakDuration * 60);
          setIsRunning(true);
      }
      setVerificationLoading(false);
      setSnapshotPreview(null);
  };

  const handleRegeneratePunishment = async () => {
    setVerificationLoading(true);
    try {
        const newPunishment = await GeminiService.generatePunishment(config.punishmentStyle, config.modeStyle, config.customPunishmentPrompt);
        setPunishment(newPunishment);
    } catch(e) {
        alert("Failed to generate. Just do the previous one.");
    }
    setVerificationLoading(false);
  };

  const handleResumeSession = () => {
      // Logic to return to the paused session
      setMode(AppMode.FOCUS);
      setIsRunning(true);
      setIsPaused(true); // Start paused
      setPunishment('');
      setSnapshotPreview(null);
      // Ensure heartbeat starts again (handled by effect)
  };

  const handlePunishmentVerify = async () => {
     if (!snapshotPreview) {
         const img = captureWebcam();
         if(img) setSnapshotPreview(img);
         return; 
     }

     setVerificationLoading(true);
     // Note: Since punishment mode is only entered if verification fails, and verification bypasses if disabled,
     // we are technically safe here. But if we somehow get here with disabled AI, accept it.
     if (!config.enableGemini) {
          setHistory(prev => [...prev, {
            timestamp: Date.now(),
            duration: config.focusDuration * 60,
            type: 'FOCUS',
            completed: false, 
            task: currentTask
        }]);
         // End cycle if punishment was required
         setMode(AppMode.IDLE);
         setSessionCount(0);
         setSnapshotPreview(null);
         setVerificationLoading(false);
         return;
     }

     const valid = await GeminiService.verifyPunishment(snapshotPreview);
     setVerificationLoading(false);
     
     if (valid) {
         setHistory(prev => [...prev, {
            timestamp: Date.now(),
            duration: config.focusDuration * 60,
            type: 'FOCUS',
            completed: false, 
            task: currentTask
        }]);
         // PUNISHMENT COMPLETE -> END CYCLE
         setMode(AppMode.IDLE);
         setSessionCount(0);
         setSnapshotPreview(null);
         alert(config.modeStyle === 'HAPPY' ? "Activity verified. You may start over. You've got this!" : "Punishment verified. You may start over. Do not fail again.");
     } else {
         alert(config.modeStyle === 'HAPPY' ? "That didn't look quite right. Please try again." : "That didn't look like punishment. Do it again.");
         setSnapshotPreview(null); 
     }
  };

  const handleSaveSettings = (newConfig: SessionConfig) => {
      setConfig(newConfig);
  };

  const handleSaveTheme = (newTheme: ThemeConfig) => {
      setTheme(newTheme);
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
      setProfile(newProfile);
  };

  const toggleStatsPin = () => {
      setStatsPinned(prev => !prev);
      if (showStats) setShowStats(false); // Close modal if pinning
  };

  // --- Render Helpers ---

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- Views ---

  if (mode === AppMode.ONBOARDING) {
      return <Onboarding onComplete={(p) => { setProfile(p); setMode(AppMode.IDLE); }} />;
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-void-black text-main transition-colors duration-200 overflow-hidden font-mono">
        
        {/* CRITICAL WARNING OVERLAY */}
        {integrity <= 0 && mode === AppMode.FOCUS && <VisualWarning modeStyle={config.modeStyle} />}

        {/* WEBCAM MONITORING UI */}
        <div className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ease-in-out ${mode === AppMode.FOCUS || mode === AppMode.PUNISHMENT ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
             <div className="relative group w-72 bg-black border-2 border-gray-800 rounded-lg overflow-hidden shadow-2xl">
                {/* Video Feed */}
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                
                {/* Integrity Meter Overlay */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-800">
                    <div 
                        className={`h-full transition-all duration-300 ${integrity < 30 ? "bg-red-600 animate-pulse-fast" : "bg-green-600"}`}
                        style={{ width: `${integrity}%` }}
                    />
                </div>

                {/* Status Text Overlay */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    <div className="bg-black/70 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-2 backdrop-blur-sm text-white">
                        <div className={`w-2 h-2 rounded-full ${integrity < 30 ? "bg-red-500 animate-ping" : "bg-green-500"}`} />
                        {integrity < 30 ? "CRITICAL FAILURE" : "MONITORING ACTIVE"}
                    </div>
                    
                    {/* Granular Warnings */}
                    {visionStatus.hasPhone && (
                        <div className="bg-red-600 px-2 py-1 rounded text-[10px] text-white font-bold uppercase animate-pulse flex items-center gap-1">
                            <Smartphone size={10} /> PHONE DETECTED
                        </div>
                    )}
                    {visionStatus.isSlouching && (
                        <div className="bg-yellow-600 px-2 py-1 rounded text-[10px] text-white font-bold uppercase animate-pulse flex items-center gap-1">
                            <User size={10} /> SIT UP STRAIGHT
                        </div>
                    )}
                     {visionStatus.isFacingAway && (
                        <div className="bg-purple-600 px-2 py-1 rounded text-[10px] text-white font-bold uppercase animate-pulse flex items-center gap-1">
                            <Eye size={10} /> EYES FORWARD
                        </div>
                    )}
                    {!visionStatus.isPresent && integrity < 90 && (
                        <div className="bg-orange-600 px-2 py-1 rounded text-[10px] text-white font-bold uppercase animate-pulse flex items-center gap-1">
                            <Eye size={10} /> FACE MISSING
                        </div>
                    )}
                </div>

                {/* Explanation Toggle */}
                <button 
                    className="absolute top-2 right-2 text-gray-400 hover:text-white bg-black/50 rounded-full p-1"
                    onClick={() => setShowExplain(!showExplain)}
                >
                    <HelpCircle size={16} />
                </button>
                
                {/* Explanation Tooltip */}
                {showExplain && (
                    <div className="absolute inset-0 bg-black/95 p-4 text-xs text-gray-300 flex flex-col justify-center animate-fade-in backdrop-blur-sm">
                        <strong className="text-white uppercase mb-2 block">Monitoring Rules:</strong>
                        <ul className="list-disc pl-4 space-y-2 mb-2">
                            <li className="text-red-400"><strong>NO PHONES:</strong> Instant penalty.</li>
                            <li className="text-yellow-400"><strong>NO SLOUCHING:</strong> Sit upright. Don't lean back or slide down.</li>
                            <li><strong>FACE VISIBLE:</strong> Don't leave the chair.</li>
                        </ul>
                        <button onClick={() => setShowExplain(false)} className="mt-2 text-center w-full text-danger-red font-bold uppercase">Close</button>
                    </div>
                )}
             </div>
        </div>
        
        {/* Header */}
        <header className="p-6 flex justify-between items-center z-10 border-b border-gray-900 bg-void-black/80 backdrop-blur">
            <h1 className="text-2xl font-black tracking-widest text-danger-red italic">LOCK IN</h1>
            <div className="flex gap-4">
                <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-800 rounded text-main/50 hover:text-main transition-colors">
                    <SettingsIcon size={24} />
                </button>
                <button onClick={() => setShowStats(true)} className="p-2 hover:bg-gray-800 rounded text-main/50 hover:text-main transition-colors">
                    <TrendingUp size={24} />
                </button>
            </div>
        </header>

        {/* PINNED STATS WIDGET */}
        {statsPinned && !showStats && (
            <div className="fixed top-24 left-6 z-40 animate-fade-in">
                <Stats 
                    history={history} 
                    attentionHistory={attentionHistory}
                    isPinned={true} 
                    onTogglePin={toggleStatsPin}
                />
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
            
            {/* IDLE VIEW */}
            {mode === AppMode.IDLE && (
                <div className="w-full max-w-md space-y-8 animate-fade-in">
                    <div className="text-center space-y-2">
                        <p className="text-main/60">Welcome back, <span className="text-main font-bold">{profile?.name}</span>.</p>
                        <p className="text-sm text-main/50">Ready to stop disappointing your ancestors?</p>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-sm font-bold uppercase text-main/50">Task Objective (Cycle Goal)</label>
                        <textarea 
                            value={currentTask}
                            onChange={(e) => setCurrentTask(e.target.value)}
                            placeholder="What exactly will you accomplish in this cycle? Be specific."
                            className="w-full bg-dim-gray border border-gray-700 p-4 rounded text-main focus:border-danger-red outline-none min-h-[100px] placeholder:text-main/30"
                        />
                    </div>

                    <button 
                        onClick={handleStartSession}
                        className="w-full bg-danger-red hover:brightness-110 text-on-accent font-black py-6 rounded text-xl uppercase tracking-widest shadow-[0_0_20px_rgba(var(--color-accent),0.3)] hover:shadow-[0_0_30px_rgba(var(--color-accent),0.5)] transition-all"
                    >
                        INITIATE PROTOCOL
                    </button>
                </div>
            )}

            {/* FOCUS VIEW */}
            {mode === AppMode.FOCUS && (
                <div className="w-full h-full flex flex-col items-center justify-center relative gap-8 max-w-4xl mx-auto">
                    
                    {/* Timer with Dynamic Controls */}
                    <div className="text-center group relative">
                         {isPaused ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 animate-pulse">
                                <span className="text-8xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">PAUSED</span>
                                <span className="text-2xl text-blue-300 mt-2 font-mono">Auto-Resume: {formatTime(pauseTimeLeft)}</span>
                            </div>
                         ) : null}

                         <div className={`text-[10rem] md:text-[12rem] font-black leading-none tracking-tighter tabular-nums drop-shadow-2xl text-main ${isPaused ? 'opacity-20 blur-sm' : ''}`}>
                             {formatTime(timeLeft)}
                         </div>
                         <div className="absolute top-1/2 -right-12 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => adjustTimer(60)} className="bg-gray-800 p-2 rounded hover:bg-gray-700 hover:text-green-400 text-white"><Plus size={24}/></button>
                            <button onClick={() => adjustTimer(-60)} className="bg-gray-800 p-2 rounded hover:bg-gray-700 hover:text-red-400 text-white"><Minus size={24}/></button>
                         </div>
                         <div className="text-danger-red font-bold uppercase tracking-[1em] animate-pulse">
                             Focusing (Session {sessionCount + 1}/{config.sessionsBeforeLongBreak})
                         </div>
                    </div>

                    {/* Controls: Pause & Skip */}
                    <div className="flex items-center gap-4">
                         <button 
                             onClick={handlePause}
                             disabled={pausesLeft <= 0 && !isPaused}
                             className={`flex items-center gap-2 px-6 py-3 rounded uppercase font-bold tracking-wider transition-all ${
                                 isPaused 
                                 ? 'bg-blue-600 text-white hover:bg-blue-500' 
                                 : pausesLeft > 0 
                                     ? 'bg-gray-800 text-white hover:bg-gray-700' 
                                     : 'bg-gray-900 text-gray-600 cursor-not-allowed'
                             }`}
                         >
                             {isPaused ? <Play size={18} /> : <Pause size={18} />}
                             {isPaused ? "RESUME" : `PAUSE (${pausesLeft})`}
                         </button>

                         <button 
                            onClick={handleSkip}
                            className="bg-void-black border border-gray-800 hover:border-danger-red hover:text-danger-red text-main/60 px-6 py-3 rounded uppercase font-bold tracking-widest flex items-center gap-2 transition-all"
                        >
                            <SkipForward size={18} />
                            Skip
                        </button>
                    </div>

                    {/* Content Area - Text Only */}
                    {config.enableInsults && (
                        <div className="w-full max-w-3xl flex flex-col items-center gap-6">
                            {/* Insult Card - Large Typography */}
                            <div className="w-full bg-dim-gray/80 border-x-4 border-danger-red p-8 rounded shadow-2xl backdrop-blur relative min-h-[160px] flex items-center justify-center text-center">
                                {insult ? (
                                    <p className="text-2xl md:text-4xl font-black text-main leading-tight uppercase font-mono tracking-wide">
                                        "{insult.text}"
                                    </p>
                                ) : (
                                    <p className="text-main/50 animate-pulse text-xl">
                                        {config.modeStyle === 'HAPPY' ? 'Constructing Positive Affirmation...' : 'Constructing Psychological Attack...'}
                                    </p>
                                )}
                                <button 
                                    onClick={generateNewInsult} 
                                    disabled={loadingMessage}
                                    className="absolute top-2 right-2 text-main/50 hover:text-main p-2"
                                    title="Get new motivation"
                                >
                                    <RefreshCw size={20} className={loadingMessage ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BREAK VIEW */}
            {(mode === AppMode.BREAK_SHORT || mode === AppMode.BREAK_LONG) && (
                <div className="text-center z-10">
                     <h2 className="text-4xl font-bold text-green-500 mb-4">REST PROTOCOL</h2>
                     <div className="text-9xl font-mono mb-8 text-main">{formatTime(timeLeft)}</div>
                     <p className="text-main/60 max-w-md mx-auto mb-8">
                         Don't get comfortable. The next session will be harder. 
                         {mode === AppMode.BREAK_LONG ? " Enjoy your long break." : " Just a quick sip of water."}
                     </p>
                     
                     <button 
                        onClick={handleSkip}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded uppercase tracking-wider transition-colors"
                    >
                        Skip Break (Start Suffering)
                    </button>
                </div>
            )}

            {/* VERIFICATION VIEW */}
            {mode === AppMode.VERIFY_TASK && (
                 <div className="w-full max-w-md bg-dim-gray p-8 rounded border border-gray-700 space-y-6 z-10">
                     <h2 className="text-2xl font-bold text-main uppercase text-center border-b border-gray-700 pb-4">Cycle Complete</h2>
                     <p className="text-main/60 text-sm">Prove you accomplished your goal during this cycle.</p>
                     
                     <div>
                         <label className="block text-xs uppercase text-main/50 mb-1">Summary of accomplishments</label>
                         <textarea 
                            className="w-full bg-void-black border border-gray-800 p-3 rounded text-main h-32"
                            value={verifyText}
                            onChange={e => setVerifyText(e.target.value)}
                         />
                     </div>

                     <div className="grid grid-cols-2 gap-2">
                         <button 
                             onClick={() => {
                                 const input = document.createElement('input');
                                 input.type = 'file';
                                 input.accept = 'image/*';
                                 input.onchange = (e) => {
                                     const file = (e.target as HTMLInputElement).files?.[0];
                                     if(file) {
                                         const reader = new FileReader();
                                         reader.onloadend = () => handleVerification(true, reader.result as string);
                                         reader.readAsDataURL(file);
                                     }
                                 };
                                 input.click();
                             }}
                             disabled={verificationLoading}
                             className="bg-gray-700 hover:bg-gray-600 py-3 rounded flex items-center justify-center gap-2 text-xs text-white"
                         >
                             <Camera size={14} /> Upload File
                         </button>
                         <button 
                             onClick={() => {
                                 const img = captureWebcam();
                                 if(img) handleVerification(true, img);
                             }}
                             disabled={verificationLoading}
                             className="bg-gray-700 hover:bg-gray-600 py-3 rounded flex items-center justify-center gap-2 text-xs text-white"
                         >
                             <Eye size={14} /> Use Webcam
                         </button>
                     </div>
                     <button 
                        onClick={() => handleVerification(false)}
                        disabled={verificationLoading}
                        className="w-full bg-blue-900 hover:bg-blue-800 py-3 rounded text-blue-100"
                     >
                         Verify with Text Only
                     </button>
                     
                     {verificationLoading && <div className="text-center text-danger-red animate-pulse">JUDGING YOU...</div>}
                 </div>
            )}

            {/* PUNISHMENT VIEW */}
            {mode === AppMode.PUNISHMENT && (
                 <div className="w-full max-w-lg bg-gray-900 border-4 border-danger-red p-8 rounded text-center z-10 shadow-2xl relative">
                     {/* Go Back Button */}
                     <button 
                        onClick={handleResumeSession}
                        className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-1 uppercase text-xs font-bold"
                     >
                        <ArrowLeft size={14} /> Resume Session (Skip)
                     </button>

                     <h2 className="text-3xl font-black text-danger-red mb-6 uppercase tracking-wider drop-shadow-md mt-6">
                        {config.modeStyle === 'HAPPY' ? "LET'S TRY AGAIN" : "FAILURE DETECTED"}
                     </h2>
                     <p className="text-white mb-8 text-xl font-mono bg-black/50 p-4 rounded border border-gray-700">{punishment}</p>
                     
                     <div className="bg-black/80 p-4 rounded mb-6 border border-gray-800">
                         {snapshotPreview ? (
                             <div className="space-y-4">
                                <img src={snapshotPreview} alt="Proof" className="w-full rounded border border-gray-600" />
                                <div className="flex gap-2">
                                     <button 
                                         onClick={() => setSnapshotPreview(null)}
                                         className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded text-white font-bold uppercase"
                                     >Retake</button>
                                     <button 
                                         onClick={handlePunishmentVerify}
                                         className="flex-1 bg-danger-red hover:bg-red-600 text-white font-bold py-2 rounded uppercase"
                                     >Submit Proof</button>
                                </div>
                             </div>
                         ) : (
                             <>
                                <p className="text-sm text-gray-400 mb-4">
                                    {config.modeStyle === 'HAPPY' ? 'Perform the activity in front of the camera.' : 'Perform the punishment in front of the camera.'}
                                </p>
                                <button 
                                     onClick={() => {
                                         const img = captureWebcam();
                                         if(img) setSnapshotPreview(img);
                                     }}
                                     disabled={verificationLoading}
                                     className="w-full bg-danger-red hover:bg-red-600 text-white font-bold py-4 rounded uppercase tracking-wider"
                                 >
                                     CAPTURE SNAPSHOT
                                 </button>
                             </>
                         )}
                         {verificationLoading && <p className="mt-2 text-red-400 animate-pulse font-bold">ANALYZING...</p>}
                     </div>
                     
                     <button 
                        onClick={handleRegeneratePunishment}
                        disabled={verificationLoading}
                        className="text-gray-500 hover:text-white text-xs underline uppercase tracking-wide"
                     >
                        I can't do this (Regenerate)
                     </button>
                 </div>
            )}
        </main>
        
        {/* Modals */}
        {showSettings && profile && (
            <SettingsModal 
                config={config}
                profile={profile}
                currentTheme={theme}
                onSaveConfig={handleSaveSettings}
                onSaveTheme={handleSaveTheme}
                onSaveProfile={handleSaveProfile}
                onClose={() => setShowSettings(false)} 
            />
        )}
        {showStats && (
            <Stats 
                history={history} 
                attentionHistory={attentionHistory}
                onClose={() => setShowStats(false)} 
                onTogglePin={toggleStatsPin}
                isPinned={false}
            />
        )}
    </div>
  );
};

export default App;