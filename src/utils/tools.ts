// Tool calculations for the Period Tracker "Tools" section
// (cycle calculator, due date & conception, ovulation, BBT, PMS guide)

import { differenceInDays, addDays, format } from 'date-fns';

// ---------- helpers ----------

export function toKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

const TRIMESTER_WEEKS: [number, number][] = [
  [1, 13],
  [14, 27],
  [28, 42],
];

export function trimesterForWeek(pw: number): { num: number; label: string } | null {
  if (pw < 1 || pw > 42) return null;
  const idx = TRIMESTER_WEEKS.findIndex(([a, b]) => pw >= a && pw <= b);
  const names = ['First trimester', 'Second trimester', 'Third trimester'];
  return { num: idx + 1, label: names[idx] };
}

/** Common pregnancy milestones keyed by completed week of pregnancy. */
export const WEEK_MILESTONES: Record<number, string> = {
  4: 'Implantation happens — your pregnancy test may show positive.',
  5: 'The heart begins to form and early neural tube develops.',
  6: 'Heartbeat may be visible on an early ultrasound.',
  8: 'All major organs are formed; the baby is about the size of a grape.',
  12: 'End of the first trimester — miscarriage risk drops significantly.',
  16: 'You may start to feel quickening (first movements), especially in later pregnancies.',
  18: 'Anatomy scan window — providers check baby\'s development in detail.',
  20: 'Halfway there! Baby is about the size of a banana.',
  24: 'Viability milestone — lungs are maturing rapidly.',
  28: 'Start of the third trimester — baby opens and closes their eyes.',
  32: 'Baby is gaining weight quickly; bones are fully formed.',
  36: 'Baby is considered "early term" — regular check-ups begin weekly.',
  39: 'Full term — baby\'s organs are ready for life outside the womb.',
  40: 'Estimated due date around now.',
};

// ---------- Cycle Length Calculator ----------

export interface CycleCalcResult {
  averageLength: number;
  shortest: number;
  longest: number;
  variability: number;
  regularity: 'regular' | 'moderate' | 'irregular';
  regularityNote: string;
  nextPeriodDate: string; // key
  fertileStart: string;
  fertileEnd: string;
  ovulationDate: string;
  cycleDayToday: number | null;
  validStarts: string[]; // keys used
  ignoredCount: number; // starts dropped (gaps too short/long)
}

export function calculateCycleFromStarts(startKeys: string[]): CycleCalcResult | null {
  const sorted = [...startKeys].filter(Boolean).sort();
  if (sorted.length < 2) return null;

  // Build cycle lengths between consecutive starts; ignore impossible gaps.
  const lengths: number[] = [];
  const validStarts: string[] = [sorted[0]];
  let ignored = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = differenceInDays(fromKey(sorted[i]), fromKey(validStarts[validStarts.length - 1]));
    if (gap >= 15 && gap <= 60) {
      lengths.push(gap);
      validStarts.push(sorted[i]);
    } else {
      ignored++;
    }
  }
  if (lengths.length === 0) return null;

  const recent = lengths.slice(-6);
  const average = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
  const shortest = Math.min(...lengths);
  const longest = Math.max(...lengths);
  const variability = longest - shortest;

  let regularity: CycleCalcResult['regularity'];
  let regularityNote: string;
  if (variability <= 7) {
    regularity = 'regular';
    regularityNote = 'Your cycles are quite regular — predictions will be reliable.';
  } else if (variability <= 14) {
    regularity = 'moderate';
    regularityNote = 'Your cycles vary a little. Predictions are decent but keep logging.';
  } else {
    regularity = 'irregular';
    regularityNote = 'Your cycles vary a lot. Log more periods to improve accuracy, and consider consulting a doctor if cycles are consistently under 21 or over 35 days.';
  }

  const lastStart = fromKey(validStarts[validStarts.length - 1]);
  const today = fromKey(toKey(new Date()));
  const elapsed = differenceInDays(today, lastStart);
  const cycleDayToday = elapsed >= 0 ? (elapsed % average) + 1 : null;

  const nextStart = addDays(lastStart, average);
  const ovDay = addDays(nextStart, -14);
  const fertStart = addDays(ovDay, -5);
  const fertEnd = addDays(ovDay, 1);

  return {
    averageLength: average,
    shortest,
    longest,
    variability,
    regularity,
    regularityNote,
    nextPeriodDate: toKey(nextStart),
    fertileStart: toKey(fertStart),
    fertileEnd: toKey(fertEnd),
    ovulationDate: toKey(ovDay),
    cycleDayToday,
    validStarts,
    ignoredCount: ignored,
  };
}

