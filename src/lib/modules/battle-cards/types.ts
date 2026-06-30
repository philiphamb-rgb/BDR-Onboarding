// ─────────────────────────────────────────────────────
// Battle Cards — Learning Center Module
// Type definitions for the competitive intelligence data.
// ─────────────────────────────────────────────────────

export type ThreatLevel = 'high' | 'med' | 'low';

/** A single card inside a competitor profile, a Market Overview
 *  segment, or a Commission Comparison entry. */
export interface BattleCardBlock {
  /** Category label shown as the card's small top-left tag, e.g. "OVERVIEW", "TALK TRACK". */
  type: string;
  /** One or two word subtitle under the type label. */
  sub: string;
  /** Hex color for the card's left accent strip. */
  pill: string;
  /** Short badge text shown next to the card title, e.g. "Edge", "Genuine Gap". */
  tag: string;
  tagBg: string;
  tagColor: string;
  /** The card's headline. */
  title: string;
  /** Always-visible 1–2 sentence summary. */
  summary: string;
  /** Full detail, revealed by the "Read more" toggle. May contain
   *  inline HTML: <span class="hl">…</span> for highlighted phrases. */
  body: string;
  /** Optional outbound link to the competitor's own site, shown
   *  inline at the end of the summary. Used on a small number of
   *  cards (mainly the Commission Comparison's per-company cards). */
  link?: string;
  linkLabel?: string;
}

export interface Competitor {
  name: string;
  threat: ThreatLevel;
  /** Pill text shown in the banner, e.g. "HIGH THREAT", "DIFFERENT CATEGORY". */
  pill: string;
  /** One-line summary shown in the banner under the competitor name. */
  sub: string;
  /** Official site, shown as a "Visit site" link in the banner. */
  link: string;
  linkLabel: string;
  blocks: BattleCardBlock[];
}

export type CompetitorKey =
  | 'ck' | 'mf' | 'ex' | 'll' | 'idf' | 'cs' | 'mfsn' | 'idiq' | 'array';

export type CompetitorsMap = Record<CompetitorKey, Competitor>;

/** Market Overview and Commission Comparison share this shape —
 *  they're "special views" with no single competitor or threat level. */
export interface SpecialView {
  name: string;
  threat: 'map';
  pill: string;
  sub: string;
  blocks: BattleCardBlock[];
}

// ─── Training program ────────────────────────────────

export interface TrainingPanel {
  /** e.g. "THE FACTS", "WHAT THEIR CUSTOMER EXPERIENCES". */
  label: string;
  content: string;
}

export interface TrainingQuiz {
  q: string;
  /** Exactly 4 answer choices. */
  options: [string, string, string, string];
  /** Index (0–3) of the correct option. */
  correct: number;
  /** Shown after answering, right or wrong. */
  explain: string;
}

export interface TrainingWelcomeStep {
  type: 'welcome';
  title: string;
  body: string;
  stats: string;
  cta: string;
}

export interface TrainingLessonStep {
  type: 'lesson';
  /** Matches a CompetitorKey for the 9 competitor lessons, or
   *  'market' / 'commission' for the two framework lessons. */
  key: CompetitorKey | 'market' | 'commission';
  kicker: string;
  title: string;
  threat?: ThreatLevel;
  /** One-line memorable tagline, e.g. "Free to look. Powerless to fix." */
  hook: string;
  /** Always exactly 4 — revealed one at a time during the lesson. */
  panels: [TrainingPanel, TrainingPanel, TrainingPanel, TrainingPanel];
  quiz: TrainingQuiz;
}

export interface TrainingGraduationStep {
  type: 'graduation';
  title: string;
  body: string;
  cta: string;
}

export type TrainingStep =
  | TrainingWelcomeStep
  | TrainingLessonStep
  | TrainingGraduationStep;

/** Maps a card's `type` field to the section label it should be
 *  grouped under when rendered (e.g. all "YOUR WIN" and "FAIR
 *  TRADE-OFF" cards appear under a "Where You Win" divider). */
export type GroupMap = Record<string, string>;
