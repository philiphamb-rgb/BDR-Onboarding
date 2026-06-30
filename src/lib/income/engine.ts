/**
 * Income Calculator — calculation engine
 * Ported 1:1 from the standalone calculator's computePlan() / computeInsight().
 * This file is pure logic: no DOM, no React, no Supabase. It takes plan
 * inputs and weekly check-ins and returns numbers. Every UI layer (web,
 * mobile, AI Coach, automations) should call into this file rather than
 * re-implementing any of this math.
 *
 * One bug fix versus the original: the churn insight compared a decimal
 * (e.g. 0.05 for 5%) against the literal number 8, so it could never fire.
 * Fixed here to compare against 0.08, and the display text now multiplies
 * by 100 before printing the percentage.
 */

export type Path = "b2c" | "b2b2c";
export type BufferKey = "min" | "safe" | "stretch";

export const C = { WPM: 4.33, WD: 5, NET_FACTOR: 0.95 } as const;
export const BUFFERS: Record<BufferKey, number> = { min: 1.0, safe: 1.15, stretch: 1.3 };

export interface PlanInputs {
  target: number;
  base: number;
  path: Path;
  buffer: BufferKey;
  // B2C — all optional, each falls back to the calculator's original default
  b2cRate?: number; // $/mo per subscriber, default 14.39
  b2cChurn?: number; // % monthly churn, default 5
  bwWarmLeads?: number; // warm leads/week, default 5
  bwWarmRate?: number; // % of warm leads converting, default 30
  b2cSelfRate?: number; // % cold close rate, default 10
  // B2B2C
  bbComm?: number; // $ per partner account, default 750
  bbWarmLeads?: number; // default 2
  bbWarmRate?: number; // default 25
  bbSelfRate?: number; // default 15
}

export interface Milestone {
  m: number;
  label: string;
  incRaw: number;
  inc: string;
  hit: boolean;
  pct: number;
}

export interface MonthlyPoint {
  m: number;
  pace: number;
}

export interface FunnelStages {
  dials: number;
  connects: number;
  convos: number;
  demos: number;
  closes: number;
}

export interface Plan {
  path: Path;
  target: number;
  base: number;
  gap: number;
  buffer: number;
  // B2C-only fields (undefined when path === "b2b2c")
  rate?: number;
  netRate?: number;
  ch?: number; // decimal, e.g. 0.05 for 5%
  Nactive?: number;
  y2auto?: number;
  // B2B2C-only fields (undefined when path === "b2c")
  comm?: number;
  Pneed?: number;
  // shared
  wL: number;
  wR: number;
  sR: number;
  grossY1: number;
  warmMo: number;
  selfMo: number;
  coldWk: number;
  coldDay: number;
  warmDay: number;
  y1total: number;
  exitPace: number;
  evContact: number;
  oppsMonth: number;
  funnel: FunnelStages | null;
  totalWk: number;
  milestones: Milestone[];
  monthly: MonthlyPoint[];
  goalMonth: number | null;
}

/** One logged week from the tracker. c = contacts, x = closes, t = that week's target. */
export interface CheckIn {
  c: number;
  x: number;
  t: number;
}

export interface Insight {
  lbl: string;
  text: string;
}

export function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function fmtK(n: number): string {
  return n >= 1000 ? "$" + Math.round(n / 1000) + "k" : fmt(n);
}

function addsPerMonth(Na: number, c: number): number {
  if (c <= 0) return Na / 12;
  return (Na * c) / (1 - Math.pow(1 - c, 12));
}

export function funnelStages(d: number, cr: number): FunnelStages | null {
  if (d <= 0) return null;
  const r = Math.pow(Math.max(cr, 0.0001), 0.25);
  const con = d * r;
  const cv = con * r;
  const dm = cv * r;
  const cl = dm * r;
  return { dials: d, connects: con, convos: cv, demos: dm, closes: cl };
}

