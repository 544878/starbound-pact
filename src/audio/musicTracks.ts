/**
 * Starbound Pact - Musical Tracks & Composition Data
 * 
 * Track 1: 《星海静谧》 (Astral Haven) - 主页专属曲
 * - Style: 治愈空灵星空庇护所，柔和弦乐Pad、晶莹钟琴、抒情钢琴
 * - Tempo: 72 BPM (4/4 拍)
 * - Key: D Major / B Minor
 * 
 * Track 2: 《星阵破晓 · 英雄交响》 (Astral Dawn - Heroic Anthem) - 战斗专属曲
 * - Style: 宏伟壮丽、热血激昂的英雄主义战役交响（Heroic JRPG Orchestral Anthem）
 * - Tempo: 120 BPM (4/4 拍)
 * - Key: D Dorian / D Major (充满史诗感与破晓希望的调性走向)
 */

export type TrackId = 'home' | 'battle';

export interface NoteEvent {
  time: number; // in 16th steps within the measure or section (0-indexed)
  pitch: string | number; // Note name like 'D4', 'F#4' or MIDI number, or 0 for rest
  duration: number; // duration in 16th notes
  velocity?: number; // 0 to 1
}

export interface DrumStep {
  kick?: boolean;   // Orchestral Timpani / Deep Impact
  snare?: boolean;  // Noble Field Snare
  hihat?: boolean;  // Crisp Cymbal / Hat
  openHat?: boolean;// Open Accent
  crash?: boolean;  // Triumphant Crash Cymbal
}

export interface MusicTrackConfig {
  id: TrackId;
  title: string;
  subtitle: string;
  bpm: number;
  stepsPerBar: number;
  totalBars: number;
  pads: Array<{
    bar: number;
    notes: string[];
    durationBars: number;
  }>;
  arpeggios: Array<NoteEvent>;
  bassline: Array<NoteEvent>;
  melody: Array<NoteEvent>;
  drums?: Array<{
    bar: number;
    pattern: DrumStep[];
  }>;
}

/**
 * Converts note strings like 'C4', 'F#5', 'Bb3' or MIDI numbers into frequency (Hz).
 */
