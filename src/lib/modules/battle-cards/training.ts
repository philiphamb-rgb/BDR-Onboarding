import type { TrainingStep } from './types';

export const TRAINING: TrainingStep[] = 
[
  { type:"welcome",
    title:"Battle Card Training",
    body:"You're about to learn 9 competitors, one at a time. Each one has a short story, a quick quiz, and one big idea worth remembering. No notes needed — by the end, this will just live in your head.",
    stats:"11 lessons · 11 quick quizzes · ~10 minutes · Unlocks Battle Cards",
    cta:"Begin Training" },

  { type:"lesson", key:"market", kicker:"Orientation", title:"The Market Map",
    hook:"One product. Five lanes. Know your lane.",
    panels:[
      { label:"THE LANDSCAPE", content:"There are 5 types of competitors. Free apps. Bureau-backed apps. Insurance brands. Credit repair tools. And bank software. You'll learn all 9 companies, sorted this way." },
      { label:"WHERE YOUR DEALS HAPPEN", content:"Most of your real competition is in just one lane: credit repair tools. That means MyFreeScoreNow and IDIQ. Prices are close there. Partnership terms win the deal." },
      { label:"THE ONE QUESTION THAT MATTERS", content:"Ask this first: does this person want a link to give clients? Or do they want something built into their own app? A link means SmartCredit. An app build means Array." },
      { label:"WHAT YOU'LL WALK AWAY WITH", content:"By the end, you'll know each company's price, what their customers feel, why people switch to SmartCredit, and what that switch is worth in dollars." }
    ],
    quiz:{ q:"Which question should you ask first to find the right competitor?",
      options:["What's their price?", "Do they want a link, or an app built in?", "How many users do they have?", "What state are they in?"],
      correct:1,
      explain:"That one question sorts almost every deal. A link means SmartCredit. A custom app means Array." }},

  { type:"lesson", key:"ck", kicker:"Lesson 1 of 9 · Free / Freemium", title:"Credit Karma", threat:"high",
    hook:"Free to look. Powerless to fix.",
    panels:[
      { label:"THE FACTS", content:"Credit Karma is free. Intuit owns it. It has over 100 million users. It checks 2 bureaus — TransUnion and Equifax. It never checks Experian. Not ever." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"A Credit Karma user opens the app and sees a number. Then they see loan ads. Many of those ads hurt their credit with hard inquiries. If their worst problems are on Experian, they never see them." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"SmartCredit checks all 3 bureaus, not 2. It gives a 120-day plan to fix the score. It lets clients test moves before they make them. And it can contact creditors directly." },
      { label:"THE BENEFIT", content:"Clients finally see their full credit file. They get a real plan, not just a number. And agencies earn $5 to $15 a month — Credit Karma pays agencies nothing." }
    ],
    quiz:{ q:"Which bureau does Credit Karma never check?",
      options:["TransUnion", "Equifax", "Experian", "All three"],
      correct:2,
      explain:"Credit Karma only uses TransUnion and Equifax. Experian is never part of the picture — on any plan, ever." }},

  { type:"lesson", key:"mf", kicker:"Lesson 2 of 9 · Bureau-Backed", title:"myFICO", threat:"med",
    hook:"You pay more to watch the same number sit still.",
    panels:[
      { label:"THE FACTS", content:"myFICO is owned by Fair Isaac, the company that makes the FICO score. It costs $19.95 to $39.95 a month. There's no yearly discount. There's no free trial." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"A myFICO customer pays full price every month. They get a simulator that shows 'what if' after the fact. They never get a real next step. They can't contact a creditor through the app." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"SmartCredit costs less at the top tier. It replaces the simulator with a real 120-day plan. It also lets clients message creditors directly. FICO and VantageScore move on the same actions — fixing one fixes both." },
      { label:"THE BENEFIT", content:"Clients get a plan, not just a mirror. Most people aren't ready for a mortgage yet anyway — they need the plan first. SmartCredit saves money and builds real progress." }
    ],
    quiz:{ q:"What does myFICO's simulator NOT give the client?",
      options:["A score number", "A real action plan", "A monthly bill", "A login"],
      correct:1,
      explain:"The simulator shows 'what if' after the fact. It never hands the client a real plan or next step." }},

  { type:"lesson", key:"ex", kicker:"Lesson 3 of 9 · Bureau-Backed", title:"Experian IdentityWorks", threat:"med",
    hook:"The bureau that's packing up mid-move.",
    panels:[
      { label:"THE FACTS", content:"Experian IdentityWorks is run by one of the 3 credit bureaus. The free plan only checks Experian. Paid plans go up to $34.99 a month. Experian is shutting this product down and moving everyone into CreditWorks Premium." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"A customer feels good trusting 'the source.' But right now, they're stuck mid-move. Support is shaky. The plan they signed up for is changing under them." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"A bureau's job is to report what already happened. It's not built to coach what to do next. SmartCredit isn't in the middle of shutting anything down while your client needs help." },
      { label:"THE BENEFIT", content:"Clients get a stable platform during repair. They see all 3 bureaus, not 1. And they get real tools to improve — not just a report that's about to change." }
    ],
    quiz:{ q:"What's happening to Experian IdentityWorks right now?",
      options:["It's adding Experian coverage", "It's being shut down and folded into CreditWorks Premium", "It's lowering its price", "It's adding a partner program"],
      correct:1,
      explain:"IdentityWorks is being discontinued. New signups are already closed, and it's merging into CreditWorks Premium." }},

  { type:"lesson", key:"ll", kicker:"Lesson 4 of 9 · Identity-Theft Insurance", title:"LifeLock / Norton 360", threat:"med",
    hook:"Insurance for after. Nothing for now.",
    panels:[
      { label:"THE FACTS", content:"LifeLock is owned by Gen Digital. It offers up to $3 million in identity theft insurance. Prices start at $12.49 to $34.99 a month — that's intro pricing, it goes up later. It has zero tools to improve a credit score." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"A LifeLock customer is buying protection — real help if something goes wrong. But no tool ever touches their score. And the bill goes up after the first year, often by surprise." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"LifeLock protects what already exists. SmartCredit builds what's still missing. Only one of these actually moves the number that's costing your client money on every loan." },
      { label:"THE BENEFIT", content:"SmartCredit users save an average of $7,969 from better loan rates. That's real money. LifeLock's $3 million ceiling is rare — almost nobody ever claims it. SmartCredit's price never sneaks up on you." }
    ],
    quiz:{ q:"What does LifeLock actually sell?",
      options:["A credit-improvement plan", "Insurance and identity recovery", "A FICO score", "A bank account"],
      correct:1,
      explain:"LifeLock sells insurance and recovery help. It has no tool that ever improves a credit score." }},

  { type:"lesson", key:"idf", kicker:"Lesson 5 of 9 · Identity-Theft Insurance", title:"IdentityForce", threat:"med",
    hook:"Watches everything. Fixes nothing.",
    panels:[
      { label:"THE FACTS", content:"IdentityForce is owned by TransUnion. It has 40+ monitoring features — the deepest watch-list in this whole comparison. It costs $23.95 to $37.90 a month. It has zero credit-improvement tools. It pays agencies nothing." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"An IdentityForce customer gets alerts on almost everything. But even paying $37.90 a month, they still have no plan, no simulator, and no way to move their score from 520 to 650." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"Watching for threats is not the same as fixing a score. SmartCredit gives a real plan, a simulator, and direct creditor contact — for less money than IdentityForce's top tier." },
      { label:"THE BENEFIT", content:"Clients get real protection — SmartCredit includes $1 million in fraud insurance. Plus the improvement tools IdentityForce has never built. Agencies finally earn commission where IdentityForce pays zero." }
    ],
    quiz:{ q:"IdentityForce is great at watching for threats. What is it missing?",
      options:["A mobile app", "Any tool to improve the score", "Customer support", "A free trial"],
      correct:1,
      explain:"IdentityForce monitors deeply, but it has zero tools that actually move a credit score upward." }},

  { type:"lesson", key:"cs", kicker:"Lesson 6 of 9 · Free / Freemium", title:"Credit Sesame", threat:"low",
    hook:"Free comes with a hidden cost.",
    panels:[
      { label:"THE FACTS", content:"Credit Sesame is free. It only checks TransUnion — the smallest bureau view of any free app here. Its banking product, Sesame Cash, is causing real score drops in 2026. Some users lost over 200 points." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"A Sesame user only sees 1 of 3 bureaus. If they use Sesame Cash, there's a real risk of a sudden score drop from a billing mistake. Support has been hard to reach." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"SmartCredit shows all 3 bureaus, not 1. And it has zero exposure to a banking product that's actively damaging client scores right now." },
      { label:"THE BENEFIT", content:"Clients can trust that the number on screen reflects their whole file. Nothing else in their stack is secretly working against the repair you're doing." }
    ],
    quiz:{ q:"What is causing real score drops for Credit Sesame users in 2026?",
      options:["A bad mobile app update", "The Sesame Cash banking product", "A change to VantageScore", "A new login system"],
      correct:1,
      explain:"Sesame Cash has caused documented 200+ point score drops from billing errors, with support hard to reach." }},

  { type:"lesson", key:"mfsn", kicker:"Lesson 7 of 9 · Credit Repair Agency Channel", title:"MyFreeScoreNow", threat:"med",
    hook:"Same price. One check. Then silence.",
    panels:[
      { label:"THE FACTS", content:"MyFreeScoreNow has been a credit-repair staple for over 10 years. It costs a flat $29.95 a month, including a monthly 3-bureau report. That's almost the same price as SmartCredit's top plan." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"An MFSN client gets a solid, familiar product. But the agency that sent them gets just one link. No branded site. No real contact. Nothing working to stop that client from canceling." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"Same price, totally different partnership. SmartCredit builds a branded site, gives a real contact, and sends auto messages to clients to help stop cancellations." },
      { label:"THE BENEFIT", content:"MFSN pays $50 one time. SmartCredit pays $5 to $15 every single month the client stays active. SmartCredit wins by month four — and keeps winning every month after." }
    ],
    quiz:{ q:"How does SmartCredit's commission compare to MFSN's?",
      options:["MFSN pays more overall", "MFSN pays once. SmartCredit pays every month the client stays.", "They pay the exact same way", "Neither one pays commission"],
      correct:1,
      explain:"MFSN pays a flat $50 one time. SmartCredit pays $5–$15 every month, for as long as the client stays active." }},

  { type:"lesson", key:"idiq", kicker:"Lesson 8 of 9 · Credit Repair Agency Channel", title:"IDIQ (IdentityIQ / MyScoreIQ)", threat:"high",
    hook:"Four tiers. One warning label.",
    panels:[
      { label:"THE FACTS", content:"IDIQ runs two brands and four price tiers, from $6.99 to $39.95 a month. It also runs a two-layer Partner program. U.S. News has publicly said: don't use one of the four tiers." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"An IDIQ client has lots of choices — maybe too many. There's a real risk of landing on the wrong tier. Security.org also reports IDIQ shares customer data with other companies." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"SmartCredit has one clear plan. No risk of picking the wrong tier. And the commission rate is published, not a secret number you find out later." },
      { label:"THE BENEFIT", content:"It's simpler for the client and more predictable for you. You know exactly what you'll earn, in writing, before you ever sign anything." }
    ],
    quiz:{ q:"What did U.S. News say about one of IDIQ's four tiers?",
      options:["It's the best value on the market", "They do not recommend it", "It includes a free trial", "It's only for businesses"],
      correct:1,
      explain:"U.S. News flagged one of IDIQ's four tiers directly, stating they do not recommend that specific plan." }},

  { type:"lesson", key:"array", kicker:"Lesson 9 of 9 · Enterprise Embedded Finance", title:"Array", threat:"low",
    hook:"Built for banks, not for you.",
    panels:[
      { label:"THE FACTS", content:"Array is backed by venture capital. It builds credit tools right into bank and credit union apps. It is not a product for regular consumers. It has no referral program for individuals at all." },
      { label:"WHAT THEIR CUSTOMER EXPERIENCES", content:"There's no real end customer here to talk about. Array's 'customer' is a bank's engineering team — on a project that takes months to build." },
      { label:"WHY THEY MOVE TO SMARTCREDIT", content:"This was never a real matchup. Array serves a totally different buyer. If someone wants a simple link to hand to clients, Array was never an option for them." },
      { label:"THE BENEFIT", content:"Spotting this fast saves you from wasting time comparing two totally different things. It sends any real bank lead to the right place instead of a dead end." }
    ],
    quiz:{ q:"Who is Array actually built for?",
      options:["Credit repair agencies", "Individual consumers", "Banks and credit unions", "Real estate agents"],
      correct:2,
      explain:"Array sells API integrations to banks and credit unions. It is not built for individual consumers or agencies at all." }},

  { type:"lesson", key:"commission", kicker:"Commission Economics", title:"How You Get Paid",
    hook:"One paycheck vs. a paycheck every month.",
    panels:[
      { label:"THE FACTS", content:"SmartCredit pays $5 to $15 a month for every active client — and it's published openly. MFSN pays a flat $50, one time. IDIQ pays real money too, but the rate is never published. Array pays individuals nothing." },
      { label:"THE AGENCY'S EXPERIENCE", content:"An agency using MFSN gets one check, then nothing more — ever, no matter how long that client stays. An agency using SmartCredit gets paid again every single month the client stays active." },
      { label:"WHY SMARTCREDIT WINS", content:"A published number beats a hidden one. A paycheck every month beats a single paycheck, every time — especially when clients stick around." },
      { label:"THE BENEFIT", content:"A client who stays just one year is worth up to $180 with SmartCredit. That's over 3.5 times more than MFSN's flat $50 — from the exact same client." }
    ],
    quiz:{ q:"If a client stays active for one full year, about how much could SmartCredit pay you?",
      options:["$50, one time", "Up to $180", "Nothing", "$1,000"],
      correct:1,
      explain:"At $5–$15 a month, a client active for 12 months is worth up to $180 in commission — over 3.5x more than MFSN's flat $50." }},

  { type:"graduation",
    title:"Training Complete!",
    body:"You just learned what real customers feel, why they switch, and what it's worth — for all 9 competitors. Review anything below, or head straight into the Battle Cards tool.",
    cta:"Enter Battle Cards" }
];