export function computePlan(inputs: PlanInputs): Plan {
  const target = Math.max(1, inputs.target || 200000);
  const base = Math.max(0, inputs.base || 0);
  const gap = Math.max(0, target - base);
  const buffer = BUFFERS[inputs.buffer] || 1;

  if (inputs.path === "b2c") {
    const rate = Math.max(0.01, inputs.b2cRate ?? 14.39);
    const netRate = parseFloat((rate * C.NET_FACTOR).toFixed(4));
    const ch = Math.max(0, Math.min(50, inputs.b2cChurn ?? 5)) / 100;
    const wL = Math.max(0, inputs.bwWarmLeads ?? 5);
    const wR = Math.max(0, Math.min(100, inputs.bwWarmRate ?? 30)) / 100;
    const sR = Math.max(0.0001, Math.min(1, (inputs.b2cSelfRate ?? 10) / 100));
    const aps = netRate * 12;
    const Na = Math.ceil(gap / aps);
    const a = addsPerMonth(Na, ch) * buffer;
    const warmMo = wL * wR * C.WPM;
    const selfMo = Math.max(0, a - warmMo);
    const coldWk = sR > 0 ? Math.ceil(selfMo / sR / C.WPM) : 0;
    const coldDay = coldWk > 0 ? Math.ceil(coldWk / C.WD) : 0;
    const warmDay = wL > 0 ? Math.round(wL / C.WD) : 0;

    let active = 0;
    let earned = 0;
    const sim: number[] = [];
    for (let m = 1; m <= 12; m++) {
      active = active * (1 - ch) + a;
      earned += active * netRate;
      sim.push(active);
    }

    const milestones: Milestone[] = [3, 6, 9, 12].map((M) => {
      const act = sim[M - 1];
      const pace = base + act * netRate * 12;
      return {
        m: M,
        label: Math.round(act).toLocaleString() + " active subs",
        incRaw: pace,
        inc: fmt(pace) + "/yr pace",
        hit: pace >= target,
        pct: Math.min(100, (pace / target) * 100),
      };
    });

    const monthly: MonthlyPoint[] = [];
    for (let mm = 1; mm <= 12; mm++) {
      monthly.push({ m: mm, pace: base + sim[mm - 1] * netRate * 12 });
    }
    let goalMonth: number | null = null;
    for (let bm = 0; bm < 12; bm++) {
      if (monthly[bm].pace >= target) {
        goalMonth = bm + 1;
        break;
      }
    }

    return {
      path: "b2c",
      target,
      base,
      gap,
      buffer,
      rate,
      netRate,
      ch,
      Nactive: Na,
      y2auto: base + Math.min(active, Na * 2) * netRate * 12,
      wL,
      wR,
      sR,
      grossY1: Math.round(a * 12),
      warmMo,
      selfMo,
      coldWk,
      coldDay,
      warmDay,
      y1total: base + earned,
      exitPace: base + active * netRate * 12,
      evContact: sR * aps,
      oppsMonth: selfMo > 0 ? Math.ceil(selfMo / sR) : 0,
      funnel: funnelStages(coldWk, sR),
      totalWk: coldWk + Math.round(wL),
      milestones,
      monthly,
      goalMonth,
    };
  }

  // ---- B2B2C ----
  const comm = Math.max(1, inputs.bbComm ?? 750);
  const wL2 = Math.max(0, inputs.bbWarmLeads ?? 2);
  const wR2 = Math.max(0, Math.min(100, inputs.bbWarmRate ?? 25)) / 100;
  const sR2 = Math.max(0.0001, Math.min(1, (inputs.bbSelfRate ?? 15) / 100));
  const Pn = Math.ceil(gap / comm);
  const a2 = (Pn / 12) * buffer;
  const warmMo2 = wL2 * wR2 * C.WPM;
  const selfMo2 = Math.max(0, a2 - warmMo2);
  const coldWk2 = sR2 > 0 ? Math.ceil(selfMo2 / sR2 / C.WPM) : 0;
  const coldDay2 = coldWk2 > 0 ? Math.ceil(coldWk2 / C.WD) : 0;
  const warmDay2 = wL2 > 0 ? Math.round(wL2 / C.WD) : 0;
  const closed = a2 * 12;

  const milestones: Milestone[] = [3, 6, 9, 12].map((M) => {
    const pr = a2 * M;
    const inc = base + pr * comm;
    return {
      m: M,
      label: Math.round(pr).toLocaleString() + " partners",
      incRaw: inc,
      inc: fmt(inc) + " earned",
      hit: inc >= target,
      pct: Math.min(100, (inc / target) * 100),
    };
  });

  const monthly: MonthlyPoint[] = [];
  for (let mm2 = 1; mm2 <= 12; mm2++) {
    monthly.push({ m: mm2, pace: base + a2 * mm2 * comm });
  }
  let goalMonth: number | null = null;
  for (let bm2 = 0; bm2 < 12; bm2++) {
    if (monthly[bm2].pace >= target) {
      goalMonth = bm2 + 1;
      break;
    }
  }

  return {
    path: "b2b2c",
    target,
    base,
    gap,
    buffer,
    comm,
    Pneed: Pn,
    wL: wL2,
    wR: wR2,
    sR: sR2,
    grossY1: Math.round(closed),
    warmMo: warmMo2,
    selfMo: selfMo2,
    coldWk: coldWk2,
    coldDay: coldDay2,
    warmDay: warmDay2,
    y1total: base + closed * comm,
    exitPace: base + closed * comm,
    evContact: sR2 * comm,
    oppsMonth: selfMo2 > 0 ? Math.ceil(selfMo2 / sR2) : 0,
    funnel: funnelStages(coldWk2, sR2),
    totalWk: coldWk2 + Math.round(wL2),
    milestones,
    monthly,
    goalMonth,
  };
}