export function noteToFreq(note: string | number): number {
  if (typeof note === 'number') {
    if (note <= 0) return 0;
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  const matches = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!matches) return 0;

  const letter = matches[1].toUpperCase();
  const accidental = matches[2];
  const octave = parseInt(matches[3], 10);

  const baseNotes: Record<string, number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  let semitone = baseNotes[letter] ?? 0;
  if (accidental === '#') semitone += 1;
  else if (accidental === 'b') semitone -= 1;

  const midi = 12 + octave * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// -----------------------------------------------------------------------------------------
// TRACK 1: 《星海静谧》 (Astral Haven) - 主页专属曲
// -----------------------------------------------------------------------------------------
export const HOME_TRACK: MusicTrackConfig = {
  id: 'home',
  title: '星海静谧',
  subtitle: '星契纪元 · 主页专属曲',
  bpm: 72,
  stepsPerBar: 16,
  totalBars: 16,
  pads: [
    { bar: 0, notes: ['D3', 'A3', 'C#4', 'F#4'], durationBars: 1 },
    { bar: 1, notes: ['B2', 'F#3', 'D4', 'C#5'], durationBars: 1 },
    { bar: 2, notes: ['G2', 'D3', 'F#4', 'B4'], durationBars: 1 },
    { bar: 3, notes: ['A2', 'E3', 'D4', 'G4'], durationBars: 1 },

    { bar: 4, notes: ['F#2', 'C#3', 'A3', 'E4'], durationBars: 1 },
    { bar: 5, notes: ['B2', 'F#3', 'D4', 'A4'], durationBars: 1 },
    { bar: 6, notes: ['E2', 'B2', 'G3', 'D4'], durationBars: 1 },
    { bar: 7, notes: ['A2', 'E3', 'G3', 'C#4'], durationBars: 1 },

    { bar: 8, notes: ['D3', 'A3', 'F#4', 'C#5'], durationBars: 1 },
    { bar: 9, notes: ['F#2', 'C#3', 'A3', 'E4'], durationBars: 1 },
    { bar: 10, notes: ['G2', 'D3', 'B3', 'F#4'], durationBars: 1 },
    { bar: 11, notes: ['B2', 'F#3', 'D4', 'A4'], durationBars: 1 },

    { bar: 12, notes: ['G2', 'D3', 'B3', 'E4'], durationBars: 1 },
    { bar: 13, notes: ['A2', 'E3', 'C#4', 'F#4'], durationBars: 1 },
    { bar: 14, notes: ['B2', 'F#3', 'D4', 'C#5'], durationBars: 1 },
    { bar: 15, notes: ['D3', 'A3', 'F#4', 'A4'], durationBars: 1 },
  ],
  bassline: [
    { time: 0, pitch: 'D2', duration: 8, velocity: 0.65 },
    { time: 8, pitch: 'A2', duration: 8, velocity: 0.5 },
    { time: 16, pitch: 'B1', duration: 8, velocity: 0.65 },
    { time: 24, pitch: 'F#2', duration: 8, velocity: 0.5 },
    { time: 32, pitch: 'G1', duration: 8, velocity: 0.65 },
    { time: 40, pitch: 'D2', duration: 8, velocity: 0.5 },
    { time: 48, pitch: 'A1', duration: 8, velocity: 0.65 },
    { time: 56, pitch: 'E2', duration: 8, velocity: 0.5 },

    { time: 64, pitch: 'F#1', duration: 8, velocity: 0.65 },
    { time: 72, pitch: 'C#2', duration: 8, velocity: 0.5 },
    { time: 80, pitch: 'B1', duration: 8, velocity: 0.65 },
    { time: 88, pitch: 'F#2', duration: 8, velocity: 0.5 },
    { time: 96, pitch: 'E2', duration: 8, velocity: 0.65 },
    { time: 104, pitch: 'B2', duration: 8, velocity: 0.5 },
    { time: 112, pitch: 'A1', duration: 8, velocity: 0.65 },
    { time: 120, pitch: 'G2', duration: 8, velocity: 0.5 },

    { time: 128, pitch: 'D2', duration: 8, velocity: 0.65 },
    { time: 136, pitch: 'A2', duration: 8, velocity: 0.5 },
    { time: 144, pitch: 'F#1', duration: 8, velocity: 0.65 },
    { time: 152, pitch: 'C#2', duration: 8, velocity: 0.5 },
    { time: 160, pitch: 'G1', duration: 8, velocity: 0.65 },
    { time: 168, pitch: 'D2', duration: 8, velocity: 0.5 },
    { time: 176, pitch: 'B1', duration: 8, velocity: 0.65 },
    { time: 184, pitch: 'F#2', duration: 8, velocity: 0.5 },

    { time: 192, pitch: 'G1', duration: 8, velocity: 0.65 },
    { time: 200, pitch: 'D2', duration: 8, velocity: 0.5 },
    { time: 208, pitch: 'A1', duration: 8, velocity: 0.65 },
    { time: 216, pitch: 'E2', duration: 8, velocity: 0.5 },
    { time: 224, pitch: 'B1', duration: 8, velocity: 0.65 },
    { time: 232, pitch: 'F#2', duration: 8, velocity: 0.5 },
    { time: 240, pitch: 'D2', duration: 16, velocity: 0.65 },
  ],
  arpeggios: [
    { time: 2, pitch: 'F#5', duration: 2, velocity: 0.35 },
    { time: 4, pitch: 'A5', duration: 2, velocity: 0.4 },
    { time: 6, pitch: 'C#6', duration: 3, velocity: 0.45 },
    { time: 10, pitch: 'A5', duration: 2, velocity: 0.35 },
    { time: 12, pitch: 'F#5', duration: 2, velocity: 0.3 },

    { time: 18, pitch: 'D5', duration: 2, velocity: 0.35 },
    { time: 20, pitch: 'F#5', duration: 2, velocity: 0.4 },
    { time: 22, pitch: 'B5', duration: 3, velocity: 0.45 },
    { time: 26, pitch: 'C#6', duration: 2, velocity: 0.4 },
    { time: 28, pitch: 'F#5', duration: 2, velocity: 0.3 },

    { time: 34, pitch: 'D5', duration: 2, velocity: 0.35 },
    { time: 36, pitch: 'G5', duration: 2, velocity: 0.4 },
    { time: 38, pitch: 'B5', duration: 3, velocity: 0.45 },
    { time: 42, pitch: 'D6', duration: 2, velocity: 0.4 },
    { time: 44, pitch: 'B5', duration: 2, velocity: 0.3 },

    { time: 50, pitch: 'E5', duration: 2, velocity: 0.35 },
    { time: 52, pitch: 'A5', duration: 2, velocity: 0.4 },
    { time: 54, pitch: 'D6', duration: 3, velocity: 0.45 },
    { time: 58, pitch: 'C#6', duration: 2, velocity: 0.4 },
    { time: 60, pitch: 'A5', duration: 2, velocity: 0.3 },

    { time: 66, pitch: 'C#5', duration: 2, velocity: 0.35 },
    { time: 68, pitch: 'E5', duration: 2, velocity: 0.4 },
    { time: 70, pitch: 'A5', duration: 3, velocity: 0.45 },
    { time: 74, pitch: 'C#6', duration: 2, velocity: 0.4 },

    { time: 82, pitch: 'D5', duration: 2, velocity: 0.35 },
    { time: 84, pitch: 'F#5', duration: 2, velocity: 0.4 },
    { time: 86, pitch: 'B5', duration: 3, velocity: 0.45 },
    { time: 90, pitch: 'A5', duration: 2, velocity: 0.35 },

    { time: 98, pitch: 'B4', duration: 2, velocity: 0.35 },
    { time: 100, pitch: 'E5', duration: 2, velocity: 0.4 },
    { time: 102, pitch: 'G5', duration: 3, velocity: 0.45 },
    { time: 106, pitch: 'B5', duration: 2, velocity: 0.4 },

    { time: 114, pitch: 'C#5', duration: 2, velocity: 0.35 },
    { time: 116, pitch: 'E5', duration: 2, velocity: 0.4 },
    { time: 118, pitch: 'A5', duration: 3, velocity: 0.45 },
    { time: 122, pitch: 'G5', duration: 2, velocity: 0.35 },

    { time: 130, pitch: 'F#5', duration: 2, velocity: 0.4 },
    { time: 132, pitch: 'A5', duration: 2, velocity: 0.45 },
    { time: 134, pitch: 'D6', duration: 4, velocity: 0.5 },
    { time: 140, pitch: 'E6', duration: 3, velocity: 0.45 },

    { time: 146, pitch: 'C#5', duration: 2, velocity: 0.4 },
    { time: 148, pitch: 'E5', duration: 2, velocity: 0.45 },
    { time: 150, pitch: 'A5', duration: 4, velocity: 0.5 },

    { time: 162, pitch: 'D5', duration: 2, velocity: 0.4 },
    { time: 164, pitch: 'G5', duration: 2, velocity: 0.45 },
    { time: 166, pitch: 'B5', duration: 4, velocity: 0.5 },

    { time: 178, pitch: 'F#5', duration: 2, velocity: 0.4 },
    { time: 180, pitch: 'A5', duration: 2, velocity: 0.45 },
    { time: 182, pitch: 'D6', duration: 4, velocity: 0.5 },

    { time: 194, pitch: 'G5', duration: 2, velocity: 0.35 },
    { time: 196, pitch: 'B5', duration: 2, velocity: 0.4 },
    { time: 198, pitch: 'D6', duration: 3, velocity: 0.45 },

    { time: 210, pitch: 'A5', duration: 2, velocity: 0.35 },
    { time: 212, pitch: 'C#6', duration: 2, velocity: 0.4 },
    { time: 214, pitch: 'E6', duration: 3, velocity: 0.45 },

    { time: 226, pitch: 'F#5', duration: 2, velocity: 0.35 },
    { time: 228, pitch: 'B5', duration: 2, velocity: 0.4 },
    { time: 230, pitch: 'D6', duration: 4, velocity: 0.45 },

    { time: 242, pitch: 'F#5', duration: 4, velocity: 0.4 },
    { time: 246, pitch: 'A5', duration: 4, velocity: 0.35 },
    { time: 250, pitch: 'D6', duration: 6, velocity: 0.4 },
  ],
  melody: [
    { time: 4, pitch: 'A4', duration: 4, velocity: 0.6 },
    { time: 8, pitch: 'F#4', duration: 4, velocity: 0.55 },
    { time: 12, pitch: 'E4', duration: 4, velocity: 0.5 },
    { time: 16, pitch: 'F#4', duration: 8, velocity: 0.65 },
    { time: 24, pitch: 'D4', duration: 6, velocity: 0.55 },

    { time: 32, pitch: 'B3', duration: 4, velocity: 0.55 },
    { time: 36, pitch: 'D4', duration: 4, velocity: 0.6 },
    { time: 40, pitch: 'F#4', duration: 6, velocity: 0.65 },
    { time: 48, pitch: 'E4', duration: 12, velocity: 0.6 },

    { time: 64, pitch: 'C#4', duration: 4, velocity: 0.55 },
    { time: 68, pitch: 'E4', duration: 4, velocity: 0.6 },
    { time: 72, pitch: 'A4', duration: 6, velocity: 0.65 },
    { time: 80, pitch: 'F#4', duration: 10, velocity: 0.6 },

    { time: 96, pitch: 'G4', duration: 4, velocity: 0.55 },
    { time: 100, pitch: 'F#4', duration: 4, velocity: 0.5 },
    { time: 104, pitch: 'E4', duration: 4, velocity: 0.55 },
    { time: 108, pitch: 'D4', duration: 4, velocity: 0.5 },
    { time: 112, pitch: 'E4', duration: 12, velocity: 0.65 },

    { time: 132, pitch: 'A4', duration: 4, velocity: 0.65 },
    { time: 136, pitch: 'D5', duration: 6, velocity: 0.7 },
    { time: 144, pitch: 'C#5', duration: 6, velocity: 0.65 },
    { time: 152, pitch: 'B4', duration: 6, velocity: 0.6 },

    { time: 160, pitch: 'D5', duration: 4, velocity: 0.65 },
    { time: 164, pitch: 'F#5', duration: 6, velocity: 0.75 },
    { time: 172, pitch: 'E5', duration: 6, velocity: 0.7 },
    { time: 180, pitch: 'D5', duration: 10, velocity: 0.65 },

    { time: 192, pitch: 'B4', duration: 4, velocity: 0.6 },
    { time: 196, pitch: 'D5', duration: 4, velocity: 0.65 },
    { time: 200, pitch: 'E5', duration: 6, velocity: 0.7 },
    { time: 208, pitch: 'C#5', duration: 6, velocity: 0.65 },
    { time: 216, pitch: 'A4', duration: 6, velocity: 0.6 },

    { time: 224, pitch: 'B4', duration: 8, velocity: 0.65 },
    { time: 232, pitch: 'C#5', duration: 6, velocity: 0.6 },
    { time: 240, pitch: 'D5', duration: 14, velocity: 0.7 },
  ],
};

// -----------------------------------------------------------------------------------------
// TRACK 2: 《星阵破晓 · 英雄交响》 (Astral Dawn - Heroic Anthem) - 战斗专属曲
// -----------------------------------------------------------------------------------------

// Orchestral Heroic Percussion Generator:
// Timpani on beats 1 & 3, Noble marching snare with rolls on beats 2 & 4, Grand cymbal crashes
function createHeroicDrumBar(barIndex: number): DrumStep[] {
  const steps: DrumStep[] = Array.from({ length: 16 }, () => ({}));

  // Crash on pivotal heroic bars
  if (barIndex === 0 || barIndex === 8 || barIndex === 14) {
    steps[0].crash = true;
  }

  for (let s = 0; s < 16; s++) {
    // Stately hi-hat / cymbal ride on every 8th note
    if (s % 2 === 0) {
      steps[s].hihat = true;
    }

    // Timpani deep impact on beat 1 (step 0) and beat 3 (step 8)
    if (s === 0 || s === 8) {
      steps[s].kick = true;
    }

    // Secondary rhythmic pulse on step 10
    if (s === 10 && barIndex >= 4) {
      steps[s].kick = true;
    }

    // Noble Field Snare on beat 2 (step 4) and beat 4 (step 12)
    if (s === 4 || s === 12) {
      steps[s].snare = true;
    }

    // Snare roll and flourishes before phrase endings (Bar 7 and Bar 15)
    if ((barIndex === 7 || barIndex === 13) && (s === 10 || s === 14 || s === 15)) {
      steps[s].snare = true;
    }

    // Open Hat accents on dramatic upbeats
    if (barIndex >= 8 && (s === 6 || s === 14)) {
      steps[s].openHat = true;
    }
  }

  return steps;
}

const heroicDrums: Array<{ bar: number; pattern: DrumStep[] }> = [];
for (let b = 0; b < 16; b++) {
  heroicDrums.push({ bar: b, pattern: createHeroicDrumBar(b) });
}

// Noble Orchestral Contrabass & Cello March:
// Firm, grounded roots with stately momentum
// Progression: Dm -> Bb -> C -> F -> Gm -> Dm -> Asus4 -> A
//             Bb -> C  -> Dm -> Am -> Gm7 -> Bb -> C -> D (Major resolution)
const heroicBassRoots = [
  'D2', 'Bb1', 'C2', 'F1', // Bars 0-3 (The Call)
  'G1', 'D2', 'A1', 'A1',  // Bars 4-7 (Courage & Tension)
  'Bb1', 'C2', 'D2', 'A1', // Bars 8-11 (The Charge)
  'G1', 'Bb1', 'C2', 'D2', // Bars 12-15 (Triumphant Major Cadence)
];

const heroicBassline: NoteEvent[] = [];
for (let bar = 0; bar < 16; bar++) {
  const root = heroicBassRoots[bar];
  const barStart = bar * 16;

  // Beat 1 (Step 0) - Grand sustained root
  heroicBassline.push({
    time: barStart + 0,
    pitch: root,
    duration: 3.5,
    velocity: 0.85,
  });

  // Beat 2 upbeat (Step 6) - Driving fifth or octave
  heroicBassline.push({
    time: barStart + 6,
    pitch: noteToFreq(root) * 1.5,
    duration: 1.8,
    velocity: 0.65,
  });

  // Beat 3 (Step 8) - Firm middle pulse
  heroicBassline.push({
    time: barStart + 8,
    pitch: root,
    duration: 3.5,
    velocity: 0.8,
  });

  // Beat 4 upbeat (Step 14) - Moving bass leading to next bar
  heroicBassline.push({
    time: barStart + 14,
    pitch: noteToFreq(root) * 1.5,
    duration: 1.8,
    velocity: 0.7,
  });
}

// Orchestral Strings & French Horn Harmony Pad:
// Rich, warm, majestic orchestral chord voicings
const heroicPads = [
  { bar: 0, notes: ['D3', 'F3', 'A3', 'D4'], durationBars: 1 },  // Dm
  { bar: 1, notes: ['Bb2', 'D3', 'F3', 'Bb3'], durationBars: 1 },// Bb
  { bar: 2, notes: ['C3', 'E3', 'G3', 'C4'], durationBars: 1 },  // C
  { bar: 3, notes: ['F2', 'A2', 'C3', 'F3'], durationBars: 1 },  // F

  { bar: 4, notes: ['G2', 'Bb2', 'D3', 'G3'], durationBars: 1 }, // Gm
  { bar: 5, notes: ['D2', 'F3', 'A3', 'D4'], durationBars: 1 },  // Dm
  { bar: 6, notes: ['A2', 'D3', 'E3', 'A3'], durationBars: 1 },  // Asus4
  { bar: 7, notes: ['A2', 'C#3', 'E3', 'A3'], durationBars: 1 }, // A Major (Tension)

  { bar: 8, notes: ['Bb2', 'D3', 'F3', 'D4'], durationBars: 1 }, // Bb (Charge)
  { bar: 9, notes: ['C3', 'E3', 'G3', 'E4'], durationBars: 1 },  // C
  { bar: 10, notes: ['D3', 'F3', 'A3', 'F4'], durationBars: 1 }, // Dm (Apex)
  { bar: 11, notes: ['A2', 'C3', 'E3', 'A3'], durationBars: 1 }, // Am

  { bar: 12, notes: ['G2', 'Bb2', 'D3', 'F3'], durationBars: 1 },// Gm7
  { bar: 13, notes: ['Bb2', 'D3', 'F3', 'Bb3'], durationBars: 1 },// Bb
  { bar: 14, notes: ['C3', 'E3', 'G3', 'C4'], durationBars: 1 }, // C
  { bar: 15, notes: ['D3', 'F#3', 'A3', 'D4'], durationBars: 1 },// D Major (Glorious Cadence!)
];

// Starlight Chimes & Orchestral Harp Flourishes:
// Tasteful, sparkling accents marking phrase leaps (no grating 16th-note buzz)
const heroicArpeggios: NoteEvent[] = [
  // Phrase 1 Turnaround
  { time: 12, pitch: 'A5', duration: 2, velocity: 0.4 },
  { time: 14, pitch: 'D6', duration: 3, velocity: 0.5 },

  { time: 28, pitch: 'F5', duration: 2, velocity: 0.4 },
  { time: 30, pitch: 'A5', duration: 3, velocity: 0.45 },

  { time: 44, pitch: 'G5', duration: 2, velocity: 0.4 },
  { time: 46, pitch: 'C6', duration: 3, velocity: 0.5 },

  // Tension before Charge
  { time: 108, pitch: 'A5', duration: 2, velocity: 0.45 },
  { time: 110, pitch: 'E6', duration: 3, velocity: 0.5 },
  { time: 124, pitch: 'C#6', duration: 4, velocity: 0.55 },

  // Glorious Apex
  { time: 172, pitch: 'F6', duration: 3, velocity: 0.55 },
  { time: 174, pitch: 'D6', duration: 3, velocity: 0.5 },

  // Final Major Cadence Bell
  { time: 240, pitch: 'F#5', duration: 4, velocity: 0.5 },
  { time: 244, pitch: 'A5', duration: 4, velocity: 0.55 },
  { time: 248, pitch: 'D6', duration: 8, velocity: 0.6 },
];

// Soaring Heroic Fanfare & Anthem Melody (Noble French Horn & Trumpet):
// Inspired by epic JRPG and cinematic heroic themes (clean, noble, unforgettable)
const heroicMelody: NoteEvent[] = [
  // --- Section 1: The Hero's Call (Bars 0-3) ---
  // Bar 0: D4 -> F4 -> A4 (Rising triad fanfare)
  { time: 0, pitch: 'D4', duration: 4, velocity: 0.8 },
  { time: 4, pitch: 'F4', duration: 4, velocity: 0.85 },
  { time: 8, pitch: 'A4', duration: 8, velocity: 0.9 },

  // Bar 1: Bb4 -> A4 -> G4 -> F4 (Noble cascade)
  { time: 16, pitch: 'Bb4', duration: 6, velocity: 0.9 },
  { time: 22, pitch: 'A4', duration: 2, velocity: 0.8 },
  { time: 24, pitch: 'G4', duration: 4, velocity: 0.85 },
  { time: 28, pitch: 'F4', duration: 4, velocity: 0.8 },

  // Bar 2: G4 -> A4 -> C5 (Soaring upward)
  { time: 32, pitch: 'G4', duration: 4, velocity: 0.85 },
  { time: 36, pitch: 'A4', duration: 4, velocity: 0.85 },
  { time: 40, pitch: 'C5', duration: 8, velocity: 0.95 },

  // Bar 3: A4 -> F4 (Resolute breath)
  { time: 48, pitch: 'A4', duration: 10, velocity: 0.9 },
  { time: 58, pitch: 'F4', duration: 4, velocity: 0.75 },

  // --- Section 2: Courage in Adversity (Bars 4-7) ---
  // Bar 4: G4 -> Bb4 -> D5 (Piercing the veil)
  { time: 64, pitch: 'G4', duration: 4, velocity: 0.85 },
  { time: 68, pitch: 'Bb4', duration: 4, velocity: 0.9 },
  { time: 72, pitch: 'D5', duration: 8, velocity: 0.95 },

  // Bar 5: C5 -> Bb4 -> A4 (Steadfast shield)
  { time: 80, pitch: 'C5', duration: 4, velocity: 0.9 },
  { time: 84, pitch: 'Bb4', duration: 4, velocity: 0.85 },
  { time: 88, pitch: 'A4', duration: 8, velocity: 0.9 },

  // Bar 6: G4 -> F4 -> E4 -> F4 (Gathering destiny)
  { time: 96, pitch: 'G4', duration: 4, velocity: 0.85 },
  { time: 100, pitch: 'F4', duration: 4, velocity: 0.85 },
  { time: 104, pitch: 'E4', duration: 6, velocity: 0.85 },
  { time: 110, pitch: 'F4', duration: 2, velocity: 0.8 },

  // Bar 7: E4 -> C#4 (Dramatic tension before charge)
  { time: 112, pitch: 'E4', duration: 10, velocity: 0.9 },
  { time: 122, pitch: 'C#4', duration: 4, velocity: 0.8 },

  // --- Section 3: The Triumphant Charge (Bars 8-11) ---
  // Bar 8: F4 -> G4 -> A4 (The charge begins!)
  { time: 128, pitch: 'F4', duration: 4, velocity: 0.9 },
  { time: 132, pitch: 'G4', duration: 4, velocity: 0.9 },
  { time: 136, pitch: 'A4', duration: 8, velocity: 0.95 },

  // Bar 9: G4 -> A4 -> C5 (Ascending momentum)
  { time: 144, pitch: 'G4', duration: 4, velocity: 0.9 },
  { time: 148, pitch: 'A4', duration: 4, velocity: 0.95 },
  { time: 152, pitch: 'C5', duration: 8, velocity: 1.0 },

  // Bar 10: D5 -> E5 -> F5 (Apex of the Anthem!)
  { time: 160, pitch: 'D5', duration: 8, velocity: 1.0 },
  { time: 168, pitch: 'E5', duration: 4, velocity: 1.0 },
  { time: 172, pitch: 'F5', duration: 4, velocity: 1.0 },

  // Bar 11: E5 -> C5 (Noble majesty)
  { time: 176, pitch: 'E5', duration: 8, velocity: 0.95 },
  { time: 184, pitch: 'C5', duration: 8, velocity: 0.9 },

  // --- Section 4: Glory & Dawn (Bars 12-15) ---
  // Bar 12: D5 -> C5 -> Bb4 -> A4
  { time: 192, pitch: 'D5', duration: 6, velocity: 0.95 },
  { time: 198, pitch: 'C5', duration: 2, velocity: 0.85 },
  { time: 200, pitch: 'Bb4', duration: 4, velocity: 0.9 },
  { time: 204, pitch: 'A4', duration: 4, velocity: 0.85 },

  // Bar 13: Bb4 -> C5 -> D5 (Final ascent)
  { time: 208, pitch: 'Bb4', duration: 4, velocity: 0.9 },
  { time: 212, pitch: 'C5', duration: 4, velocity: 0.95 },
  { time: 216, pitch: 'D5', duration: 8, velocity: 1.0 },

  // Bar 14: E5 -> F#5 (Bright Golden Triumph!)
  { time: 224, pitch: 'E5', duration: 8, velocity: 1.0 },
  { time: 232, pitch: 'F#5', duration: 8, velocity: 1.0 },

  // Bar 15: D5 (Held triumphant resolution)
  { time: 240, pitch: 'D5', duration: 16, velocity: 1.0 },
];

export const BATTLE_TRACK: MusicTrackConfig = {
  id: 'battle',
  title: '星阵破晓 · 英雄交响',
  subtitle: '星契纪元 · 战斗专属英雄曲',
  bpm: 120,
  stepsPerBar: 16,
  totalBars: 16,
  pads: heroicPads,
  bassline: heroicBassline,
  arpeggios: heroicArpeggios,
  melody: heroicMelody,
  drums: heroicDrums,
};

export const TRACK_REGISTRY: Record<TrackId, MusicTrackConfig> = {
  home: HOME_TRACK,
  battle: BATTLE_TRACK,
};