// ---------- Pregnancy Due Date Calculator ----------

export type DueDateMethod = 'lmp' | 'conception' | 'ivf-transfer';

export interface DueDateResult {
  method: DueDateMethod;
  referenceLabel: string;   // e.g. "Last period started"
  referenceDate: string;    // key
  dueDate: string;          // key
  conceptionEstimate: string | null;
  currentGestationalAge: { weeks: number; days: number };
  trimester: { num: number; label: string } | null;
  trimesterRange: string;   // e.g. "Weeks 14–27"
  nextMilestone: { week: number; text: string } | null;
  progressPercent: number;  // 0-100 through 40 weeks
  note: string;
}

export function calculateDueDate(method: DueDateMethod, dateKey: string, ivfDay?: number): DueDateResult | null {
  if (!dateKey) return null;
  const d = fromKey(dateKey);
  const today = fromKey(toKey(new Date()));

  let dueDate: Date;
  let conceptionEstimate: Date | null = null;
  let gestDaysAtRef: number; // days already elapsed at the reference date
  let referenceLabel: string;
  let note = '';

  if (method === 'lmp') {
    dueDate = addDays(d, 280);
    conceptionEstimate = addDays(d, 14);
    gestDaysAtRef = 0;
    referenceLabel = 'First day of last menstrual period';
    note = 'LMP method assumes a 28-day cycle with ovulation on day 14. If your cycles are longer or shorter, tell your provider — they may adjust your due date with an early ultrasound.';
  } else if (method === 'conception') {
    dueDate = addDays(d, 266);
    conceptionEstimate = d;
    gestDaysAtRef = 14; // conception ≈ 2 weeks pregnant
    referenceLabel = 'Date of conception / intercourse';
    note = 'Pregnancy is dated from your last period, so at conception you are already about 2 weeks "pregnant" in medical terms.';
  } else {
    // IVF/transfer: gestational age at transfer = 14 days + egg retrieval day offset
    const day = ivfDay ?? 5;
    dueDate = addDays(d, 266 - day);
    conceptionEstimate = addDays(d, -day);
    gestDaysAtRef = 14 + day;
    referenceLabel = `Embryo transfer date (day-${day} ${day === 3 ? 'cleavage' : 'blastocyst'})`;
    note = 'For frozen transfers use the transfer date directly; for fresh retrievals providers often count from the retrieval date. This tool uses the transfer date plus the embryo age you select.';
  }

  const daysSinceRef = differenceInDays(today, d);
  const gestDays = Math.max(0, daysSinceRef + gestDaysAtRef);
  const weeks = Math.floor(gestDays / 7);
  const days = gestDays % 7;
  const tri = trimesterForWeek(Math.min(weeks, 42));
  const tRange = tri ? `Weeks ${TRIMESTER_WEEKS[tri.num - 1][0]}–${TRIMESTER_WEEKS[tri.num - 1][1]}` : '';

  let nextMilestone: DueDateResult['nextMilestone'] = null;
  for (const wk of Object.keys(WEEK_MILESTONES).map(Number).sort((a, b) => a - b)) {
    if (wk > weeks) {
      nextMilestone = { week: wk, text: WEEK_MILESTONES[wk] };
      break;
    }
  }

  return {
    method,
    referenceLabel,
    referenceDate: dateKey,
    dueDate: toKey(dueDate),
    conceptionEstimate: conceptionEstimate ? toKey(conceptionEstimate) : null,
    currentGestationalAge: { weeks, days },
    trimester: tri,
    trimesterRange: tRange,
    nextMilestone,
    progressPercent: Math.min(100, Math.round((gestDays / 280) * 100)),
    note,
  };
}

// ---------- Ovulation Calculator ----------

export interface OvulationResult {
  ovulationDate: string;
  fertileStart: string;
  fertileEnd: string;
  peakDays: string[]; // most fertile: 2 days before + day of ovulation
  nextPeriodDate: string;
  daysUntilOvulation: number;
  withinFertileNow: boolean;
}

