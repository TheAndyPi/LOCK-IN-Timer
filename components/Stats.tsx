import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SessionData, AttentionSample } from '../types';
import { X, Pin, PinOff, Calendar, Clock, Activity, TrendingUp } from 'lucide-react';

interface StatsProps {
  history: SessionData[];
  attentionHistory?: AttentionSample[];
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

type TimeRange = 'week' | 'day' | 'hour';

export const Stats: React.FC<StatsProps> = ({ history, attentionHistory = [], onClose, isPinned = false, onTogglePin, className = '' }) => {
  const [range, setRange] = useState<TimeRange>('hour');

  const data = useMemo(() => {
    const now = Date.now();
    
    if (range === 'hour') {
        // --- 1H View: Minute-by-Minute Attention Score ---
        // Filter last 60 minutes
        const oneHourAgo = now - 60 * 60 * 1000;
        const relevantSamples = attentionHistory.filter(s => s.timestamp >= oneHourAgo);
        
        // Group by minute (though samples are already per minute roughly)
        // We'll fill gaps to ensure the graph looks like a timeline
        const map: Record<string, number> = {};
        for (let i = 59; i >= 0; i--) {
            const d = new Date(now - i * 60 * 1000);
            const label = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            map[label] = 0; // Default to 0 (Missing data is treated as lack of focus/data)
        }
        
        relevantSamples.forEach(s => {
            const d = new Date(s.timestamp);
            const label = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            if (map[label] !== undefined) map[label] = s.score;
        });
        
        return Object.entries(map).map(([label, score]) => ({
            label,
            value: score,
            metric: 'Score'
        }));

    } else if (range === 'week') {
      const filtered = history.filter(s => s.type === 'FOCUS' && s.completed);
      const map: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now - i * 24 * 60 * 60 * 1000);
        map[d.toLocaleDateString()] = 0;
      }

      filtered.forEach(s => {
        const d = new Date(s.timestamp).toLocaleDateString();
        if (map[d] !== undefined) map[d] += s.duration / 60;
      });

      return Object.entries(map).map(([date, minutes]) => ({
        label: date.split('/').slice(0, 2).join('/'),
        value: Math.round(minutes),
        metric: 'Mins'
      }));
    } else {
      // Last 24 Hours
      const filtered = history.filter(s => s.type === 'FOCUS' && s.completed);
      const map: Record<string, number> = {};
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now - i * 60 * 60 * 1000);
        const hour = d.getHours();
        const label = `${hour}:00`;
        map[label] = 0;
      }
      
      filtered.forEach(s => {
        if (now - s.timestamp < 24 * 60 * 60 * 1000) {
            const d = new Date(s.timestamp);
            const label = `${d.getHours()}:00`;
            if (map[label] !== undefined) map[label] += s.duration / 60;
        }
      });

