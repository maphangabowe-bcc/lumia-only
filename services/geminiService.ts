import { DiaryEntry, Mood } from "../types";
import { networkManager } from "./networkService";

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 4000): Promise<Response> => {
  const status = networkManager.getStatus();
  // On slow network or data saver, use a quick 3s timeout
  const timeout = status.isSlowConnection ? 2800 : timeoutMs;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

export const analyzeMood = async (text: string): Promise<{ mood: Mood; explanation: string }> => {
  try {
    const response = await fetchWithTimeout("/api/gemini/analyze-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    return await response.json();
  } catch (err) {
    console.log("Self-reflection info: localized mood sentiment analysis activated.");
    const input = (text || "").toLowerCase();
    let mood: Mood = "neutral";
    let explanation = "Your thoughts portray a balanced, calm, and thoughtful perspective.";

    if (input.includes("sad") || input.includes("cry") || input.includes("hurt") || input.includes("grief") || input.includes("lonely") || input.includes("blue") || input.includes("tear")) {
      mood = "sad";
      explanation = "We notice a gentle undertone of sad sentiments in your text, which is a key part of processing feelings.";
    } else if (input.includes("anxious") || input.includes("worry") || input.includes("scared") || input.includes("panic") || input.includes("afraid") || input.includes("stress")) {
      mood = "anxious";
      explanation = "Your thoughts signal some symptoms of worry or strain. Pause for a slow, calming breath.";
    } else if (input.includes("excited") || input.includes("thrilled") || input.includes("can't wait") || input.includes("awesome") || input.includes("amazing") || input.includes("greatest")) {
      mood = "excited";
      explanation = "Your writing sparkles with bright, eager, and inspired outlooks! Continue celebrating your growth.";
    } else if (input.includes("happy") || input.includes("joy") || input.includes("glad") || input.includes("love") || input.includes("smile") || input.includes("wonderful")) {
      mood = "happy";
      explanation = "This entry radiates with bright appreciation and warmth. Keep holding onto your happiness!";
    } else if (input.includes("tired") || input.includes("exhaust") || input.includes("sleep") || input.includes("drain") || input.includes("fatigue")) {
      mood = "tired";
      explanation = "Your energy physical stores look depleted. Rest is an essential component of regular self-care.";
    } else if (input.includes("peace") || input.includes("calm") || input.includes("still") || input.includes("gratitude") || input.includes("serene")) {
      mood = "peaceful";
      explanation = "We sense a restful harmony and peaceful clarity inside your reflections.";
    }
    return { mood, explanation };
  }
};

export const getWritingPrompt = async (recentEntries: DiaryEntry[]): Promise<string> => {
  try {
    const response = await fetchWithTimeout("/api/gemini/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recentEntries }),
    });
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    const data = await response.json();
    return data.prompt;
  } catch (err) {
    console.log("Self-reflection info: localized writing prompt loaded.");
    const prompts = [
      "What is one thing you did today that made you feel proud?",
      "Describe a small detail of your day that you want to remember.",
      "What is something that felt challenging today, and how did you handle it?",
      "How did your energy level shift from morning to evening?",
      "What is a piece of advice you’d give to your yesterday-self?",
      "Describe a beautiful sound, sight, or taste you experienced today.",
      "Which emotion took up the most space in your heart today?",
      "What is something you are looking forward to tomorrow?",
      "Write about a person who made today a little better.",
      "If today was a chapter in a book, what would the chapter title be?"
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
};

export const generateWeeklyReflections = async (entries: DiaryEntry[]): Promise<string> => {
  try {
    const response = await fetchWithTimeout("/api/gemini/weekly-reflection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    const data = await response.json();
    return data.insight;
  } catch (err) {
    console.log("Self-reflection info: localized weekly reflection generated.");
    const moodsUsed = entries.map(e => e.mood || 'neutral');
    const uniqueMoods = [...new Set(moodsUsed)] as string[];
    const count = entries.length;
    
    if (count === 0) {
      return "Your weekly reflections page will start filling with gentle observations once you begin writing your diary entries. Take a quiet, mindful moment to capture your thoughts today.";
    }
    const moodString = uniqueMoods.length > 0 ? `characterized by expressions of ${uniqueMoods.join(', ')}` : "balanced in nature";
    return `You have logged ${count} memories over the past week, ${moodString}. Reflecting on these shows your incredible commitment to mindfulness.\n\nYou are showing a strong pattern of self-awareness. Try to take 5 minutes tomorrow morning to pause and appreciate your progress on this wonderful journal journey!`;
  }
};

export const polishEntry = async (text: string): Promise<string> => {
  try {
    const response = await fetchWithTimeout("/api/gemini/polish-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    const data = await response.json();
    return data.text;
  } catch (err) {
    console.log("Self-reflection info: localized text polishing applied.");
    let polished = (text || "").trim();
    if (polished) {
      // Capitalize first letters of sentences
      polished = polished.replace(/(^\s*|[.!?]\s+)([a-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
    }
    return polished || text;
  }
};

export const getDailyAffirmation = async (mood: Mood, usedAffirmations: string[] = []): Promise<string> => {
  try {
    const response = await fetchWithTimeout("/api/gemini/affirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, usedAffirmations }),
    });
    if (!response.ok) {
      throw new Error("HTTP error: " + response.status);
    }
    const data = await response.json();
    return data.affirmation;
  } catch (err) {
    console.log("Self-reflection info: localized unique affirmation generated.");
    const openings = [
      "In this fresh morning hour,",
      "As dawn gently breaks,",
      "With a blank, open horizon before you,",
      "As this new day begins to unfold,",
      "With the warmth of this new sunrise,",
      "Breathing in the calm morning air,",
      "Standing at the threshold of today,",
      "Under this wide and open sky,",
      "In the gentle quiet of this moment,",
      "Greeting the possibilities of today,",
      "As the morning light finds its rhythm,",
      "With every steady breath you take,",
      "Entering this day with quiet grace,",
      "Welcoming this unwritten chapter,",
      "Anchored in the peace of this new dawn,"
    ];

    const moodWisdomMap: Record<string, string[]> = {
      happy: [
        "your joy is an expansive light that effortlessly brightens every room you enter",
        "plant the vibrant seeds of gladness into every connection and task today",
        "celebrate this uplifting momentum and let your gratitude ripple outward",
        "you hold the unconditional freedom to savor every small spark of beauty",
        "let your natural warmth serve as an inviting refuge for yourself and others",
        "channel this radiant vitality into creative expression and genuine kindness",
        "your heart is a natural beacon of abundance, delight, and goodwill today",
        "embrace this harmonious glow and cherish how far you have grown"
      ],
      excited: [
        "channel this electric enthusiasm into bold, purposeful, and imaginative steps",
        "your visionary passion acts as a brilliant catalyst for transformative change",
        "welcome the thrilling dance of creative discovery with an open, courageous spirit",
        "let this spirited momentum fuel your dreams while keeping your feet steady",
        "your eager spirit unlocks hidden potential and inspiring new directions",
        "trust the vibrant current of your ambition to guide you toward wonderful breakthroughs",
        "harness this spark of inspiration to build something meaningful and lasting",
        "allow your boundless curiosity to turn everyday moments into adventures"
      ],
      peaceful: [
        "rest anchored in the silent sanctuary of your own steady, tranquil center",
        "let a slow, serene rhythm guide your thoughts through whatever arises today",
        "protect this still harbor with mindful presence and patient self-honor",
        "grant yourself full permission to move at the unhurried pace of deep peace",
        "your inner equilibrium remains unshakable, like a mountain in the morning mist",
        "find sanctuary in simplicity, letting go of whatever does not serve your calm",
        "flow effortlessly around obstacles like clean water carving its gentle path",
        "honor the restorative power of quiet presence and deliberate stillness"
      ],
      neutral: [
        "stand centered in the pure, fertile potential of this quiet and balanced space",
        "observe your thoughts with gentle curiosity, watching them pass like drifting clouds",
        "walk steadily along your path, trusting the clarity of each mindful step",
        "celebrate the understated strength found in calm, patient, and objective observation",
        "this neutral stillness is the ideal fertile soil for fresh wisdom to take root",
        "give yourself the gift of simply existing without rushing to define the moment",
        "your calm presence is a foundation of quiet resilience and poised clarity",
        "welcome the steady neutrality of this day as a clean slate for peaceful choices"
      ],
      sad: [
        "allow your tender feelings to flow gently like rain that softens the soil for new growth",
        "wrap your heart in patient self-compassion, knowing all seasons eventually change",
        "even in deep quiet valleys, your resilience is silently gathering renewed strength",
        "honor your emotions with soft understanding without letting sorrow define your worth",
        "give yourself permission to rest gently while the healing light quietly finds its way",
        "your vulnerability is a quiet testament to the depth and beauty of your human heart",
        "trust that this tender mist will lift at its own natural, restorative tempo",
        "breathe in comfort and let yourself be held by the quiet grace of today"
      ],
      anxious: [
        "anchor deeply in the safety of this present breath, releasing tomorrow's unknowns",
        "meet racing thoughts with a calm, grounding embrace and steady exhalations",
        "your intrinsic value and safety remain completely untouched by passing waves of worry",
        "take just one gentle, manageable step at a time; you have the inner power to handle today",
        "let your shoulders drop and your chest soften as you return to this quiet sanctuary",
        "trust your resilient nature to steer through uncertainty with calm composure",
        "you are stronger than any passing apprehension and deeply grounded in reality",
        "inhale quiet stability, exhale tension, and trust your steady inner anchor"
      ],
      tired: [
        "treat your body and mind with gentle tenderness, honoring rest as an act of wisdom",
        "step softly through the day, remembering that quality and care outweigh frantic speed",
        "recharging your inner reserves is a noble victory that fuels tomorrow's brilliance",
        "grant yourself absolute grace to slow down, simplify, and receive rest",
        "your worth is rooted in who you are, not in the volume of your daily output",
        "protect your energy reserves and let calm restoration be your primary focus",
        "listen closely to what your spirit needs and nurture yourself without guilt",
        "move with restorative ease, trusting that pausing is a vital part of the journey"
      ]
    };

    const microIntents = [
      "Micro-focus: Notice 3 subtle wonders around you.",
      "Invitation: Take 2 slow, restorative breaths before speaking.",
      "Guide-star: Move 10% more slowly and deliberately.",
      "Anchor: Appreciate one simple blessing right in front of you.",
      "Intention: Acknowledge a small personal victory before moving to the next task.",
      "Gift to self: Replace self-criticism with warm, patient understanding.",
      "Practice: Pause at midday to feel the ground beneath your feet.",
      "Motto: Trust the timing of your growth and honor your pace.",
      "Mindful touch: Let your shoulders drop and smile softly to yourself.",
      "Reflection: Offer one sincere word of kindness to someone today."
    ];

    const moodPool = moodWisdomMap[mood] || moodWisdomMap.neutral;
    const normalizedExclusions = new Set(usedAffirmations.map(s => s.toLowerCase().trim()));
    
    const candidates: string[] = [];
    for (const op of openings) {
      for (const wis of moodPool) {
        for (const mi of microIntents) {
          const combined = `${op} ${wis}. ${mi}`;
          if (!normalizedExclusions.has(combined.toLowerCase().trim())) {
            candidates.push(combined);
          }
        }
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    // Fallback dynamic seed
    const randomSeed = Math.floor(Math.random() * 10000);
    return `${openings[randomSeed % openings.length]} ${moodPool[randomSeed % moodPool.length]}. ${microIntents[randomSeed % microIntents.length]}`;
  }
};
