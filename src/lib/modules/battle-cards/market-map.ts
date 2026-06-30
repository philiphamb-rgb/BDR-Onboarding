import type { SpecialView } from './types';

export const MARKET_MAP: SpecialView = 
{
  name:"Full Market Landscape", threat:"map", pill:"9 COMPETITORS · 5 SEGMENTS",
  sub:"The credit & identity space splits into five distinct buyer categories. Know which one you're in before you pitch — and know exactly where SmartCredit wins, and where it doesn't.",
  blocks:[
    { type:"SEGMENT 1", sub:"free mindshare", pill:"#EF4444", tag:"Consumer Free", tagBg:"#FEE2E2", tagColor:"#DC2626",
      title:"Free / Freemium Mindshare Giants — Credit Karma, Credit Sesame",
      summary:"Massive free user bases, zero score-improvement tools, no partner program — the easiest segment to win on substance.",
        body:"Massive free user bases (Credit Karma 100M+) built on ad-supported or banking-upsell revenue models. <span class='hl'>Neither has score-improvement tools, direct creditor communication, or an agency partner program.</span> Credit Karma is structurally missing Experian; Credit Sesame's free tier covers TransUnion only, and its Sesame Cash banking product has caused documented 2026 score damage. These are the names every prospect already knows — and, on substance rather than price, the easiest segment to win." },
    { type:"SEGMENT 2", sub:"bureau-backed", pill:"#F59E0B", tag:"Score Credibility", tagBg:"#FEF9C3", tagColor:"#92400E",
      title:"Bureau-Backed & Score-Credibility Plays — myFICO, Experian IdentityWorks",
      summary:"Real score credibility, but no improvement plan — and Experian is actively mid-transition right now.",
        body:"Lead with score legitimacy — an actual FICO® score, or data 'straight from the bureau.' <span class='hl'>Neither offers a personalized improvement plan, and Experian IdentityWorks is mid-transition</span> — no longer accepting new direct subscriptions as it folds into CreditWorks Premium. myFICO's top tier runs as high as $39.95/month with no annual discount. Be precise on price here: myFICO's range overlaps SmartCredit's, so the win is the active improvement engine, not a clean price gap." },
    { type:"SEGMENT 3", sub:"identity-first", pill:"#F59E0B", tag:"Insurance-Led", tagBg:"#FEF9C3", tagColor:"#92400E",
      title:"Identity-Theft-First Insurance Brands — LifeLock/Norton, IdentityForce",
      summary:"Insurance and monitoring depth — zero score-building tools, and neither runs an agency partner program.",
        body:"Sell protection and insurance ceilings ($3M at LifeLock Ultimate Plus; 40+ monitoring features at IdentityForce), not score improvement. <span class='hl'>Zero score-building tools at any price point in this segment.</span> LifeLock's intro pricing climbs at renewal. Neither runs a credit-repair-agency partner program — they're built for individual consumers worried about theft, not agencies building credit from the ground up." },
    { type:"SEGMENT 4", sub:"agency channel", pill:"#7C3AED", tag:"Direct Competitors", tagBg:"#EDE9FE", tagColor:"#6D28D9",
      title:"Credit Repair Agency Channel — MyFreeScoreNow, IDIQ (IdentityIQ/MyScoreIQ), SmartCredit",
      summary:"The real battleground — all three run partner programs, and pricing is close. Win it on partnership, not price.",
        body:"This is the real head-to-head battleground — all three run partner programs built for credit repair businesses and integrate with Credit Repair Cloud-style CRMs. <span class='hl'>Be precise: at the top tier, MFSN ($29.95 flat) and SmartCredit Premium ($27.95–$29.95) are priced almost identically</span> — this segment is never won on price. It's won on what happens after the sale: how you get paid, and for how long. Full commission breakdown — including the exact math — lives in the Commission Comparison view above. Most of your competitive deals live in this one segment." },
    { type:"SEGMENT 5", sub:"enterprise api", pill:"#1B65E5", tag:"Different Buyer", tagBg:"#DBEAFE", tagColor:"#1D4ED8",
      title:"Enterprise Embedded Finance / API — Array",
      summary:"A different buyer entirely — banks needing in-app tools, not agencies needing a referral link.",
        body:"Sells to banks, credit unions, and fintechs that want credit tools built natively into their own digital banking platform via API — not to credit repair agencies or individual consumers. <span class='hl'>Different buyer, different sales cycle, often the prospect's own engineering team at the table.</span> Qualify with one question: do they need a referral link (SmartCredit's lane) or a custom integration (Array's lane)? Note: there is documented litigation history between ConsumerDirect and Array — see the Internal Note on Array's page. Never raise it; if it comes up, escalate to your manager." },
    { type:"QUALIFY", sub:"first question", pill:"#1B3480", tag:"Always Ask", tagBg:"#DBEAFE", tagColor:"#1D4ED8",
      title:"The one question that routes every conversation correctly",
      summary:"One question sorts almost every deal: handing clients a link, or building into your own platform?",
        body:"Before reaching for any battlecard: <span class='hl'>\"Are you looking for a tool to hand your clients directly, or something built into your own platform?\"</span> A referral-link answer puts you in Segments 1 through 4 — almost always a SmartCredit-favorable comparison once you're past the headline price. A custom-platform answer puts you in Segment 5 — qualify it, then route it. Don't try to win a deal you've correctly identified as the wrong shape." },
    { type:"SYNTHESIS", sub:"where smartcredit sits", pill:"#22C55E", tag:"Master Summary", tagBg:"#DCFCE7", tagColor:"#15803D",
      title:"The honest case for SmartCredit — and where the case has real limits",
      summary:"SmartCredit wins decisively on substance in 3 of 5 segments, on partnership in the 4th, and doesn't compete in the 5th.",
        body:"Against Segments 1 through 3 (free apps, bureau plays, insurance-led brands), SmartCredit wins decisively on substance: an actual score-improvement engine — ScoreBuilder®, ScoreBoost™, and patented Action Buttons™ — that none of those six products offer at any price, on any plan. <span class='hl'>That advantage is not close, and it does not require a price argument to win.</span> Against Segment 4 — the real agency-channel fight — price is roughly a wash at the top tier; the win is partnership depth: a built co-branded site, documented commission, and dedicated support versus a bare affiliate link or a confusing four-tier structure. Segment 5 (Array) isn't a fight at all — it's a different category, and trying to force it into a SmartCredit pitch will cost you credibility with the one prospect type where credibility matters most. Know the difference, and you walk into every conversation already knowing which fight you're actually in." }
  ]
};
