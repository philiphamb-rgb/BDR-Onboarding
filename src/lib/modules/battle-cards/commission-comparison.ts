import type { SpecialView } from './types';

export const COMMISSION_COMPARISON: SpecialView = 
{
  name:"How Each Program Actually Pays You", threat:"map", pill:"4 PROGRAMS COMPARED",
  sub:"Same question every time: one-time bounty, or recurring income for as long as the client stays active? The answer changes everything about what a partnership is actually worth.",
  blocks:[
    { type:"THE COMPARISON", sub:"at a glance", pill:"#1B3480", tag:"Start Here", tagBg:"#DBEAFE", tagColor:"#1D4ED8",
      title:"One-time bounty vs. recurring income — this is the only question that matters",
      summary:"SmartCredit and IDIQ's Partner tier pay monthly, for as long as the client stays active. MFSN pays once.",
        body:"<span class='hl'>SmartCredit and IDIQ's Partner tier both pay recurring monthly commission for as long as the client stays active. MyFreeScoreNow pays once, per sale, and nothing more after that.</span> Array doesn't have an individual commission program at all — it licenses directly to financial institutions. Read each program below, then look at the math block at the end. The dollar amounts alone don't tell the story; how long the payments keep coming does." },
    { type:"SMARTCREDIT", sub:"the standard to beat", pill:"#22C55E", tag:"Recurring", tagBg:"#DCFCE7", tagColor:"#15803D",
      title:"Co-Brand PLUS+ — $5 to $15 per month, per active client, for as long as they stay enrolled",
      summary:"Published table: $5–$15 in monthly commission per active client, every month they stay enrolled.",
      link:"https://www.smartcredit.com", linkLabel:"smartcredit.com",
        body:"Published, documented commission table: <span class='hl'>$5/month on the $19.95 plan, $8/month on the $22.95 plan, $15/month on the $29.95 plan</span> — paid every single month a client remains active, not once. Tiered volume discounts kick in past 251 enrollments. Includes a hosted, co-branded website built under your logo, a named partner contact, and auto-nurture sequences designed specifically to keep clients active longer — because every month they stay, you get paid again." },
    { type:"MYFREESCORENOW", sub:"one-time bounty model", pill:"#F59E0B", tag:"One-Time Only", tagBg:"#FEF3C7", tagColor:"#92400E",
      title:"MFSN's affiliate program pays once — $50 per sale, then nothing else, ever",
      summary:"A flat $50 one-time payout, then nothing — regardless of how many years that client stays subscribed.",
      link:"https://www.myfreescorenow.com", linkLabel:"myfreescorenow.com",
        body:"MFSN's affiliate program (run through the CJ Affiliate network) pays a <span class='hl'>flat $50 per sale, one time, with a 30-day cookie window</span> — some top-tier publishers report up to $60. After that single payout, you earn nothing further no matter how many years that client stays subscribed at $29.95/month. To MFSN's credit, they launched a new Wells Fargo-backed payment platform in 2026 processing affiliate payouts up to 10x faster — a real, current improvement. But faster delivery of a one-time check doesn't change what the check is for. Worth noting: multiple consumer reviews describe payout disputes — accounts holding commissions for months, minimum thresholds quietly enforced, payouts withheld after the fact. Treat any specific complaint as one account, not gospel, but the pattern is worth knowing exists." },
    { type:"IDIQ", sub:"two different programs, often confused", pill:"#F59E0B", tag:"Mixed Model", tagBg:"#FEF3C7", tagColor:"#92400E",
      title:"IDIQ actually runs two separate programs — know which one a prospect means",
      summary:"A $100 one-time content-creator tier, and a separate recurring-residual Partner tier — know which one's being discussed.",
      link:"https://www.idiq.com/partnerships/affiliate-partners", linkLabel:"idiq.com/partnerships",
        body:"IDIQ's basic <span class='hl'>Affiliate Program</span> (built for content creators and bloggers) pays up to <span class='hl'>$100 per qualified enrollment, one time</span>, with a 60-day cookie and no minimum payout threshold — genuinely better terms than MFSN's basic affiliate tier. Separately, IDIQ's <span class='hl'>Partner Program</span> (built for credit professionals and businesses) pays real <span class='hl'>recurring monthly residual commission for every active member</span>, plus a 'Referral Partner' override that pays a percentage of other partners' monthly revenue if you recruit them. The exact residual rate isn't publicly published — it's negotiated per partner, unlike SmartCredit's openly documented table. Be precise with a prospect about which IDIQ program they're actually comparing you to." },
    { type:"ARRAY", sub:"not a comparable program", pill:"#6B7280", tag:"No Program", tagBg:"#F3F4F6", tagColor:"#374151",
      title:"Array has no individual affiliate or partner commission program — different business entirely",
      summary:"No referral link, no commission table — Array's revenue comes entirely from enterprise licensing fees.",
      link:"https://array.com", linkLabel:"array.com",
        body:"Array's revenue comes from <span class='hl'>per-user enterprise licensing fees paid directly by the bank or credit union</span> that embeds its tools — there's no referral link, no commission table, and no individual partner economics to compare. If a prospect raises Array in a commission conversation, that's a sign they've misunderstood what kind of company it is — gently redirect, don't try to build a comparison that doesn't exist." },
    { type:"THE MATH", sub:"do this calculation live with a prospect", pill:"#22C55E", tag:"Closing Argument", tagBg:"#DCFCE7", tagColor:"#15803D",
      title:"The arithmetic that wins this conversation every time",
      summary:"SmartCredit's $15/month beats MFSN's one-time $50 by month four — and keeps paying every month after.",
        body:"MFSN pays $50, once. SmartCredit's Co-Brand PLUS+ pays $5 to $15 every single month. <span class='hl'>At the $29.95 tier, SmartCredit's $15/month commission beats MFSN's one-time $50 by month four — and every month after that is pure additional income MFSN never pays at all.</span> A client who stays active just one year is worth $180 in commission through SmartCredit versus a flat $50 through MFSN — more than 3.5 times as much, from the exact same client. The longer a client stays enrolled, the wider that gap gets, every single month, forever. This is not a marketing claim — it's arithmetic on numbers both companies publish." },
    { type:"ASK THIS", sub:"qualifying question", pill:"#F59E0B", tag:"Plant", tagBg:"#FEF9C3", tagColor:"#92400E",
      title:"How long does your average client typically stay enrolled?",
      summary:"Multiply that number by $5–$15 — that's what SmartCredit pays versus MFSN's flat $50, once.",
        body:"\"Whatever that number is, multiply it by $5 to $15 — that's what SmartCredit pays you per client, total, versus a flat $50 one time from MFSN. <span class='hl'>If your average client stays even four months, SmartCredit has already paid you more — and keeps paying every month after that.</span>\" This question does the selling for you; let the prospect do the multiplication themselves." }
  ]
};
