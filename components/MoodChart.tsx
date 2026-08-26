
import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { DiaryEntry, Mood } from '../types';

interface MoodChartProps {
  entries: DiaryEntry[];
}

const moodData = [
  { mood: 'happy', label: 'Happy', color: '#fbbf24' },
  { mood: 'excited', label: 'Excited', color: '#f59e0b' },
  { mood: 'peaceful', label: 'Peaceful', color: '#10b981' },
  { mood: 'neutral', label: 'Neutral', color: '#94a3b8' },
  { mood: 'tired', label: 'Tired', color: '#6366f1' },
  { mood: 'anxious', label: 'Anxious', color: '#8b5cf6' },
  { mood: 'sad', label: 'Sad', color: '#f43f5e' },
];

const MoodChart: React.FC<MoodChartProps> = ({ entries }) => {
  const data = useMemo(() => {
    const counts = entries.reduce((acc, entry) => {
      acc[entry.mood] = (acc[entry.mood] || 0) + 1;
      return acc;
    }, {} as Record<Mood, number>);

    return moodData.map(m => ({
      name: m.label,
      value: counts[m.mood as Mood] || 0,
      color: m.color
    })).filter(d => d.value > 0);
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-[400px] flex flex-col">
      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
        <i className="fa-solid fa-chart-simple text-indigo-500"></i>
        Mood Distribution
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MoodChart;
