// Shared option lists used across logging screens

export const FLOW_OPTIONS = ['Light', 'Medium', 'Heavy'] as const;
export type FlowValue = (typeof FLOW_OPTIONS)[number];

export const SYMPTOM_OPTIONS = [
  'Cramps',
  'Headache',
  'Fatigue',
  'Bloating',
  'Acne',
  'Tender breasts',
  'Back pain',
  'Nausea',
  'Dizziness',
  'Cravings',
  'Insomnia',
  'Joint pain',
];

export const MOOD_OPTIONS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😤', label: 'Irritable' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '🥱', label: 'Tired' },
  { emoji: '💪', label: 'Energetic' },
  { emoji: '🎭', label: 'Moody' },
];

export const INTENSITY_OPTIONS = ['Mild', 'Moderate', 'Severe'] as const;
export type IntensityValue = (typeof INTENSITY_OPTIONS)[number];

export const DISCHARGE_OPTIONS = [
  'Dry',
  'Creamy',
  'Watery',
  'Egg white',
  'Spotting',
] as const;
export type DischargeValue = (typeof DISCHARGE_OPTIONS)[number];

export const PAIN_SITES = ['Abdomen', 'Lower back', 'Head', 'Breasts', 'Legs / joints'] as const;
