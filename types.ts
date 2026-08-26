
export type Mood = 'happy' | 'neutral' | 'sad' | 'excited' | 'anxious' | 'tired' | 'peaceful';

export interface DiaryEntry {
  id: string;
  date: string; // ISO string
  title: string;
  content: string;
  mood: Mood;
  tags: string[];
  image?: string; // Base64 data URL
  aiSummary?: string;
  aiInsights?: string;
}

export interface WeeklyStats {
  moodCounts: Record<Mood, number>;
  totalEntries: number;
}