      return Object.entries(map).map(([label, minutes]) => ({
        label,
        value: Math.round(minutes),
        metric: 'Mins'
      }));
    }
  }, [history, attentionHistory, range]);

  const totalTime = useMemo(() => 
    Math.round(history.reduce((acc, s) => s.type === 'FOCUS' && s.completed ? acc + s.duration : acc, 0) / 60), 
  [history]);

  // Color helper for 1H view
  const getBarColor = (val: number) => {
      if (range !== 'hour') return '#ff0000'; // Default red for time
      if (val >= 80) return '#22c55e'; // Green
      if (val >= 50) return '#eab308'; // Yellow
      return '#ef4444'; // Red
  };

  // View Variants
  if (isPinned) {
    return (
      <div className={`bg-black/40 backdrop-blur-sm border border-gray-800 rounded p-4 w-80 shadow-xl transition-all hover:bg-black/60 ${className}`}>
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Activity size={12} /> Live Integrity
            </h3>
            <div className="flex gap-1">
                 <button onClick={() => setRange('hour')} className={`text-[10px] uppercase px-1 py-0.5 rounded ${range === 'hour' ? 'bg-red-900 text-white' : 'bg-gray-800 text-gray-400'}`}>1H</button>
                 <button onClick={() => setRange('day')} className={`text-[10px] uppercase px-1 py-0.5 rounded ${range === 'day' ? 'bg-red-900 text-white' : 'bg-gray-800 text-gray-400'}`}>24H</button>
                {onTogglePin && (
                    <button onClick={onTogglePin} className="text-gray-500 hover:text-red-500 ml-1">
                        <PinOff size={12} />
                    </button>
                )}
            </div>
        </div>
        <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                        cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={range === 'day' ? 6 : range === 'hour' ? 3 : 12}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                        ))}
                    </Bar>
                    <XAxis dataKey="label" hide />
                    {range === 'hour' && <YAxis domain={[0, 100]} hide />}
                </BarChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-500 font-mono">
            <span>{range === 'hour' ? 'AVG INTEGRITY' : 'TOTAL TIME'}</span>
            <span>{range === 'hour' ? 'LAST 60 MINS' : range === 'day' ? 'LAST 24 HOURS' : 'LAST 7 DAYS'}</span>
        </div>
      </div>
    );
  }

  // Modal View
  return (
    <div className="absolute inset-0 bg-void-black/95 z-[60] flex flex-col items-center justify-center p-8 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-dim-gray border border-gray-700 p-6 rounded-lg shadow-2xl relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <h2 className="text-2xl font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={24} className="text-danger-red" /> Performance Record
          </h2>
          <div className="flex gap-4 items-center">
            {onTogglePin && (
                <button onClick={onTogglePin} className="flex items-center gap-2 text-gray-400 hover:text-white uppercase text-xs tracking-widest border border-gray-700 px-3 py-2 rounded hover:border-gray-500 transition-colors">
                    <Pin size={14} /> Pin to Dashboard
                </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-white uppercase"><X size={24} /></button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 mb-6 justify-end">
            <button 
                onClick={() => setRange('hour')}
                className={`px-4 py-2 rounded text-sm font-bold uppercase ${range === 'hour' ? 'bg-danger-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
                Last Hour (Integrity)
            </button>
            <button 
                onClick={() => setRange('day')}
                className={`px-4 py-2 rounded text-sm font-bold uppercase ${range === 'day' ? 'bg-danger-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
                Last 24 Hours
            </button>
            <button 
                onClick={() => setRange('week')}
                className={`px-4 py-2 rounded text-sm font-bold uppercase ${range === 'week' ? 'bg-danger-red text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
            >
                Last 7 Days
            </button>
        </div>

        {/* Main Graph */}
        <div className="h-80 w-full mb-8 bg-black/20 rounded p-4 border border-gray-800/50">
            <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis 
                    dataKey="label" 
                    stroke="#666" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    interval={range === 'day' ? 2 : range === 'hour' ? 4 : 0} 
                />
                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} unit={range === 'hour' ? '' : 'm'} domain={range === 'hour' ? [0, 100] : ['auto', 'auto']} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333' }}
                    itemStyle={{ color: '#fff' }}
                    cursor={{fill: 'rgba(255, 255, 255, 0.05)'}}
                    formatter={(value: number, name: string, props: any) => [
                        `${value} ${props.payload.metric === 'Score' ? '%' : 'mins'}`, 
                        props.payload.metric === 'Score' ? 'Integrity' : 'Focus Time'
                    ]}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={range === 'hour' ? 6 : undefined}>
                   {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.value)} />
                    ))}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
        </div>

        {/* Footer Stats */}
        <div className="grid grid-cols-3 gap-4">
            <StatBox label="Total Focus Time" value={`${totalTime} mins`} />
            <StatBox label="Sessions Completed" value={history.filter(s => s.type === 'FOCUS' && s.completed).length.toString()} />
            <StatBox label="Avg Integrity (Last 1h)" value={`${Math.round(attentionHistory.slice(-60).reduce((a,b)=>a+b.score,0)/(attentionHistory.slice(-60).length||1))}%`} />
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: string }> = ({ label, value }) => (
    <div className="bg-void-black p-4 rounded border border-gray-800">
        <p className="text-gray-500 text-xs uppercase mb-1">{label}</p>
        <p className="text-2xl font-mono text-white">{value}</p>
    </div>
);