/**
 * Priority-ordered insight engine. Returns the single most useful thing to
 * tell the BDR right now, given their plan and logged weeks. Same priority
 * order as the standalone calculator:
 *   1. Adjusted forecast (3+ weeks logged, meaningfully off target)
 *   2. Streak celebration (3+ consecutive on-pace weeks)
 *   3. Simple ahead/behind framing (any logged weeks)
 *   4. Efficient setup (warm leads alone cover the goal)
 *   5. Highest-leverage move (a close-rate bump saves meaningful contacts)
 *   6. Churn warning (B2C, churn >= 8%)
 *   7. On track (goal month known)
 *   8. Fallback (generic subscriber/partner count needed)
 */
export function computeInsight(plan: Plan, weeks: CheckIn[]): Insight | null {
  if (!plan) return null;
  const n = weeks.length;

  if (n >= 3) {
    let fc = 0;
    let fx = 0;
    for (let i = 0; i < n; i++) {
      fc += weeks[i].c || 0;
      fx += weeks[i].x || 0;
    }
    const avgWk = fc / n;
    const actualCR = fx > 0 && fc > 0 ? fx / fc : plan.sR;
    const weeksLeft = Math.max(0, 52 - n);
    const remClose = avgWk * weeksLeft * actualCR;
    const perClose = plan.path === "b2c" ? (plan.netRate ?? 0) * 12 : plan.comm ?? 0;
    const adjTotal = plan.base + (fx + remClose) * perClose;
    const delta = adjTotal - plan.target;

    if (delta >= plan.target * 0.05) {
      return {
        lbl: "Adjusted forecast",
        text: `Based on your actual pace — ${Math.round(avgWk)} contacts/week at ${(actualCR * 100).toFixed(1)}% close — you're projected to finish around ${fmt(Math.round(adjTotal))}, ${fmt(Math.round(delta))} above your ${fmt(plan.target)} target.`,
      };
    }
    if (delta <= -plan.target * 0.08) {
      return {
        lbl: "Adjusted forecast",
        text: `Based on your actual pace so far, you're tracking toward ${fmt(Math.round(adjTotal))} — ${fmt(Math.round(-delta))} short of your ${fmt(plan.target)} target. Raising your weekly contacts or close rate closes that gap.`,
      };
    }
  }

  let streakN = 0;
  for (let si = weeks.length - 1; si >= 0; si--) {
    if ((weeks[si].c || 0) >= (weeks[si].t || 0)) streakN++;
    else break;
  }
  if (streakN >= 3) {
    return {
      lbl: "On a streak",
      text: `You've hit pace ${streakN} weeks in a row. Consistency compounds — this is exactly the habit that turns a plan into a guarantee.`,
    };
  }

  if (n > 0) {
    const wt = plan.totalWk || plan.coldWk;
    let actual = 0;
    let expected = 0;
    for (let i = 0; i < n; i++) {
      actual += weeks[i].c || 0;
      expected += weeks[i].t || wt;
    }
    const deficit = expected - actual;
    if (deficit < -Math.max(2, wt * 0.1)) {
      return {
        lbl: "Ahead of pace",
        text: `You're ${(-deficit).toLocaleString()} contacts ahead across ${n} logged week${n > 1 ? "s" : ""}. At this rate you're tracking to beat your goal — keep the streak alive.`,
      };
    }
    if (deficit > Math.max(2, wt * 0.15)) {
      const perWk = Math.ceil(deficit / 4);
      return {
        lbl: "Catch-up plan",
        text: `You're ${deficit.toLocaleString()} contacts behind. Adding about ${perWk.toLocaleString()} extra/week for the next 4 weeks fully closes the gap.`,
      };
    }
  }

  if (plan.coldDay <= 0 && plan.warmDay > 0) {
    return {
      lbl: "Efficient setup",
      text: "Your warm leads alone cover your full goal pace — zero cold outreach required. Put your energy into fast follow-up instead.",
    };
  }

  const sR2 = Math.min(0.5, plan.sR + 0.05);
  const coldWk2 = sR2 > 0 ? Math.ceil(plan.selfMo / sR2 / C.WPM) : 0;
  const coldDay2 = coldWk2 > 0 ? Math.ceil(coldWk2 / C.WD) : 0;
  const saved = Math.max(0, plan.coldDay - coldDay2);
  if (saved >= 2) {
    return {
      lbl: "Highest-leverage move",
      text: `Raising your close rate just 5 points (to ${Math.round(sR2 * 100)}%) cuts your daily cold outreach from ${plan.coldDay} to ${coldDay2} — often easier than finding more leads.`,
    };
  }

  // Fixed vs. the original: ch is a decimal (0.05 = 5%), so the threshold
  // must be 0.08, not 8 — and the display multiplies by 100 to print right.
  if (plan.path === "b2c" && (plan.ch ?? 0) >= 0.08) {
    return {
      lbl: "Watch your churn",
      text: `At ${Math.round((plan.ch ?? 0) * 100)}% monthly churn, you need extra new subscribers every month just to stay even. Small retention wins compound fast here.`,
    };
  }

  if (plan.goalMonth) {
    return {
      lbl: "On track",
      text: `You're on pace to hit your full ${fmt(plan.target)} target around month ${plan.goalMonth}. Stay consistent with your daily numbers and you'll get there.`,
    };
  }

  return {
    lbl: "Keep building",
    text: `You need about ${
      plan.path === "b2c"
        ? (plan.Nactive ?? 0).toLocaleString() + " active subscribers"
        : (plan.Pneed ?? 0).toLocaleString() + " partner accounts"
    } to hit your goal pace. Consistent daily activity is what gets you there.`,
  };
}

/** Sum of logged contacts/closes and the simple ahead/behind delta. */
export function trackerSummary(plan: Plan, weeks: CheckIn[]) {
  const n = weeks.length;
  const wt = plan.totalWk || plan.coldWk;
  let actual = 0;
  let expected = 0;
  let totalCloses = 0;
  for (let i = 0; i < n; i++) {
    actual += weeks[i].c || 0;
    expected += weeks[i].t || wt;
    totalCloses += weeks[i].x || 0;
  }
  const deficit = expected - actual;
  const actualCloseRate = totalCloses > 0 && actual > 0 ? totalCloses / actual : null;
  const perClose = plan.path === "b2c" ? (plan.netRate ?? 0) * 12 : plan.comm ?? 0;
  const valueFromCloses = totalCloses * perClose;

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if ((weeks[i].c || 0) >= (weeks[i].t || 0)) streak++;
    else break;
  }

  return { n, wt, actual, expected, deficit, totalCloses, actualCloseRate, valueFromCloses, streak };
}