export function calculateOvulation(periodStartKey: string, cycleLength: number): OvulationResult | null {
  if (!periodStartKey) return null;
  const clamped = Math.max(21, Math.min(45, cycleLength || 28));
  const start = fromKey(periodStartKey);
  const ovulation = addDays(start, clamped - 14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const today = fromKey(toKey(new Date()));

  return {
    ovulationDate: toKey(ovulation),
    fertileStart: toKey(fertileStart),
    fertileEnd: toKey(fertileEnd),
    peakDays: [toKey(addDays(ovulation, -2)), toKey(addDays(ovulation, -1)), toKey(ovulation)],
    nextPeriodDate: toKey(addDays(start, clamped)),
    daysUntilOvulation: differenceInDays(ovulation, today),
    withinFertileNow: today >= fertileStart && today <= fertileEnd,
  };
}

// ---------- BBT Fertility Checker ----------

export interface BbtReading {
  date: string; // key
  temp: number; // °F or °C depending on unit
}

export interface BbtAnalysis {
  unit: 'F' | 'C';
  readings: BbtAnalysis_['readings'];
  coveredDays: number;
  possibleOvulation: string | null; // date of first day of sustained rise
  coverline: number | null;
  currentlyElevated: boolean | null;
  interpretation: string;
  tips: string[];
}

type BbtAnalysis_ = { readings: BbtReading[] };


export function analyzeBbt(readings: BbtReading[], unit: 'F' | 'C'): BbtAnalysis | null {
  const clean = readings
    .filter((r) => r.date && !isNaN(r.temp))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (clean.length < 3) return null;

  const temps = clean.map((r) => r.temp);
  const min = Math.min(...temps);

  // Coverline: lowest temp of the follicular phase + 0.1° (standard BBT rule)
  const coverline = +(min + 0.1).toFixed(2);

  // Find sustained shift: 3 consecutive temps above coverline after lower temps
  let shiftIdx = -1;
  for (let i = 1; i < clean.length - 2; i++) {
    const beforeLow = temps.slice(0, i).some((t) => t <= coverline);
    const afterHigh = temps[i] > coverline && temps[i + 1] > coverline && temps[i + 2] > coverline;
    if (beforeLow && afterHigh) {
      shiftIdx = i;
      break;
    }
  }

  const possibleOvulation = shiftIdx >= 0 ? clean[Math.max(0, shiftIdx - 1)].date : null;
  const lastAbove = temps[temps.length - 1] > coverline;
  const elevatedRun = (() => {
    let n = 0;
    for (let i = temps.length - 1; i >= 0 && temps[i] > coverline; i--) n++;
    return n;
  })();

  let interpretation: string;
  if (possibleOvulation) {
    interpretation =
      `A sustained temperature shift appears around ${format(fromKey(possibleOvulation), 'd MMM')}. ` +
      `In BBT terms, ovulation likely happened the day before or during this rise. ` +
      `Temps staying elevated for 12–16 days after the shift can indicate progesterone from a corpus luteum — a sign a cycle was ovulatory. ` +
      (elevatedRun >= 16 ? `Your high-temperature run is now ${elevatedRun} days, which some people track as an early pregnancy indicator — take a test to confirm.` : '');
  } else {
    interpretation =
      'No clear sustained biphasic shift detected yet. Keep taking your temperature at the same time every morning before getting out of bed — a pattern usually becomes visible after 2–3 weeks of data.';
  }

  return {
    unit,
    readings: clean,
    coveredDays: clean.length,
    possibleOvulation,
    coverline,
    currentlyElevated: lastAbove,
    interpretation,
    tips: [
      'Measure immediately upon waking, before sitting up or talking.',
      'Use a basal thermometer (0.01° resolution) and the same time daily (±30 min).',
      'Alcohol, illness, poor sleep or late nights can skew readings — note them.',
      'BBT confirms ovulation after it happened; combine with cervical mucus to predict it.',
    ],
  };
}

// ---------- PMS Symptoms Guide ----------

export interface PmsSymptomInfo {
  name: string;
  emoji: string;
  why: string;
  relief: string[];
  seeDoctor?: string;
}

export const PMS_SYMPTOMS: PmsSymptomInfo[] = [
  {
    name: 'Bloating',
    emoji: '🎈',
    why: 'Progesterone and estrogen fluctuations in the luteal phase cause your body to retain extra water and slow digestion.',
    relief: [
      'Reduce salty and highly processed foods in the week before your period',
      'Drink more water — it actually helps flush retained fluid',
      'Light cardio and walking to get digestion moving',
      'Potassium-rich foods (banana, coconut water, sweet potato)',
    ],
  },
  {
    name: 'Breast tenderness',
    emoji: '🌷',
    why: 'Hormonal swelling of milk glands peaks in the days before bleeding starts.',
    relief: [
      'Wear a supportive, non-underwire bra (sports bra works well)',
      'Warm showers or a cold pack, whichever feels better',
      'Evening primrose oil is popular, though evidence is mixed — ask your provider first',
      'Cut back on caffeine, which can worsen tenderness for some people',
    ],
    seeDoctor: 'A new lump, nipple discharge, or pain that persists after your period ends.',
  },
  {
    name: 'Mood swings & irritability',
    emoji: '🎭',
    why: 'Falling estrogen lowers serotonin activity; progesterone\'s metabolites affect GABA receptors, nudging mood and anxiety.',
    relief: [
      'Prioritise 7–9 hours of sleep — fatigue magnifies mood symptoms',
      'Regular exercise releases endorphins that buffer mood dips',
      'Complex carbs (oats, whole grains) support steady serotonin',
      'Plan demanding conversations earlier in your cycle if you can track patterns',
    ],
    seeDoctor: 'Feeling hopeless, severely anxious, or unable to function — this could be PMDD, which is very treatable.',
  },
  {
    name: 'Cramps (dysmenorrhea)',
    emoji: '⚡',
    why: 'Prostaglandins make the uterine muscle contract to shed its lining; higher levels mean stronger cramps.',
    relief: [
      'Heat pad or hot water bottle on the lower abdomen (as effective as mild painkillers for many)',
      'NSAIDs like ibuprofen work best taken at the first twinge, with food',
      'Gentle movement, yoga stretches (child\'s pose, cat-cow)',
      'Magnesium-rich foods or a warm Epsom-salt bath',
    ],
    seeDoctor: 'Pain that stops daily activities, worsens over years, or doesn\'t respond to OTC pain relief — could indicate endometriosis or fibroids.',
  },
  {
    name: 'Acne breakouts',
    emoji: '✨',
    why: 'Androgen activity relative to estrogen rises before your period, increasing sebum and clogging pores — classically along the jaw and chin.',
    relief: [
      'Keep a simple routine: gentle cleanser, non-comedogenic moisturiser, SPF',
      'Spot-treat with salicylic acid or benzoyl peroxide when breakouts start',
      'Change pillowcases frequently; avoid picking',
      'Note whether breakouts reliably appear in the luteal phase — tells you it\'s hormonal',
    ],
    seeDoctor: 'Painful cystic acne, or breakouts with irregular periods (possible PCOS).',
  },
  {
    name: 'Food cravings',
    emoji: '🍫',
    why: 'Metabolic rate rises slightly in the luteal phase, and dips in serotonin drive cravings for carbohydrate- and chocolate-rich comfort foods.',
    relief: [
      'Eat regular balanced meals — skipping meals intensifies cravings',
      'Choose dark chocolate (magnesium + satisfies the craving)',
      'Pair sweet treats with protein/fat to avoid blood-sugar roller coasters',
      'Keep healthy grab-and-go options visible',
    ],
  },
  {
    name: 'Fatigue',
    emoji: '🔋',
    why: 'Rising then falling progesterone has a sedating effect, and disrupted sleep in the luteal phase adds to tiredness.',
    relief: [
      'Go to bed 30–60 minutes earlier during your pre-period week if possible',
      'Front-load demanding tasks to the follicular phase (right after your period)',
      'Iron-rich foods if your period is heavy (and check ferritin if fatigue persists)',
      'Short daylight walks to stabilise energy and circadian rhythm',
    ],
    seeDoctor: 'Exhaustion that doesn\'t lift after your period — worth checking thyroid and iron levels.',
  },
  {
    name: 'Headaches',
    emoji: '🤕',
    why: 'The estrogen drop just before bleeding can trigger "menstrual migraines" or tension headaches in sensitive individuals.',
    relief: [
      'Stay hydrated — dehydration amplifies hormonal headaches',
      'Consistent sleep schedule across the cycle',
      'Take your usual pain relief at the very first sign rather than waiting',
      'Track whether headaches cluster around day −5 to +2 of your cycle',
    ],
    seeDoctor: 'Severe, sudden, or different-from-usual headaches, or headaches with visual aura before every period (discuss before using hormonal contraception).',
  },
];

export const PMS_GENERAL_TIPS = [
  'Track symptoms for 2–3 cycles — patterns help you prepare and help your clinician diagnose.',
  'Regular exercise reduces PMS severity comparable to some medications in studies.',
  'Calcium (1200 mg/day via diet or supplement) has good evidence for reducing mood and physical PMS symptoms.',
  'Vitamin B6 and magnesium may help some people — check doses with a pharmacist.',
  'CBT and stress-reduction techniques measurably improve PMS-related mood symptoms.',
  'If symptoms severely affect daily life for ≥2 cycles, ask about PMDD — effective treatments exist.',
];

// ---------- formatting ----------

export function fmtDate(key: string | null): string {
  if (!key) return '—';
  return format(fromKey(key), 'EEE, d MMM yyyy');
}

export function fmtDateShort(key: string | null): string {
  if (!key) return '—';
  return format(fromKey(key), 'd MMM');
}
