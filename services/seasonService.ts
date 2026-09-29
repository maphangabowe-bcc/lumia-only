export type SeasonKey = 'auto' | 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonTheme {
  id: 'spring' | 'summer' | 'autumn' | 'winter';
  name: string;
  emoji: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  gradientHeader: string;
  badgeBg: string;
  badgeText: string;
  cardBorder: string;
  glowColor: string;
  heroBg: string;
}

export const SEASONS: Record<'spring' | 'summer' | 'autumn' | 'winter', SeasonTheme> = {
  spring: {
    id: 'spring',
    name: 'Spring Blossom',
    emoji: '🌸',
    tagline: 'Fresh beginnings and blossoming growth',
    primaryColor: 'emerald',
    accentColor: 'emerald-600',
    gradientHeader: 'from-emerald-600 via-teal-600 to-cyan-700',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    cardBorder: 'border-emerald-100',
    glowColor: 'bg-emerald-400/20',
    heroBg: 'from-emerald-50/60 via-teal-50/40 to-white'
  },
  summer: {
    id: 'summer',
    name: 'Summer Radiant',
    emoji: '☀️',
    tagline: 'Warm sunlight, energy, and radiant warmth',
    primaryColor: 'amber',
    accentColor: 'amber-600',
    gradientHeader: 'from-amber-500 via-orange-500 to-rose-600',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    cardBorder: 'border-amber-100',
    glowColor: 'bg-amber-400/25',
    heroBg: 'from-amber-50/60 via-orange-50/30 to-white'
  },
  autumn: {
    id: 'autumn',
    name: 'Autumn Amber',
    emoji: '🍂',
    tagline: 'Golden foliage, cozy warmth, and harvest reflection',
    primaryColor: 'orange',
    accentColor: 'orange-600',
    gradientHeader: 'from-orange-600 via-amber-700 to-rose-800',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    cardBorder: 'border-orange-100',
    glowColor: 'bg-orange-400/20',
    heroBg: 'from-orange-50/60 via-amber-50/30 to-white'
  },
  winter: {
    id: 'winter',
    name: 'Winter Frost',
    emoji: '❄️',
    tagline: 'Crisp snow, serene quiet, and cozy introspection',
    primaryColor: 'sky',
    accentColor: 'sky-600',
    gradientHeader: 'from-sky-700 via-indigo-700 to-slate-900',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    cardBorder: 'border-sky-100',
    glowColor: 'bg-sky-400/20',
    heroBg: 'from-sky-50/50 via-indigo-50/30 to-white'
  }
};

export function getAutoSeason(): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = new Date().getMonth(); // 0-11 (Jan=0, Dec=11)
  // Spring: March (2) to May (4)
  if (month >= 2 && month <= 4) return 'spring';
  // Summer: June (5) to August (7)
  if (month >= 5 && month <= 7) return 'summer';
  // Autumn: September (8) to November (10)
  if (month >= 8 && month <= 10) return 'autumn';
  // Winter: December (11), January (0), February (1)
  return 'winter';
}

export function getCurrentSeasonTheme(): SeasonTheme {
  try {
    const override = localStorage.getItem('lumina_season_theme') as SeasonKey | null;
    if (override && override !== 'auto' && SEASONS[override]) {
      return SEASONS[override];
    }
  } catch {}
  
  return SEASONS[getAutoSeason()];
}
