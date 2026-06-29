// @ts-nocheck
'use client'

/*
  PORT NOTES — when ingesting into the BDR OS Next.js app:
  1. Add the directive  'use client'  as the very first line of the route file
     (this component is fully client-side: window, speechSynthesis, storage).
  2. Remove the runtime Google-Fonts <link> injection and the global
     * { font-family: ... !important } rule in the init effect; replace with
     next/font scoped to the module so it does not restyle the host app.
     Scope or drop the global ::selection and scrollbar rules for the same reason.
  3. Replace the window.storage-based `store` with the Supabase `storageAdapter`
     prop (get/set/list/del; get & list accept a `shared` flag for the manager roster).
  4. Mount as: <SandlerRules embedded injectedUser={{id,name,email}}
       storageAdapter={...} onCertified={fn} onExit={fn} />
*/
import { useState, useEffect, useRef } from 'react';

const C={navy:'#003087',navyD:'#001F5B',navyL:'#1A5098',teal:'#00C2B2',tealL:'#33D0C2',gold:'#F5A623',goldD:'#C4841C',red:'#E84020',sky:'#4DC8E8',orange:'#F07820',white:'#FFF',offW:'#F8FAFF',bg:'#EEF3FC',dark:'#0A1628',mid:'#3D4F68',muted:'#6B7A95',faint:'#A0AECC',border:'#CDD5E8',borderL:'#E5EBF5',success:'#16A34A',successBg:'#F0FDF4',fail:'#DC2626',failBg:'#FEF2F2',warn:'#F59E0B',warnBg:'#FFFBEB',navy2:'#0047BD',surface:'#FAFCFF'};


const XP_VALUES={lesson_complete:25,quiz_pass:50,quiz_perfect:75,assessment_pass:150,assessment_perfect:250,final_pass:500,final_perfect:750};
const BELTS=[{min:0,max:300,name:'White Belt',color:'#E8E8E8',textColor:'#333'},{min:300,max:700,name:'Yellow Belt',color:'#F5C200',textColor:'#333'},{min:700,max:1200,name:'Orange Belt',color:'#F07820',textColor:'#fff'},{min:1200,max:1800,name:'Green Belt',color:'#16A34A',textColor:'#fff'},{min:1800,max:2600,name:'Blue Belt',color:'#1A5098',textColor:'#fff'},{min:2600,max:3600,name:'Brown Belt',color:'#7C4D00',textColor:'#fff'},{min:3600,max:9999,name:'Black Belt',color:'#0A1628',textColor:'#F5C200'}];
const BADGES=[{id:'first_rule',icon:'🎯',name:'First Step',desc:'Complete your first Sandler lesson'},{id:'halfway',icon:'🌟',name:'Halfway There',desc:'Complete 25 rules'},{id:'part1_done',icon:'🔑',name:'Core Concepts',desc:'Complete all 6 Part One rules'},{id:'part2_done',icon:'⚡',name:'Executor',desc:'Complete all 27 Part Two rules'},{id:'part3_done',icon:'🧭',name:'Course Corrector',desc:'Complete all 16 Part Three rules'},{id:'perfect_quiz',icon:'💯',name:'Perfect Score',desc:'Score 3/3 on any quiz'},{id:'triple_perfect',icon:'🔥',name:'On Fire',desc:'3 perfect quizzes in a row'},{id:'no_stopper',icon:'💪',name:'No Stopper',desc:'Pass 10 quizzes'},{id:'quiz_all',icon:'🧠',name:'Quiz Master',desc:'Pass all 49 rule quizzes'},{id:'week_streak',icon:'📅',name:'Consistent',desc:'Maintain a 7-day training streak'},{id:'certified',icon:'🏆',name:'Course Certified',desc:'Pass the final certification exam'},{id:'black_belt',icon:'🥋',name:'Black Belt',desc:'Earn 3,600+ XP and master the system'}];
const getBelt=xp=>BELTS.find(b=>xp>=b.min&&xp<b.max)||BELTS[BELTS.length-1];
const getXpToNext=xp=>{const b=getBelt(xp);return b.max===9999?null:b.max-xp;};

const PARTS=[
  {id:'p1',num:1,title:'Part One: Learn the Core Concepts',sub:'Rules 1–6',tagline:'Use the first six rules to transform your selling process.',color:'#003087',textColor:'#fff',page:11},
  {id:'p2',num:2,title:'Part Two: Execute',sub:'Rules 7–33',tagline:'Do what works.',color:'#00C2B2',textColor:'#fff',page:38},
  {id:'p3',num:3,title:'Part Three: Course-Correct',sub:'Rules 34–49',tagline:'Remind yourself of what’s easy to forget.',color:'#F5A623',textColor:'#0A1628',page:139},
];

const qq=(q,a,b,c,d,ans,ex)=>({q,opts:[a,b,c,d],a:ans,ex});

const RULES=[
/* PART ONE */
{id:'r01',part:'p1',num:1,page:13,
 title:`You Have to Learn to Fail, to Win.`,
 msg:`"The salesperson who is not afraid to fail is the one who will ultimately succeed." — Sandler`,
 pts:[`Head Trash: negative self-talk sabotages performance`,`Willingness to fail removes fear-based decisions`,`Set behavioral goals, not just outcome goals`],
 quiz:[
  qq(`What term does Sandler use for the limiting beliefs that sabotage salespeople?`,`Cold feet`,`Head Trash`,`Call reluctance`,`Ego blocks`,1,`Head Trash = limiting beliefs that prevent fearless execution.`),
  qq(`Being willing to fail on every call allows you to:`,`Work harder`,`Close more immediately`,`Follow the system without fear-based interference`,`Set higher targets`,2,`Remove the emotional charge of winning to execute the system cleanly.`),
  qq(`A BDR avoids hard qualifying questions fearing a lost deal. Sandler calls this:`,`Good judgment`,`Head Trash causing fear-based decisions`,`Conservative strategy`,`Respect for the prospect`,1,`Avoiding necessary questions from fear is classic Head Trash.`),
 ]},
{id:'r02',part:'p1',num:2,page:17,
 title:`Don't Spill Your Candy in the Lobby.`,
 msg:`"Don't give it all away before you've determined the prospect is worth your time." — Sandler`,
 pts:[`Never pitch before qualifying — you become free consulting`,`Premature disclosure destroys leverage and urgency`,`Earn the right to share before you share`],
 quiz:[
  qq(`"Spilling your candy in the lobby" means:`,`Being unprepared`,`Giving your full pitch before qualifying the prospect`,`Revealing pricing too early`,`Sharing testimonials early`,1,`Giving away your pitch before qualifying = free consulting.`),
  qq(`Why is pitching before qualification harmful?`,`It wastes time`,`You become free consulting for someone who may never buy`,`The meeting runs too long`,`It confuses prospects`,1,`Without qualification, you give expertise away for nothing.`),
  qq(`Prospect says "just tell me what you offer." The Sandler response is:`,`Launch into full demo`,`Share pricing deck`,`Ask qualifying questions first — what specifically matters to them?`,`Send a follow-up email`,2,`Qualify before sharing. Find what matters to them first.`),
 ]},
{id:'r03',part:'p1',num:3,page:21,
 title:`No Mutual Mystification.`,
 msg:`"Clarity is the hallmark of a Sandler salesperson. If you don't know where you stand, ask." — Sandler`,
 pts:[`Mutual mystification: both parties think they understand but don't`,`The Up-Front Contract eliminates false assumptions`,`Ambiguity is the enemy of a productive sales process`],
 quiz:[
  qq(`"Mutual mystification" occurs when:`,`Both parties use jargon`,`Both believe they understand each other, but neither actually does`,`A prospect uses vague language`,`You forget to follow up`,1,`Both parties leave confused but each thinking they're aligned.`),
  qq(`The primary Sandler tool for eliminating mutual mystification is:`,`Detailed proposals`,`The Up-Front Contract — setting clear shared expectations at the start of every meeting`,`A signed NDA`,`CRM notes`,1,`The UFC defines purpose, agenda, and expected outcome for every meeting.`),
  qq(`"Let's stay in touch" after a meeting is likely:`,`A strong buying signal`,`A definite yes`,`Mutual mystification — neither party knows where they actually stand`,`Standard professional courtesy`,2,`"Stay in touch" sounds positive but reveals nothing real.`),
 ]},
{id:'r04',part:'p1',num:4,page:25,
 title:`A Decision Not to Make a Decision Is a Decision.`,
 msg:`"Don't allow your prospect to sit on the fence. A non-decision is a decision — usually a no in disguise." — Sandler`,
 pts:[`Indecision occupies pipeline space without advancing`,`Help prospects see that delaying IS itself a choice`,`Maybes are more expensive than nos`],
 quiz:[
  qq(`"We'll decide by Q3" — Sandler says this is often:`,`A strong buying signal`,`Good corporate timeline`,`A soft no disguised as a future commitment`,`Standard procurement`,2,`Vague future commitments with no concrete steps = likely soft no.`),
  qq(`Why is a "maybe" more expensive than a "no"?`,`Maybes need more follow-up`,`A maybe consumes pipeline space and energy for weeks with no progress`,`Maybes delay your commission`,`Nothing — maybes convert`,1,`Nos free you immediately. Maybes drain time and energy indefinitely.`),
  qq(`When a prospect says "not ready to decide yet," you should:`,`Schedule 30-day follow-up`,`Send more information`,`Help them see that non-decision is itself a decision`,`Thank them for their time`,2,`Surface whether "not deciding" actually means "no."`),
 ]},
{id:'r05',part:'p1',num:5,page:29,
 title:`Never Answer an Unasked Question.`,
 msg:`"Volunteering information that wasn't requested gives the prospect new ammunition to use against you." — Sandler`,
 pts:[`Unsolicited info creates objections that didn't exist`,`Every unasked answer reduces your leverage`,`Ask what they need to know BEFORE answering`],
 quiz:[
  qq(`Why does answering questions prospects didn't ask hurt your position?`,`It wastes selling time`,`It creates objections the prospect never would have raised on their own`,`It makes you seem unprepared`,`It violates process`,1,`Volunteered information = new objections you just handed them.`),
  qq(`"What do you offer?" — The Sandler approach is:`,`Give the full product overview`,`Ask "What specifically would be most helpful to know right now?"`,`Offer a demo`,`Send a features list`,1,`Ask first. Find out what they actually need before answering.`),
  qq(`A salesperson mentions "our implementation takes 90 days" unprompted. They violated:`,`Rule #8`,`Rule #5 — answering an unasked question, creating a potential objection`,`Rule #2`,`Rule #3`,1,`Volunteering the 90-day timeline introduces an objection nobody raised.`),
 ]},
{id:'r06',part:'p1',num:6,page:34,
 title:`Don't Buy Back Tomorrow the Product or Service You Sold Today.`,
 msg:`"Once the deal is closed, stop selling. Anything you do to re-justify the sale can undo it." — Sandler`,
 pts:[`Buyer's remorse is triggered by post-close overselling`,`The close is a commitment — honor it and implement`,`Move to delivery, not continued defense of the decision`],
 quiz:[
  qq(`"Buying back" a closed deal means:`,`Offering a post-close discount`,`Re-pitching or over-reassuring after the close, reintroducing doubt`,`Checking in on implementation`,`Sending a thank-you note`,1,`Buying back = selling after the close, reopening doubt you already resolved.`),
  qq(`What causes salespeople to buy back deals?`,`Poor contract terms`,`Fear the prospect might cancel, leading to unnecessary reassurance calls`,`Excitement about the new client`,`Management pressure`,1,`Fear-driven post-close behavior creates the problem it was trying to prevent.`),
  qq(`The day after closing, your next communication should:`,`Review all the reasons they made the right choice`,`Call to confirm they're still excited`,`Confirm next steps and transition to implementation`,`Offer an enhanced contract`,2,`Stop selling. Move to delivery. Implementation talk, not justification.`),
 ]},
/* PART TWO */
{id:'r07',part:'p2',num:7,page:39,
 title:`You Never Have to Like Prospecting, You Just Have to Do It.`,
 msg:`"Motivation doesn't create action — action creates motivation." — Sandler`,
 pts:[`Consistency over motivation — just make the calls`,`Feast-or-famine cycles come from prospecting lapses`,`Activity is the only variable you fully control`],
 quiz:[
  qq(`What is the Sandler mindset about not feeling like prospecting?`,`Wait until motivated`,`Schedule only on high-energy days`,`You don't have to like it — you just have to do it consistently`,`Take a day off when reluctant`,2,`Feelings about prospecting are irrelevant. Consistency is what matters.`),
  qq(`Salespeople who only prospect when "in the mood" experience:`,`More qualified leads`,`Higher close rates`,`Feast-or-famine pipeline cycles`,`Better relationships`,2,`Inconsistent prospecting = pipeline waves = feast and famine.`),
  qq(`The real cure for call reluctance is:`,`Better scripts`,`More training`,`A full pipeline — each call feels less precious when there are many`,`Self-motivation techniques`,2,`Abundance of pipeline opportunities reduces the desperation that causes reluctance.`),
 ]},
{id:'r08',part:'p2',num:8,page:43,
 title:`When Prospecting, Go for the Appointment.`,
 msg:`"Don't try to qualify or sell on the first prospecting call — your only goal is to get in front of the prospect." — Sandler`,
 pts:[`First call goal: secure the meeting, nothing more`,`Qualifying and selling require a proper discovery meeting`,`The appointment unlocks all other stages in the system`],
 quiz:[
  qq(`What is the ONE goal of a prospecting call?`,`Qualify their budget`,`Present top features`,`Secure an appointment — nothing more`,`Close the deal`,2,`Rule #8: go for the appointment only. Never try to sell on a cold call.`),
  qq(`Why is trying to sell on the first call a mistake?`,`Prospects don't have time`,`You violate the process — qualification requires a real discovery meeting`,`It's against policy`,`You don't know their industry yet`,1,`The Sandler system requires discovery that only happens in a structured meeting.`),
  qq(`A salesperson delivers a full pitch on their first cold call. This violates:`,`Rule #2 and Rule #8 — spilling candy AND not going for the appointment`,`Only Rule #1`,`Rule #15`,`None — it's effective`,0,`Spilling candy (Rule #2) + skipping the appointment goal (Rule #8) = double violation.`),
 ]},
{id:'r09',part:'p2',num:9,page:48,
 title:`Every Unsuccessful Prospecting Call Earns Compound Interest.`,
 msg:`"Like money in a savings account, every prospecting effort compounds over time — even the ones that don't work today." — Sandler`,
 pts:[`Each no moves you statistically closer to a yes`,`Skills compound with consistent, deliberate practice`,`Today's rejection may plant tomorrow's relationship`],
 quiz:[
  qq(`What does "compound interest" mean in prospecting?`,`Earn commissions on referrals`,`Each effort — even unsuccessful ones — builds toward future results`,`Charge interest on late deals`,`Prospecting is a financial investment`,1,`Every call builds skills, plants seeds, and moves you toward success.`),
  qq(`"Call me in 6 months" — Rule #9 says you should:`,`Remove them from your list`,`Consider it a wasted call`,`Log it as a future asset — this is compound interest working`,`Give up on this prospect`,2,`"Call me later" is a future opportunity earning compound interest right now.`),
  qq(`The compound interest principle requires:`,`Large bets on a few deals`,`Sporadic but intense effort`,`Consistent prospecting activity over time regardless of short-term results`,`Only pursuing hot leads`,2,`Compound interest requires time AND consistency. Regular deposits build results.`),
 ]},
{id:'r10',part:'p2',num:10,page:51,
 title:`Develop a Prospecting Awareness.`,
 msg:`"A top salesperson sees prospects everywhere — at networking events, social gatherings, even the grocery store." — Sandler`,
 pts:[`Develop an ongoing mental radar for potential prospects`,`Always have your elevator pitch ready`,`Prospecting awareness becomes habit, not forced effort`],
 quiz:[
  qq(`Prospecting awareness means:`,`Always having your pitch deck ready`,`An ongoing mental radar for potential prospects in all situations`,`Attending every conference`,`4 hours of cold calls daily`,1,`Rule #10 = developing the professional habit of seeing prospects everywhere.`),
  qq(`Where does Sandler say prospecting awareness operates?`,`Only in formal business settings`,`Only at industry events`,`Everywhere — social settings, events, daily interactions, and existing client networks`,`Only during work hours`,2,`The best salesperson is always attuned to opportunity, without being pushy.`),
  qq(`Developing prospecting awareness changes your daily behavior by:`,`Making you more aggressive at events`,`Starting to see every interaction as a potential lead opportunity`,`Making more cold calls`,`Attending more conferences`,1,`Every conversation becomes a potential lead. That's prospecting awareness in action.`),
 ]},
{id:'r11',part:'p2',num:11,page:55,
 title:`Money Does Grow on Trees.`,
 msg:`"There is an unlimited supply of money out there. Your only challenge is developing the system to access it." — Sandler`,
 pts:[`Scarcity thinking about money blocks performance`,`Abundance mindset opens opportunities that fear closes`,`The money IS there — the system is what accesses it`],
 quiz:[
  qq(`The core message of "Money does grow on trees" is:`,`Financial planning is easy`,`There is unlimited revenue potential — you need the system to access it`,`Never negotiate on price`,`Money is the bottom line`,1,`Prospects and budget are not scarce. Your system is the variable.`),
  qq(`What dangerous mindset does Rule #11 directly counter?`,`Overconfidence`,`Scarcity thinking — the belief that not enough prospects or budget exists`,`Rushing the sale`,`Over-qualifying`,1,`Scarcity thinking creates desperation, discounting, and poor decisions.`),
  qq(`"Prospects in my territory don't have budget." Sandler's Rule #11 suggests:`,`Change territories`,`The market is genuinely scarce`,`This is scarcity mindset that will sabotage their performance`,`They need better marketing`,2,`Budget is available for problems that hurt enough. Find the real pain.`),
 ]},
{id:'r12',part:'p2',num:12,page:58,
 title:`Answer Every Question with a Question.`,
 msg:`"He who asks the questions controls the conversation." — Sandler`,
 pts:[`Questions give you control without being controlling`,`Answering with questions reveals the true intent behind the ask`,`The professional never answers blindly`],
 quiz:[
  qq(`Why does Sandler recommend answering every question with a question?`,`It stalls for time`,`It keeps you in control and uncovers what's really behind the question`,`It makes you seem smarter`,`It frustrates prospects into deciding`,1,`Answering with a question keeps you in discovery mode.`),
  qq(`"How much does it cost?" — The Sandler response is:`,`Give the price immediately`,`Say "it depends"`,`Ask "What budget range were you thinking?" or similar`,`Avoid the topic`,2,`Answering with a question gives you critical budget anchor information first.`),
  qq(`The primary benefit of answering questions with questions is:`,`Making prospects work harder`,`Uncovering the REAL concern behind the question before committing to an answer`,`Stalling for time`,`Following Sandler rules`,1,`Every question has a question behind it. Find it before you answer.`),
 ]},
{id:'r13',part:'p2',num:13,page:62,
 title:`No Mind Reading.`,
 msg:`"Never assume what the prospect is thinking. If you don't know, ask." — Sandler`,
 pts:[`Assumptions about prospect intent are almost always wrong`,`Mind reading creates phantom objections you then "handle"`,`Ask — never guess — what the prospect actually means`],
 quiz:[
  qq(`"No mind reading" means a salesperson should:`,`Use psychology to predict behavior`,`Never assume what a prospect thinks, feels, or intends — always ask directly`,`Read body language more carefully`,`Hire a psychologist`,1,`You don't know what's in their head. Assuming leads to addressing the wrong things.`),
  qq(`Why is assuming you know a prospect's objection before they state it dangerous?`,`It seems arrogant`,`You might address a problem they don't have while missing their actual concern`,`It violates Rule #5`,`It confuses them`,1,`You handle the wrong problem and miss the real one entirely.`),
  qq(`When a prospect goes quiet, the correct Sandler approach is:`,`Assume they're considering saying yes`,`Fill the silence with more information`,`Ask directly: "What are you thinking right now?"`,`Move on to the next agenda item`,2,`"What are you thinking?" is far more powerful than assuming silence means anything.`),
 ]},
{id:'r14',part:'p2',num:14,page:66,
 title:`A Prospect Who Is Listening Is No Prospect at All.`,
 msg:`"If the prospect is mostly listening, you are probably talking too much and discovering too little." — Sandler`,
 pts:[`Prospects should talk 70% of the time`,`A quiet prospect is a disengaged prospect`,`Shift from presenting to questioning the moment you notice the imbalance`],
 quiz:[
  qq(`If your prospect is mostly listening, Sandler says:`,`They're deeply interested`,`They're processing your pitch`,`You're presenting too much — they should be talking 70% of the time`,`They're introverted`,2,`A listening prospect is passive. You've flipped to presentation mode.`),
  qq(`The ideal Sandler talk-time ratio is:`,`Salesperson 60% / Prospect 40%`,`50/50`,`Prospect 70% / Salesperson 30%`,`Depends on the meeting stage`,2,`The prospect should talk roughly 70%. You ask and listen.`),
  qq(`When you've been talking for 5+ uninterrupted minutes:`,`Finish the thought — you were on a roll`,`Keep going — good salespeople present effectively`,`Stop and ask a question to re-engage the prospect in discovery`,`Summarize what you said`,2,`Rule #14: the moment you notice you're doing all the talking, stop and ask.`),
 ]},
{id:'r15',part:'p2',num:15,page:70,
 title:`The Best Sales Presentation You'll Ever Give, the Prospect Will Never See.`,
 msg:`"The best presentation is the one that never happens because discovery led the prospect to commit first." — Sandler`,
 pts:[`Discovery replaces presentation in the ideal Sandler outcome`,`Great salespeople ask — they don't tell`,`When prospects articulate their own pain, their conviction follows naturally`],
 quiz:[
  qq(`The "best presentation" according to Rule #15 is:`,`A polished slide deck`,`A presentation that never happens because discovery led the prospect to commit first`,`A 90-minute product deep dive`,`A live demo with the full team`,1,`If discovery is done right, the formal presentation becomes unnecessary.`),
  qq(`Why do elaborate presentations often fail?`,`They're too long`,`They're built around what the salesperson wants to show, not what the prospect needs to hear`,`They cost too much to produce`,`Prospects prefer written materials`,1,`A polished presentation is often about showing off, not solving pain.`),
  qq(`"Just send me your standard deck" — the Sandler response is:`,`Send it immediately`,`Agree and include a cover note`,`Ask "What specifically would be most relevant for you?" before agreeing to present anything`,`Schedule the presentation`,2,`Rule #15: don't present without knowing why. Ask first.`),
 ]},
{id:'r16',part:'p2',num:16,page:74,
 title:`Never Ask for the Order – Make the Prospect Give Up.`,
 msg:`"When you ask for the order, you're begging. When you guide the process, the prospect surrenders to the logic of the decision." — Sandler`,
 pts:[`Asking for the order positions you as subordinate`,`The close should emerge naturally from systematic discovery`,`Guide the process so commitment is the next logical step`],
 quiz:[
  qq(`"Make the prospect give up" means:`,`Wear them down with persistence`,`Help the prospect arrive at the decision themselves — make committing the logical next step`,`Use aggressive closing techniques`,`Give up and let them decide alone`,1,`"Giving up" means surrendering to the logic they've arrived at through discovery.`),
  qq(`Why does asking directly for the order put you at a disadvantage?`,`It seems unprepared`,`It positions you as begging and shifts all power to the prospect to say no`,`It violates company policy`,`It seems aggressive`,1,`When you ask "can I have your business?" you hand all power to the prospect.`),
  qq(`If you've done proper Sandler qualification, the close should feel:`,`Like a negotiation`,`Aggressive and assertive`,`Like a natural conclusion both parties have already arrived at`,`Surprising to the prospect`,2,`Rule #16: a process done well makes closing inevitable, not a moment.`),
 ]},
{id:'r17',part:'p2',num:17,page:78,
 title:`The Professional Does What He Did as a Dummy – on Purpose.`,
 msg:`"When you were new, you got results accidentally. Now you need to produce those results on purpose, every time." — Sandler`,
 pts:[`Beginners stumble into wins; professionals engineer them deliberately`,`Master and intentionalize the techniques you once used instinctively`,`Turn accidental wins into a repeatable, scalable system`],
 quiz:[
  qq(`"Doing what you did as a dummy — on purpose" means:`,`Pretend you don't know your product`,`Return to beginner's mind on every call`,`Deliberately use the techniques that worked when you unknowingly applied Sandler principles`,`Make your calls feel casual and natural`,2,`Identify what worked naturally and engineer it into your intentional process.`),
  qq(`A new BDR accidentally got a yes by saying "I'm not sure we're the right fit." The professional's response:`,`That was lucky — don't rely on it`,`Understand this was Negative Reverse working, and learn to use it intentionally`,`Avoid this kind of language in future`,`Add it to a cheat sheet only`,1,`Rule #17: identify what worked accidentally and deliberately engineer it in.`),
  qq(`Why do experienced salespeople sometimes perform worse than beginners?`,`They've become lazy`,`They overthink the process`,`They abandon fundamentals that worked naturally — replacing curiosity with polished but less effective pitching`,`They know too much`,2,`Experience can kill the natural curiosity and honesty that made beginners surprisingly effective.`),
 ]},
{id:'r18',part:'p2',num:18,page:82,
 title:`Don't Paint "Seagulls" in Your Prospect's Picture.`,
 msg:`"When the prospect describes their ideal vision, listen carefully — and don't add elements they didn't request." — Sandler`,
 pts:[`Seagulls = unsolicited additions to the prospect's described vision`,`Adding unrequested features creates doubt and complicates their picture`,`Ask and amplify their vision — never add to it`],
 quiz:[
  qq(`"Painting seagulls" refers to:`,`Using artistic metaphors`,`Adding features or benefits to a prospect's vision that they never asked for`,`Describing your product creatively`,`Using too many analogies`,1,`Like painting seagulls into someone's peaceful sunset: adding what they didn't want.`),
  qq(`Why does adding unsolicited features hurt your position?`,`It makes meetings run long`,`It introduces complications the prospect never considered — creating doubt instead of excitement`,`It makes you seem over-eager`,`It violates Rule #5`,1,`Every unasked addition forces prospect to evaluate something new, creating doubt.`),
  qq(`"I just need cleaner reporting." The Sandler approach is:`,`Show all reporting features to demonstrate full value`,`Tell them about advanced analytics they haven't considered`,`Ask deeper questions about their reporting needs — don't add to their picture`,`Suggest they might also need integrations`,2,`Ask and amplify their picture. Don't add seagulls they didn't ask for.`),
 ]},
{id:'r19',part:'p2',num:19,page:86,
 title:`Never Help the Prospect End the Interview.`,
 msg:`"Don't give the prospect exit lines. Keep control of the meeting by not offering them a way out." — Sandler`,
 pts:[`Exit lines signal you're done before you've gotten what you need`,`Never say "I know you're busy" or "Just a few more minutes"`,`Stay in control of the meeting's pacing and closure`],
 quiz:[
  qq(`Which of these is an "exit line" that violates Rule #19?`,`"Tell me more about that challenge."`,`"I know you're really busy, so I'll let you go..."`,`"What would need to be true for this to work?"`,`"What does this problem cost you annually?"`,1,`"I'll let you go" is a gift to the prospect — you're ending the meeting for them.`),
  qq(`Why should you never say "I know you're busy" during a call?`,`It's unprofessional`,`You're apologizing for your presence and handing them a reason to end the meeting early`,`It makes you seem insecure`,`It violates Rule #5`,1,`Apologizing for taking their time signals you don't believe the meeting has value.`),
  qq(`Prospect looks at their watch. You should:`,`Apologize and wrap up quickly`,`Say "I can tell you're watching time — let me get out of your way"`,`Acknowledge it directly: "I notice you're watching the time — do we need to adjust our agenda?"`,`Ignore it and keep talking`,2,`Acknowledge the signal and let THEM decide. You're not handing them an exit.`),
 ]},
{id:'r20',part:'p2',num:20,page:89,
 title:`The Bottom Line of Professional Selling Is Going to the Bank.`,
 msg:`"No amount of activity, relationships, or effort matters if it doesn't result in revenue. The bottom line is getting paid." — Sandler`,
 pts:[`Professional selling is a revenue-generating activity`,`Relationships and activities are means to an end — revenue is the end`,`The bank doesn't accept your effort as currency`],
 quiz:[
  qq(`The ultimate measure of professional selling is:`,`Building strong relationships`,`Going to the bank — generating real, measurable revenue`,`Activity volume`,`Client satisfaction scores`,1,`Sandler: the professional is measured by results. Revenue is the only currency.`),
  qq(`"40 meetings this month, 1 close." Rule #20 says:`,`40 meetings is impressive`,`Volume matters — keep it up`,`The metric that matters is what went to the bank, not how many meetings happened`,`They need better product training`,2,`Rule #20 rejects activity worship. Revenue is the measure.`),
  qq(`Why don't "good feelings" with a prospect count?`,`Emotions are unprofessional`,`Good feelings are irrelevant if the deal never closes — the bank doesn't accept them`,`You should be more analytical`,`Feelings complicate negotiation`,1,`"The bank doesn't accept warm feelings." If it doesn't close, it doesn't count.`),
 ]},
{id:'r21',part:'p2',num:21,page:94,
 title:`Sell Today, Educate Tomorrow.`,
 msg:`"Close the sale first, then fulfill on your promise. Don't educate prospects as a substitute for selling." — Sandler`,
 pts:[`Education is not the same as selling — they happen at different stages`,`Close first — training and onboarding happen after commitment`,`The educational stall is one of the most expensive traps in sales`],
 quiz:[
  qq(`"Sell today, educate tomorrow" means:`,`Rush prospects into decisions before they're ready`,`Close the commitment first — then deliver training, education, and onboarding`,`Education is not the salesperson's job`,`Send educational content after every meeting`,1,`Sandler: education and onboarding happen AFTER the sale.`),
  qq(`"I just need one more webinar with them before they'll commit." Sandler says:`,`Smart pre-close preparation`,`A necessary step`,`The educational stall — using education as a substitute for asking for commitment`,`Required due diligence`,2,`Rule #21 identifies the educational stall. If genuinely interested, education comes after.`),
  qq(`The correct Sandler sequence is:`,`Educate → Present → Close`,`Present → Educate → Close`,`Qualify (find pain) → Close → Then educate and fulfill`,`Educate heavily → Then close`,2,`Find pain, close the deal, THEN deliver. Education is fulfillment, not a sales tool.`),
 ]},
{id:'r22',part:'p2',num:22,page:97,
 title:`Only Give a Presentation for the "Kill."`,
 msg:`"A presentation is not a tool for qualification — it's the final step before the close. If you're not ready to close, you're not ready to present." — Sandler`,
 pts:[`Presentations are for closing, not informing or generating interest`,`Only present when pain, budget, and decision process are fully qualified`,`A premature presentation is a performance with no payoff`],
 quiz:[
  qq(`When should you give a formal presentation?`,`At every first meeting to make a strong impression`,`When the prospect requests one`,`Only when pain, budget, and decision process are qualified and you're ready to close`,`After at least two discovery calls`,2,`The "kill" means present only when you're positioned to close.`),
  qq(`"Can you put together a presentation for my team?" without qualifying first means:`,`They're ready to buy`,`Prepare your best deck immediately`,`You may be preparing for an unqualified opportunity that will never close`,`Good internal momentum`,2,`Rule #22: qualify before accepting any presentation request.`),
  qq(`The purpose of a Sandler presentation is:`,`To showcase company capabilities`,`To inform and educate the prospect's team`,`To be the final step before closing a deal that's been fully qualified`,`To answer all remaining questions`,2,`The presentation is the closing ceremony, not the warm-up event.`),
 ]},
{id:'r23',part:'p2',num:23,page:100,
 title:`The Way to Get Rid of a Bomb Is to Defuse It Before It Blows Up.`,
 msg:`"Surface objections before they surface themselves. The skilled salesperson raises problems before the prospect does." — Sandler`,
 pts:[`Raise potential objections yourself before prospects can use them against you`,`Defused objections lose their power and surprise`,`Pre-empting concerns demonstrates confidence and credibility`],
 quiz:[
  qq(`The "bomb" in Rule #23 refers to:`,`A difficult competitor`,`An unaddressed objection that will derail the sale at the worst possible time`,`A problematic client`,`Negative online reviews`,1,`The bomb = the hidden objection. If undefused, it explodes right at the close.`),
  qq(`How does a Sandler salesperson "defuse" a potential objection?`,`Prepare strong rebuttals`,`Wait for the objection and handle it reactively`,`Proactively raise likely concerns yourself: "Some clients ask about X — have you thought about that?"`,`Avoid mentioning anything negative`,2,`When YOU raise it first, it loses its power and you demonstrate confidence.`),
  qq(`"I'll address concerns if they come up." Rule #23 says this approach:`,`Is the right way to handle objections`,`Is professional and respectful`,`Is reactive and allows bombs to go undefused — potentially destroying the close`,`Saves time during meetings`,2,`Reactive objection handling lets the bomb explode at the worst possible time.`),
 ]},
{id:'r24',part:'p2',num:24,page:103,
 title:`Product Knowledge Used at the Wrong Time Can Be Intimidating.`,
 msg:`"Don't overwhelm prospects with your expertise before they've told you what they actually need." — Sandler`,
 pts:[`Expertise shown too early intimidates rather than impresses`,`Product knowledge has a time and place — after discovery`,`Feature-dumping before discovery is a systematic violation of this rule`],
 quiz:[
  qq(`Product knowledge is dangerous when:`,`You don't know enough`,`Used before the prospect has shared their pain — it overwhelms instead of helps`,`Competitors know more`,`It's too technical`,1,`Before you know what they need, product knowledge is noise and intimidation.`),
  qq(`A new BDR launches into a detailed feature overview on every first call. Rule #24 says:`,`Great — it demonstrates expertise`,`Right way to build credibility`,`They're using product knowledge at the wrong time — it overwhelms before qualifying`,`Be even more detailed`,2,`Before discovery, a feature dump positions you as a pitch machine, not a problem-solver.`),
  qq(`Product knowledge should ideally be deployed:`,`At the beginning of calls to establish credibility`,`In your proposal document`,`AFTER uncovering the specific pain it solves — then expertise becomes directly relevant`,`In marketing materials only`,2,`Timing is everything. Same knowledge that overwhelms at minute 5 is powerful at minute 45.`),
 ]},
{id:'r25',part:'p2',num:25,page:106,
 title:`When You Want to Know the Future, Bring It Back to the Present.`,
 msg:`"Stop selling future benefits. Prospects make decisions based on present pain, not future possibilities." — Sandler`,
 pts:[`Decisions are made from present pain, not future vision`,`Future benefits create "I'll think about it" responses`,`Anchor every conversation to current, actively felt pain`],
 quiz:[
  qq(`Why do "future benefit" pitches often fail to close?`,`Prospects don't think long-term`,`Future benefits are too abstract to create present urgency — they don't hurt yet`,`They're not credible`,`They require too much explanation`,1,`Prospects decide from present pain. Future possibilities don't create urgency.`),
  qq(`"Bring it back to the present" means:`,`Schedule shorter meetings`,`Avoid discussing ROI`,`Anchor conversation to what's hurting them TODAY rather than what might improve in the future`,`Focus only on short-term wins`,2,`Buying decisions live in present pain, not future benefit.`),
  qq(`"We'll probably need something like this in about a year." Rule #25 says:`,`Great — add them to a nurture sequence`,`Future opportunities are equally valuable`,`Anchor: "What's happening TODAY that will still be a problem in 12 months?"`,`Send them your long-term roadmap`,2,`Rule #25: bring it back to the present. What's the ongoing cost of waiting?`),
 ]},
{id:'r26',part:'p2',num:26,page:110,
 title:`People Buy in Spite of the Hard Sell, Not Because of It.`,
 msg:`"Pressure doesn't create buyers — it creates resisters. Remove the pressure and the real prospect emerges." — Sandler`,
 pts:[`Pressure creates resistance, not commitment`,`Removing selling pressure actually builds trust and clarity`,`True buyers reveal themselves naturally without being pushed`],
 quiz:[
  qq(`High-pressure selling:`,`Closes more deals with motivated prospects`,`Creates resistance, not commitment — people buy despite pressure, not because of it`,`Is necessary in competitive markets`,`Works when prospects are close to deciding`,1,`Pressure creates resistance. Its removal creates real buyers.`),
  qq(`When you remove selling pressure from the process:`,`Prospects lose interest`,`Your close rate drops`,`Qualified prospects feel safe to make genuine decisions without psychological interference`,`Nothing changes`,2,`Without pressure, real buyers emerge and decide freely and clearly.`),
  qq(`Urgency tactics like "this offer expires Friday" — Rule #26 says:`,`Artificial urgency is a proven closer`,`Creates resistance and distrust that damages long-term relationships`,`Is standard and acceptable`,`All top salespeople use this`,1,`Hard sell creates resistance. Artificial urgency IS hard sell.`),
 ]},
{id:'r27',part:'p2',num:27,page:114,
 title:`You Can't Sell Anybody Anything – They Must Discover They Want It.`,
 msg:`"You cannot convince someone to want something. You can only create the conditions for them to discover they already want it." — Sandler`,
 pts:[`People buy what they discover they need, not what you sell them`,`Facilitate self-discovery through great, layered questions`,`Their aha moment belongs to them — you only create the conditions for it`],
 quiz:[
  qq(`What does Rule #27 mean for how you approach selling?`,`Stop selling and wait for buyers to come`,`Use emotional persuasion to overcome resistance`,`Ask questions that lead prospects to discover their own need — not convince them of yours`,`Focus entirely on product benefits`,2,`You can't sell anyone what they don't already have a reason to want.`),
  qq(`When a prospect articulates their own problem clearly, this is:`,`A sign they've already done research`,`A signal to jump to your solution`,`The most powerful moment in the sale — they've discovered their need in their own words`,`A common opening statement`,2,`When they sell themselves, no amount of your selling could match it.`),
  qq(`"I need to convince them they have a problem." Sandler says:`,`Great — that's the definition of sales`,`Right approach for unaware prospects`,`You cannot convince someone to have a problem — you can only help existing pain surface`,`Use case studies to prove the problem exists`,2,`If the problem doesn't exist or hurt enough, no convincing will work.`),
 ]},
{id:'r28',part:'p2',num:28,page:118,
 title:`When Under Attack – Fall Back.`,
 msg:`"When a prospect becomes aggressive or challenging, don't defend — retreat. Ask a question or use a third-party story." — Sandler`,
 pts:[`Defending against attacks triggers escalation and power struggles`,`Retreating with curiosity defuses aggression`,`Ask a question instead of arguing back`],
 quiz:[
  qq(`When a prospect aggressively challenges your pricing, the Sandler response is:`,`Defend your position firmly`,`Match their energy to show confidence`,`Fall back — use a question or story to defuse without defending`,`Offer a discount immediately`,2,`"Fall back" means retreat with curiosity: "Tell me more about that concern."`),
  qq(`"Fall back" reverses the typical sales instinct to:`,`Ask more questions`,`Listen more carefully`,`Defend and justify — which escalates conflict instead of resolving it`,`Use silence`,2,`Defending confirms the attack is worth defending against. Retreating shows confidence.`),
  qq(`"Your product is overpriced compared to the competition." The Sandler move is:`,`"We're very competitive — here's the breakdown..."`,`Offer an immediate discount`,`"Interesting — what were you seeing in terms of the comparison?"`,`Defend with an ROI calculator`,2,`Rule #28: fall back. Turn the attack into discovery.`),
 ]},
{id:'r29',part:'p2',num:29,page:122,
 title:`Your Meter's Always Running.`,
 msg:`"Time is your most precious resource. Every sales interaction has a cost — treat your time like a CEO treats cash." — Sandler`,
 pts:[`Your time has real dollar value — calculate it`,`Unqualified meetings are expensive, invisible losses`,`Track the ROI of every sales activity`],
 quiz:[
  qq(`"Your meter's always running" means:`,`Hurry every meeting`,`Time is money — every hour spent is an investment with a real opportunity cost`,`Track all calls in your CRM`,`Your commission accrues over time`,1,`If your time is worth $100/hr and you chase a dead deal for 10 hours, you lost $1,000.`),
  qq(`How does Rule #29 change how you qualify prospects?`,`It doesn't — spend time on every opportunity`,`Focus only on high-revenue prospects`,`Qualify quickly and ruthlessly — your time is too valuable for deals that won't close`,`Be more aggressive in pushing for decisions`,2,`When you truly feel the cost of your time, qualification becomes urgent.`),
  qq(`"Nurturing" a prospect for 6 months with no commitment — Rule #29 says:`,`Keep nurturing — relationships take time`,`Right approach for enterprise deals`,`This is likely a misuse of valuable time — qualify or close the file`,`Six months is standard for B2B`,2,`Rule #29 demands a meter check. What has 6 months of effort actually earned?`),
 ]},
{id:'r30',part:'p2',num:30,page:125,
 title:`You Can't Lose Anything You Don't Have.`,
 msg:`"You start every sales call at zero. You own nothing from the prospect until the contract is signed. Act accordingly." — Sandler`,
 pts:[`You own nothing until the contract is signed`,`This mindset eliminates desperate, fear-driven behavior`,`Start each call from zero — freedom from phantom deals`],
 quiz:[
  qq(`Rule #30 frees you from:`,`Paperwork`,`Fear of losing something you don't actually possess yet — which causes desperate selling`,`Competition`,`Long sales cycles`,1,`Nothing is owned until signed. This eliminates fear-driven decisions entirely.`),
  qq(`About to ask a tough qualifying question, you worry "I might lose the deal." Rule #30 says:`,`Wait until later to ask it`,`Soften the question`,`You can't lose a deal you don't have — ask it fully and without fear`,`Ask your manager first`,2,`If the deal isn't signed, there's nothing to lose. Ask the question.`),
  qq(`The practical benefit of a "zero baseline" mindset is:`,`You stop tracking deals in CRM`,`You become more aggressive`,`You make clearer, less fear-driven decisions — not protecting what you don't yet own`,`You close fewer deals`,2,`Operating from zero = freedom from phantom deal protection.`),
 ]},
{id:'r31',part:'p2',num:31,page:129,
 title:`Close the Sale or Close the File.`,
 msg:`"Don't let deals linger in your pipeline indefinitely. If it's not moving, it's dead — close it out and move on." — Sandler`,
 pts:[`Maybes rot your pipeline and drain mental energy`,`Drive to a decision — yes OR a clean no`,`Zombie deals are real and expensive; audit your pipeline regularly`],
 quiz:[
  qq(`"Close the file" means:`,`Archive for future outreach`,`Formally disqualify and remove a dead deal from your active pipeline to preserve time and energy`,`Give up on selling`,`Transfer to another rep`,1,`"Close the file" = making the active decision to stop investing in a dead deal.`),
  qq(`Why are "maybe" deals dangerous if left in the pipeline?`,`Hard to track in CRM`,`They never close regardless`,`They consume time, energy, and pipeline space that could go to real opportunities`,`They make your close rate look bad`,2,`Zombie deals drain everything. Every "maybe" week = a real opportunity week wasted.`),
  qq(`A deal has been "almost ready to close" for 4 months. Rule #31 says:`,`Keep nurturing — persistence pays`,`Enterprise deals take time`,`Drive to a decision — either close it or formally close the file and move on`,`Offer a bigger discount to force the close`,2,`4 months of "almost" = zombie deal. Force yes or no and honor whichever you get.`),
 ]},
{id:'r32',part:'p2',num:32,page:132,
 title:`Get an I.O.U. for Everything You Do.`,
 msg:`"Every favor, concession, and action you take for the prospect should be acknowledged and reciprocated — or you're doing it for free." — Sandler`,
 pts:[`Unreciprocated value is free consulting`,`Ask for something in return for every concession or action`,`Unearned value destroys your leverage and negotiating position`],
 quiz:[
  qq(`"Get an I.O.U. for everything you do" means:`,`Charge for every sales activity`,`For every action or concession, ask for an equivalent commitment in return`,`Keep financial records of your activity`,`Invoice for proposals`,1,`Every time you do something for the prospect, ask for something back.`),
  qq(`You offer a free proof-of-concept. Rule #32 says:`,`Always offer free POCs to show value`,`Charge for the POC`,`Ask for something in return: "If this meets your needs, we'd expect a decision within 30 days. Does that work?"`,`Keep it unconditional to build trust`,2,`Free POC has real value. Ask for a commitment in return.`),
  qq(`Consistently giving without receiving I.O.U.s causes:`,`Better relationships with prospects`,`More likely purchase decisions`,`An imbalanced dynamic where you've given all your leverage away`,`Faster deal cycles`,2,`Every unreciprocated gift is a withdrawal from your leverage account.`),
 ]},
{id:'r33',part:'p2',num:33,page:136,
 title:`On Your Way to the Bank, Keep One Eye Over Your Shoulder.`,
 msg:`"A deal isn't done until the money is in the bank. Stay vigilant — deals fall apart after the close more often than you'd think." — Sandler`,
 pts:[`Post-close is a critical and often completely ignored phase`,`Buyer's remorse and internal politics can undo signed deals`,`Stay attentive post-close without buying back the deal`],
 quiz:[
  qq(`"Keep one eye over your shoulder" after closing means:`,`Be suspicious of your new client`,`Watch for competitors trying to unsell your deal`,`Remain vigilant — the deal isn't fully secure until delivered and the client is satisfied`,`Make sure your team follows through`,2,`Deals fall apart post-close more than salespeople admit. Vigilance is required.`),
  qq(`How is Rule #33 different from Rule #6 (don't buy back)?`,`They're the same rule`,`Rule #33 is about staying alert to post-close risks while Rule #6 warns against re-selling — vigilance vs. action`,`Rule #33 overrides Rule #6`,`Only Rule #6 applies post-close`,1,`Rule #6 = stop selling (don't reopen doubt). Rule #33 = monitor for deal killers.`),
  qq(`New client goes quiet 2 weeks after signing. Rule #33 says:`,`Give them space — they're busy implementing`,`Send a check-in assuming everything is fine`,`Proactively reach out to confirm — silence post-close can be a serious warning sign`,`Wait for them to contact you`,2,`Post-close silence can mean buyer's remorse or an unknown problem. Check in.`),
 ]},
/* PART THREE */
{id:'r34',part:'p3',num:34,page:140,
 title:`Work Smart, Not Hard.`,
 msg:`"Activity without strategy is just motion. The professional focuses effort where it creates the highest return." — Sandler`,
 pts:[`Efficiency beats raw effort every time`,`Target the right prospects, not just more prospects`,`A strategic hour beats three unfocused hours`],
 quiz:[
  qq(`"Work smart, not hard" in a Sandler context means:`,`Do less work overall`,`Focus effort on high-probability, high-value activities rather than maximum volume`,`Let technology do the work`,`Hire more support staff`,1,`Smart work = directing effort toward the highest-return activities.`),
  qq(`Spending 80% of time on small accounts that rarely close — Rule #34 says:`,`Small accounts build pipeline confidence`,`Volume is the key to success`,`Poor use of time — reallocate effort to higher-probability, higher-value accounts`,`Keep going until close rates improve`,2,`Rule #34 demands an ROI analysis of how you spend your time.`),
  qq(`Smart work in the Sandler system starts with:`,`Better cold email templates`,`A defined Ideal Client Profile that focuses prospecting on the most likely buyers`,`More meetings`,`Higher call volume`,1,`You can't work smart without knowing WHO to target. ICP first.`),
 ]},
{id:'r35',part:'p3',num:35,page:144,
 title:`If Your Competition Does It, Stop Doing It Right Away.`,
 msg:`"If everyone in your industry uses the same tactics, those tactics have lost their power. Differentiation is your greatest competitive weapon." — Sandler`,
 pts:[`Doing what everyone does makes you invisible to the prospect`,`Differentiation creates genuine competitive advantage`,`Industry-standard tactics are expected — and therefore ignored`],
 quiz:[
  qq(`Why does Sandler say to stop doing what competitors do?`,`To avoid legal issues`,`When everyone uses the same tactics, prospects tune them out — differentiation creates advantage`,`Competition is irrelevant in sales`,`To confuse your competitors`,1,`Matching competitors = becoming invisible. Contrast creates attention and engagement.`),
  qq(`All competitors are sending "value proposition" cold emails. Rule #35 suggests:`,`Match the format and improve the copy`,`Volume matters — keep sending`,`Stop. Find a completely different approach that creates genuine contrast`,`Wait for marketing to redesign`,2,`The prospect's inbox is full of these. Do something completely different.`),
  qq(`Differentiation in the Sandler context means:`,`Having the best product`,`Being the most persistent follow-up artist`,`Deliberately creating contrast in your approach compared to how every other salesperson shows up`,`Offering the lowest price`,2,`Differentiation is HOW you sell, not just WHAT you sell.`),
 ]},
{id:'r36',part:'p3',num:36,page:147,
 title:`Only Decision Makers Can Get Others to Make Decisions.`,
 msg:`"A champion who isn't the decision maker cannot get the decision made for you. Find the economic buyer." — Sandler`,
 pts:[`Champions and Decision Makers are not the same person`,`Only the person with real authority can drive a final decision`,`Map the decision process before investing in a full qualification effort`],
 quiz:[
  qq(`The core warning of Rule #36 is:`,`Always sell to the CEO`,`Your champion cannot get the decision made if they lack decision-making authority`,`Multiple stakeholders slow deals`,`Never sell to committees`,1,`A champion can advocate but cannot decide. Only the economic buyer can.`),
  qq(`You've been selling to a director for 3 months. They love the product. Rule #36 says:`,`Continue — they'll evangelize upward`,`Close the deal now before others get involved`,`Determine whether they have final decision authority — if not, engage the economic buyer directly`,`Ask them to handle all communications`,2,`A supportive director is valuable, but Rule #36 requires knowing: can they sign?`),
  qq(`The "economic buyer" is:`,`Always the CFO`,`The person who uses your product daily`,`The person with true budget authority and final decision power`,`Your main contact person`,2,`Economic buyer = the one who can say yes when everyone else says no.`),
 ]},
{id:'r37',part:'p3',num:37,page:151,
 title:`All Prospects Lie, All the Time.`,
 msg:`"Prospects rarely tell you the whole truth, especially early. It's not personal — it's self-protection." — Sandler`,
 pts:[`Prospects lie to protect themselves from sales pressure`,`The Up-Front Contract creates conditions for honesty`,`Expect initial deflection — design your process to work through it`],
 quiz:[
  qq(`Why do prospects lie, according to Rule #37?`,`They're inherently dishonest`,`They enjoy misleading salespeople`,`They're protecting themselves from pressure — it's a defense mechanism, not a character flaw`,`They're testing you`,2,`Rule #37 isn't cynical. Lying is self-protection. Design the process to counter it.`),
  qq(`"I'll think about it" almost always means:`,`They need 24 hours to decide`,`They're genuinely considering it seriously`,`A soft no delivered politely to avoid direct confrontation`,`They want to see your competitors first`,2,`"I'll think about it" = the prospect's most common soft no.`),
  qq(`The Sandler tool for creating conditions where prospects tell the truth is:`,`Building more rapport before asking hard questions`,`Offering better pricing to lower their guard`,`The Up-Front Contract — establishing a safe, honest environment at the start of every interaction`,`Asking more direct and aggressive questions`,2,`The UFC says at the outset: "I'd like a yes or a real no — not a maybe."`),
 ]},
{id:'r38',part:'p3',num:38,page:154,
 title:`The Problem the Prospect Brings You Is Never the Real Problem.`,
 msg:`"The problem they present is the symptom. The real problem — the one that drives decisions and budget — lies beneath it." — Sandler`,
 pts:[`Surface problems are symptoms, not root causes`,`The real pain has financial, career, or organizational stakes`,`Ask "How long? What have you tried? What happened?" to go deeper`],
 quiz:[
  qq(`"We need better reporting." According to Rule #38, this is:`,`The actual problem to solve`,`Enough information to propose a solution`,`A symptom — the real problem lies beneath and requires deeper discovery to surface`,`The starting point for your proposal`,2,`Never stop at the presenting problem. Dig to the consequence beneath it.`),
  qq(`The Sandler "pain funnel" helps by:`,`Speeding up the discovery process`,`Layering questions from surface to depth — "How long? What have you tried? What did it cost?" — revealing the real pain`,`Creating urgency around pricing`,`Replacing discovery with a repeatable script`,1,`The pain funnel takes you from symptom to consequence — where real buying decisions happen.`),
  qq(`Prospect mentions their CRM doesn't integrate with email. The Sandler move is:`,`Pitch your integration feature immediately`,`Confirm you can solve the integration problem`,`Ask: "How long has this been an issue? What has the impact been? What have you tried?"`,`Suggest they might need a full CRM replacement`,2,`Rule #38: dig. The integration gap is the door. The real pain is what's behind it.`),
 ]},
{id:'r39',part:'p3',num:39,page:158,
 title:`When All Else Fails, Become a Consultant.`,
 msg:`"When the deal is stalling and selling isn't working, shift to advising. It often creates more genuine buying intent than any sales technique." — Sandler`,
 pts:[`Advisor mode creates more trust than sales mode`,`When stuck, share expertise freely and observe the response`,`The consultative shift often re-engages stalled deals`],
 quiz:[
  qq(`Shifting to "consultant mode" during a stalled deal means:`,`Charging for your advisory time`,`Reframing as an advisor — sharing expertise without pushing toward a sale`,`Reducing pressure by slowing down your outreach`,`Offering to do a free needs assessment`,1,`Consultant mode: "I'm here to help you think, not sell you right now."`),
  qq(`The most powerful Sandler question from Rule #39 when a deal stalls is:`,`"When are you planning to make a decision?"`,`"What would need to be true for this to move forward?"`,`"Are you speaking with our competitors?"`,`"What's your budget for this?"`,1,`"What would need to be true?" is open, non-pressuring, and gets them to set conditions.`),
  qq(`Prospects often trust consultants more than salespeople because:`,`Consultants have more technical expertise`,`Consultants have better credentials`,`In consultant mode, you appear to have the prospect's interests at heart rather than a quota`,2,`The moment you stop "selling," the prospect relaxes. That energy shift is worth more than any technique.`),
 ]},
{id:'r40',part:'p3',num:40,page:162,
 title:`Fake It 'Til You Make It.`,
 msg:`"Confidence is a skill. Act confident before you feel it, and the feelings will follow the actions." — Sandler`,
 pts:[`Confidence precedes competence in sales performance`,`Act as the professional you intend to become`,`The brain catches up to the behavior — science supports this`],
 quiz:[
  qq(`"Fake it 'til you make it" professionally means:`,`Lie to prospects about your capabilities`,`Act with professional confidence before you naturally feel it — behavior shapes mindset`,`Pretend you're from a bigger company`,`Use borrowed testimonials as your own`,1,`Rule #40: act the part before you've perfected it. Confidence develops through deliberate action.`),
  qq(`How does acting confident BEFORE feeling it help a salesperson?`,`It doesn't — prospects detect inauthenticity`,`The brain cannot tell the difference between performed and genuine confidence — both rewire behavior`,`It only works in early career`,`It only works in low-stakes situations`,1,`Behavioral psychology: acting confident fires the same neural patterns as feeling confident.`),
  qq(`Rule #40 is NOT permission to:`,`Act professionally before you feel completely ready`,`Project confidence you're still developing`,`Lie about product capabilities or experience to prospects`,`Perform at a level above your current comfort zone`,2,`"Fake it" applies to mindset and confidence. Never to facts, capabilities, or experience.`),
 ]},
{id:'r41',part:'p3',num:41,page:165,
 title:`There Are No Bad Prospects – Only Bad Salespeople.`,
 msg:`"Every time you blame the prospect for a lost deal, you forfeit the lesson. The professional looks inward first." — Sandler`,
 pts:[`Accountability over blame is the professional differentiator`,`Every lost deal has a lesson for the salesperson`,`The system works when you work the system`],
 quiz:[
  qq(`The core principle of Rule #41 is:`,`All prospects have equal potential to buy`,`Prospects are never at fault for a lost deal`,`When a deal fails, the professional examines their own process before blaming the prospect`,`You should qualify even harder`,2,`Radical accountability: every lost deal has a lesson. Own it and mine it for growth.`),
  qq(`Lost a deal: "That prospect was never serious." Sandler's Rule #41 response is:`,`"Agreed — some prospects aren't worth your time"`,`"How did you identify them as serious, and what signs did you miss that they weren't?"`,`"Right — move on and find better prospects"`,`"Write it up in your CRM notes"`,1,`Rule #41: ask what YOU did to create this outcome. Never skip that question.`),
  qq(`"Bad salespeople" in Rule #41 refers to salespeople who:`,`Are dishonest with prospects`,`Have low energy`,`Blame prospects for lost deals instead of examining their own process and execution`,`Don't know their product well enough`,2,`"Bad" = refusing accountability. The blame narrative protects the ego and kills growth.`),
 ]},
{id:'r42',part:'p3',num:42,page:168,
 title:`A Winner Has Alternatives, a Loser Puts All His Eggs in One Basket.`,
 msg:`"The salesperson with alternatives is powerful. The one desperate for a single deal will make every mistake in the book." — Sandler`,
 pts:[`Desperation poisons deals — alternatives prevent it`,`A full pipeline is the antidote to one-deal thinking`,`Alternatives give you negotiating power and professional dignity`],
 quiz:[
  qq(`What competitive advantage do "alternatives" give a salesperson?`,`More options to choose from`,`The ability to walk away — which paradoxically makes prospects more interested in staying`,`Less work per deal`,`Better pricing leverage`,1,`With alternatives, you can qualify harder, ask tougher questions, and walk away from bad deals.`),
  qq(`Telling a prospect "you're our biggest opportunity this quarter" — Rule #42 says:`,`Great — it shows you value their business`,`Builds relationship trust`,`Serious error — it signals desperation and shifts all negotiating power to the prospect`,`Fine as long as it's true`,2,`Revealing you're dependent on this deal puts the prospect in complete control.`),
  qq(`The fundamental solution to putting all eggs in one basket is:`,`Having a backup product line`,`Working exclusively with small deals`,`Maintaining a consistently full pipeline — multiple qualified opportunities at all times`,`Negotiating multiple contracts simultaneously`,2,`A full pipeline means no single deal can make or break you.`),
 ]},
{id:'r43',part:'p3',num:43,page:171,
 title:`You Don't Learn How to Win by Getting a "Yes" – You Learn How to Win by Getting a "No."`,
 msg:`"A 'yes' confirms what you're doing. A 'no' teaches you what to fix. The professional actively seeks the 'no' because it contains the lesson." — Sandler`,
 pts:[`Yeses confirm; nos teach — and teach with precision`,`Actively going for the no is a professional skill`,`Each no contains the exact data you need to improve`],
 quiz:[
  qq(`Why do you learn more from a "no" than a "yes"?`,`Nos are more common`,`A yes confirms what worked; a no reveals exactly where your process broke down`,`Yeses are just luck`,`Nos lead to better referrals`,1,`A yes can happen for reasons you don't fully understand. A no always has a specific cause.`),
  qq(`Going for the "no" is powerful because:`,`It's a psychological trick that reverses resistance`,`It removes the ambiguity of "maybe" and either closes the deal or delivers a lesson`,`It's disrespectful to the prospect's intelligence`,`It only works with experienced salespeople`,1,`A clean no is better than an indefinite maybe. Learn from it, move on, grow.`),
  qq(`After a prospect declines to move forward, the Sandler move is:`,`Send a final offer`,`Accept graciously and give up`,`Ask "Would you share what made this not the right fit? I want to learn from it."`,`Schedule a follow-up for next quarter`,2,`The no contains the lesson. Asking for post-rejection feedback is among the most valuable activities.`),
 ]},
{id:'r44',part:'p3',num:44,page:174,
 title:`When Your Foot Hurts, You're Probably Standing on Your Own Toe.`,
 msg:`"When deals aren't going well, the honest salesperson looks at themselves first. Most sales problems are self-created." — Sandler`,
 pts:[`Most sales problems are self-created through system violations`,`Self-sabotage is the most common deal-killer`,`Examine your own behavior before blaming the market`],
 quiz:[
  qq(`"Standing on your own toe" means:`,`Being overly aggressive in negotiations`,`Accidentally hurting a client relationship`,`Creating your own sales problems through your behavior, mindset, or poor execution of the system`,`Having poor time management`,2,`The foot hurts because YOU'RE standing on it. Most problems are self-inflicted.`),
  qq(`Common ways salespeople "stand on their own toe" include:`,`Having a bad territory`,`Operating in a difficult economy`,`Skipping qualification, pitching too early, buying back deals, avoiding tough questions`,`Having a weak product`,2,`Rule #44 checklist: are you following the system? Where exactly are you violating it?`),
  qq(`"The market is too competitive." Rule #44's response is:`,`"Yes — markets are challenging right now"`,`"Perhaps you need a different territory"`,`"Let's look at your process first — what does your qualification look like?"`,`"Try different messaging"`,2,`Before blaming the market, examine your process. That's almost always where the answer is.`),
 ]},
{id:'r45',part:'p3',num:45,page:177,
 title:`Express Your Feelings Through Third-Party Stories.`,
 msg:`"When you need to communicate a sensitive point, do it through a story about someone else. The message lands without the defensiveness." — Sandler`,
 pts:[`Direct confrontation triggers defensiveness and shutdown`,`Third-party stories deliver the message without triggering defense mechanisms`,`The "I had a client who..." technique is powerful and disarming`],
 quiz:[
  qq(`Why are third-party stories more effective for sensitive topics?`,`They're more entertaining`,`They communicate a concern without making the prospect feel directly challenged or accused`,`They're more credible than direct statements`,`They demonstrate your experience`,1,`Same message, zero defensiveness. The story does the work the direct statement can't.`),
  qq(`Prospect is about to sign with a competitor who has a poor track record. Rule #45 says:`,`Directly criticize the competitor's record`,`Say nothing — let them make their own decision`,`"I had a client in a similar situation who chose that provider — want to know what happened?"`,`Send them the competitor's negative reviews`,2,`The third-party story delivers the same warning without creating any defensiveness.`),
  qq(`Third-party stories work because:`,`Stories are universally relatable`,`They're easier for prospects to remember`,`Prospects see themselves in the story and draw their own conclusions — which are more powerful than yours`,`Prospects prefer narrative to data`,2,`Their own conclusion is infinitely more credible than any direct argument you could make.`),
 ]},
{id:'r46',part:'p3',num:46,page:180,
 title:`There Is No Such Thing as a Good Try.`,
 msg:`"In professional selling, there is no credit for effort. Results are the only currency." — Sandler`,
 pts:[`Trying without achieving is not success in professional selling`,`The professional measures themselves by outcomes, not intentions`,`Remove "I tried" from your sales vocabulary entirely`],
 quiz:[
  qq(`Rule #46 establishes what about effort in professional selling?`,`Effort should be the primary metric`,`Consistent effort leads to eventual success`,`In professional selling, effort without results is not a success — only outcomes count`,`Trying hard is the foundation of professional character`,2,`"Good try" = a polite way to say it didn't work. Own that and fix it.`),
  qq(`"I really tried with that account — I called them 20 times." Rule #46 says:`,`"Twenty calls shows great commitment!"`,`"The result is what matters — did the deal close? If not, examine what those 20 calls were accomplishing."`,`"That's dedication — keep it up"`,`"Try 20 more times"`,1,`20 unproductive calls is not success. It's 20 opportunities to examine what wasn't working.`),
  qq(`"There is no such thing as a good try" is ultimately about:`,`Being harsh on yourself after failures`,`Only celebrating large wins`,`Personal accountability — owning the gap between effort and results and closing it with better execution`,`Measuring only revenue`,2,`Rule #46: own the gap. "Good try" is self-forgiveness without the self-examination that enables growth.`),
 ]},
{id:'r47',part:'p3',num:47,page:184,
 title:`Selling Is a Broadway Play Performed by a Psychiatrist.`,
 msg:`"The professional salesperson is simultaneously a skilled performer and a student of human psychology — always deliberate, never accidental." — Sandler`,
 pts:[`Every word, pause, and behavior is deliberate — nothing is accidental`,`Understand Transactional Analysis to manage every interaction`,`The professional is always "on" — in full command of their performance`],
 quiz:[
  qq(`Two roles the professional salesperson plays simultaneously:`,`Manager and subordinate`,`Teacher and student`,`Broadway performer (skilled, deliberate) and psychiatrist (studying human psychology in real time)`,`Neither — salespeople are just communicators`,2,`Rule #47 = intentionality + psychological fluency. Both, always, simultaneously.`),
  qq(`The "Broadway" element of Rule #47 means:`,`Be theatrical and dramatic in presentations`,`Make your interactions more entertaining`,`Every element — words, pauses, tone, body language — is deliberate and practiced, never accidental`,`Memorize your scripts word for word`,2,`"Broadway" = full professional intentionality. Nothing in a sales call happens by accident.`),
  qq(`The "psychiatrist" element of Rule #47 means:`,`Psychoanalyze prospects to manipulate them`,`Study Freud before every call`,`Understand the psychological dynamics — ego states, emotional drivers, defenses — and respond strategically`,`Charge for your mental expertise`,2,`Transactional Analysis, emotional triggers, defense mechanisms — the psychiatrist uses these skillfully.`),
 ]},
{id:'r48',part:'p3',num:48,page:188,
 title:`A Life Without Risk Is a Life Without Growth.`,
 msg:`"The salesperson who never risks rejection, never asks the hard question, never has the difficult conversation — will also never grow." — Sandler`,
 pts:[`Risk is the price of growth — no risk, no development`,`Avoiding difficult conversations stunts your professional development`,`Comfort zone = stagnation zone`],
 quiz:[
  qq(`How does Rule #48 apply to daily selling behavior?`,`Take more financial risks`,`Work in riskier industries`,`Risk asking the hard qualifying question, the direct close, the difficult conversation — without these, you cap your growth`,`Take all risks that come your way`,2,`Every avoided risk is a ceiling on your development as a professional.`),
  qq(`A salesperson avoids asking about budget because "it might offend." Rule #48 says:`,`"That's reasonable — find a gentle way to ask"`,`"The risk outweighs the reward"`,`"This risk avoidance costs you more than the risk itself — the unasked question will derail the deal later"`,`"Add it to your follow-up email instead"`,2,`Every avoided sales risk becomes a future problem. Not asking = delayed disqualification.`),
  qq(`The professional salesperson's relationship with risk should be:`,`Avoid it whenever possible to protect relationships`,`Accept it reluctantly when forced`,`Embrace calculated risk as the primary vehicle for growth — the right risks, taken deliberately, are how performance improves`,`Take all risks aggressively`,2,`Calculated, professional risk: hard questions, direct closes, honest "I'm not sure we're the right fit."`),
 ]},
{id:'r49',part:'p3',num:49,page:191,
 title:`Leave Your Child in the Car.`,
 msg:`"Your emotional reactions — excitement, hurt, defensiveness, fear — belong outside the sales call. Walk in as the professional Adult ego state." — Sandler`,
 pts:[`Transactional Analysis: Adult, Parent, and Child ego states`,`The Child ego state derails professional selling`,`Respond from Adult mode: calm, curious, and logical at all times`],
 quiz:[
  qq(`The "Child" ego state in Transactional Analysis refers to:`,`Childlike enthusiasm — a good selling quality`,`Immature negotiating tactics`,`The part of you that reacts emotionally — defensiveness when challenged, over-excitement when interested, fear when the deal is at risk`,`Inexperienced salespeople`,2,`Child = your emotional reaction center. Left unchecked in a sales call, it kills deals.`),
  qq(`"Leaving your child in the car" is critical because:`,`Children are physically distracting`,`Emotion makes you unpredictable`,`Your emotional reactions are the most likely source of sale-killing mistakes — defensiveness, over-excitement, people-pleasing`,`None of these`,2,`When the Child runs your call, you violate Rules #2, #28, and #1 almost simultaneously.`),
  qq(`The correct ego state for professional sales interactions is:`,`Parent — authoritative and directive`,`Child — enthusiastic and energetic`,`Adult — calm, curious, logical, focused on problem-solving without emotional interference`,`A blend of all three equally`,2,`The Adult is the foundation of the Sandler system. Calm, curious, non-reactive, focused.`),
 ]},
];

const ASSESSMENTS={
  p1:{title:`Part One Assessment: Core Concepts`,passing:0.75,questions:[
    qq(`What term does Sandler use for limiting beliefs that sabotage salespeople?`,`Cold feet`,`Imposter syndrome`,`Head Trash`,`Ego blocks`,2,`Head Trash = limiting beliefs preventing fearless execution of the system.`),
    qq(`"Spilling your candy in the lobby" means:`,`Being unprepared`,`Giving your full pitch before qualifying — becoming free consulting`,`Revealing pricing`,`Sharing testimonials`,1,`Never pitch before qualifying. You become free consulting for someone who may never buy.`),
    qq(`The primary tool for eliminating mutual mystification is:`,`Detailed proposals`,`Longer follow-up emails`,`The Up-Front Contract — clear shared expectations at the start of every interaction`,`A signed NDA`,2,`The UFC defines purpose, agenda, and expected outcome — eliminating false assumptions.`),
    qq(`Rule #4 says a decision not to decide is:`,`Neutral — prospects need time`,`Often a soft no disguised as a future commitment`,`Acceptable in long cycles`,`Smart — never rush`,1,`Indecision IS a decision. The professional surfaces whether it's actually a no.`),
    qq(`Why should you never answer an unasked question?`,`It wastes valuable time`,`It's disrespectful`,`It creates objections the prospect never would have raised on their own`,`It makes you seem unprepared`,2,`Volunteered information hands the prospect new ammunition they didn't have before.`),
    qq(`"Buying back" a closed deal means:`,`Offering a post-close discount`,`Re-pitching or over-reassuring after the close, reintroducing doubt`,`Following up on implementation`,`Sending a thank-you note`,1,`Buying back = selling after the close. It reopens doubt and can un-sell the deal.`),
    qq(`The Sandler ego state for every sales interaction is:`,`Parent — authoritative`,`Child — enthusiastic`,`Adult — calm, curious, and logical`,`Whichever feels natural`,2,`The Adult ego state enables professional, non-reactive selling.`),
    qq(`Part One covers rules 1 through 6, titled:`,`Execute — Do what works`,`Course-Correct`,`Learn the Core Concepts`,`The Foundation`,2,`Part One: Learn the Core Concepts. Use the first six rules to transform your selling process.`),
  ]},
  p2:{title:`Part Two Assessment: Execute`,passing:0.75,questions:[
    qq(`Rule #7: about prospecting, you never have to _____ it, you just have to _____ it.`,`Understand / master`,`Like / do`,`Love / schedule`,`Enjoy / track`,1,`You don't have to like prospecting. Consistent action is the only non-negotiable.`),
    qq(`Rule #8: the ONE goal of a prospecting call is:`,`Qualify their budget`,`Present top features`,`Secure an appointment — nothing more`,`Close the deal`,2,`Rule #8: go for the appointment only. Don't sell, pitch, or fully qualify on a cold call.`),
    qq(`Rule #14: if your prospect is mostly listening, you are:`,`Building great rapport`,`Running a strong presentation`,`Presenting too much — the prospect should be doing 70% of the talking`,`Doing well — keep going`,2,`A listening prospect is disengaged. Shift immediately to asking questions.`),
    qq(`Rule #16: instead of asking for the order, you should:`,`Send a proposal and wait`,`Use proven closing techniques`,`Guide the process so the prospect commits naturally as the next logical step`,`Be transparent about needing the business`,2,`The close is the inevitable result of thorough qualification — not a moment you force.`),
    qq(`Rule #22: only give a presentation when:`,`Every first meeting`,`The prospect requests one`,`Pain, budget, and decision process are qualified and you're ready to close`,`After two discovery calls`,2,`Presentations are for closing, not for informing or generating interest.`),
    qq(`Rule #23: "defusing the bomb" means:`,`Avoiding all potential objections`,`Waiting to handle objections reactively`,`Proactively surfacing likely concerns yourself before the prospect can use them`,`Using strong rebuttals`,2,`When YOU raise the objection first, it loses power. You demonstrate confidence.`),
    qq(`Rule #31: "close the file" means:`,`File a proposal and wait`,`Delete the contact`,`Formally disqualify and remove the dead deal from your active pipeline`,`Archive for future outreach`,2,`Zombie deals drain time and energy. Close the file — stop investing in dead deals.`),
    qq(`Rule #32: "get an I.O.U. for everything you do" means:`,`Invoice for all activities`,`For every action or concession, ask for an equivalent commitment in return`,`Track time spent on each prospect`,`Never give anything for free`,1,`Unreciprocated value is free consulting. Every action deserves a commitment in return.`),
  ]},
  p3:{title:`Part Three Assessment: Course-Correct`,passing:0.75,questions:[
    qq(`Rule #35: if your competition does it, you should:`,`Do it better`,`Match and exceed their approach`,`Stop immediately — differentiation creates competitive advantage`,`Study it carefully first`,2,`When everyone uses the same tactics, prospects tune them out. Contrast creates attention.`),
    qq(`Rule #37: "All prospects lie, all the time." The correct design response is:`,`Become more aggressive`,`Be deeply suspicious`,`Build around honesty through the Up-Front Contract — structure, not suspicion`,`Accept you can't change it`,2,`Prospects lie to protect themselves. Create the conditions (UFC) where honesty is easier.`),
    qq(`Rule #38: the problem a prospect brings you is:`,`Usually the actual problem`,`The most important issue`,`Always a surface symptom — the real pain lies deeper with financial stakes`,`Your starting point for a proposal`,2,`Never stop at the presenting problem. Dig to the consequence beneath it.`),
    qq(`Rule #41: "No bad prospects, only bad salespeople" is about:`,`Qualifying harder`,`Being more positive`,`Taking radical personal accountability — examining your own process when deals fail`,`Treating all prospects equally`,2,`Radical accountability: every lost deal has a lesson for the salesperson. Own it.`),
    qq(`Rule #43: you learn how to win by getting a:`,`"Yes" — confirms what works`,`"Maybe" — keeps the deal alive`,`"No" — tells you exactly where your process broke down`,`"I'll think about it"`,2,`A yes confirms; a no teaches with precision. Seek clean nos for the lessons they contain.`),
    qq(`Rule #45: third-party stories work because:`,`Stories are universal`,`They're easier to remember`,`They deliver the message without triggering the prospect's defensive reactions`,`Prospects prefer narrative`,2,`"I had a client who..." lands without defensiveness. Same message, zero resistance.`),
    qq(`Rule #47: the "Broadway" element means:`,`Be theatrical`,`Make presentations entertaining`,`Every word, pause, and behavior is deliberate and practiced — nothing accidental`,`Memorize scripts`,2,`"Broadway" = full professional intentionality. Nothing in a sales call is accidental.`),
    qq(`Part Three's subtitle is:`,`"Do what works"`,`"Remind yourself of what's easy to forget"`,`"Learn the Core Concepts"`,`"The Advanced Rules"`,1,`Part Three: Course-Correct. Remind yourself of what's easy to forget.`),
  ]},
};

const FINAL_EXAM=[
  qq(`What is "Head Trash" in Sandler's framework?`,`Disorganized CRM data`,`Negative limiting beliefs that sabotage a salesperson's performance`,`A bad prospect list`,`Poor note-taking`,1,`Head Trash = the limiting beliefs preventing fearless execution of the system.`),
  qq(`"Don't spill your candy" warns against:`,`Being unprepared`,`Premature pitching before qualifying — giving away value before earning the right`,`Sharing pricing too late`,`Being too slow to present`,1,`Never pitch before qualifying. You give expertise away for free to someone who may never buy.`),
  qq(`A decision not to make a decision is:`,`Reasonable — decisions take time`,`Neutral — no impact on the sale`,`A decision — usually a soft no that must be surfaced`,`Always a signal to nurture more`,2,`Indecision IS a decision. The professional surfaces it rather than accepting "maybe."`)  ,
  qq(`When prospecting, your primary goal is:`,`Present product benefits`,`Qualify the prospect's budget`,`Secure the appointment — nothing more`,`Close the deal on first contact`,2,`Rule #8: go for the appointment only. Everything else violates the process.`),
  qq(`Every unsuccessful prospecting call earns:`,`Lessons to avoid`,`Compound interest — building skills and pipeline toward future results`,`Nothing — move on`,`Feedback to document`,1,`Every call builds skills, plants seeds, and moves you toward success.`),
  qq(`"Answer every question with a question" is about:`,`Stalling for time`,`Appearing more intelligent`,`Staying in control and uncovering what's really behind the question`,`Being difficult`,2,`Answering with a question keeps you in discovery mode.`),
  qq(`"The best presentation you'll ever give, the prospect will never see" means:`,`Only present over email`,`Discovery led the prospect to commit before a formal presentation was needed`,`Great presentations are invisible`,`Demos beat decks`,1,`Rule #15: thorough discovery can make the formal presentation entirely unnecessary.`),
  qq(`"Never ask for the order" — instead:`,`Ask three times`,`Guide the process so commitment emerges naturally as the next logical step`,`Use assumptive techniques`,`Ask your manager`,1,`The close is the inevitable result of the system executed properly.`),
  qq(`Only give a presentation for the "kill" means:`,`Be aggressive`,`Present early to build interest`,`Only present when the deal is fully qualified and you're positioned to close`,`Present after the first discovery call`,2,`Presentations are for closing. If the deal isn't close-ready, don't present.`),
  qq(`"Close the sale or close the file" means:`,`Always push for immediate close`,`Patience and persistence are key`,`Drive to a decision — close the deal or formally disqualify and move on`,`Never close a file`,2,`Rule #31: zombie deals drain resources. Force a yes or no and honor the result.`),
  qq(`"All prospects lie, all the time" — the correct response is:`,`Trust nothing`,`Become more aggressive`,`Design for honesty through the Up-Front Contract — structure, not suspicion`,`Verify everything independently`,2,`Prospects lie to protect themselves. Create safe conditions (UFC) for honesty.`),
  qq(`"The problem the prospect brings you is never the real problem" means:`,`Ignore the presenting problem`,`Start with your features`,`The presenting problem is a symptom — the real pain lies deeper with financial stakes`,`Never solve the stated problem`,2,`Rule #38: dig past the symptom to the consequence. Real buying decisions happen there.`),
  qq(`"No bad prospects, only bad salespeople" is primarily about:`,`Qualifying harder`,`Being more positive`,`Taking radical personal accountability — examining your own process when deals fail`,`Treating all prospects equally`,2,`Rule #41: every lost deal has a lesson for the salesperson. Own it and mine it.`),
  qq(`You learn to win by getting a:`,`"Yes"`,`"Maybe"`,`"No" — it tells you exactly where your process broke down`,`"I'll think about it"`,2,`Yeses confirm; nos teach with precision. Seek clean nos for the lessons they contain.`),
  qq(`"Selling is a Broadway play performed by a psychiatrist." The psychiatrist element means:`,`Charge for your time`,`Study body language only`,`Understand psychological dynamics — ego states, drivers, defenses — and respond strategically`,`Get a psychology degree`,2,`TA, emotional triggers, and defense mechanisms are all psychiatrist tools.`),
  qq(`Part One covers rules:`,`1 through 12`,`1 through 10`,`1 through 14`,`1 through 6 — "Learn the Core Concepts"`,3,`Part One: Learn the Core Concepts. The first six rules transform your selling process.`),
  qq(`Part Two is subtitled:`,`"Course-Correct"`,`"Execute — Do what works"`,`"Learn the Core Concepts"`,`"The Foundation"`,1,`Part Two: Execute. Do what works. Covers Rules 7 through 33.`),
  qq(`"When your foot hurts, you're probably standing on your own toe" refers to:`,`Physical discomfort`,`Poor call posture`,`Most sales problems are self-created — examine your own behavior first`,`Wearing the wrong shoes`,2,`Rule #44: before blaming the market or prospects, examine your own process.`),
  qq(`The Up-Front Contract accomplishes:`,`Legal protection`,`A binding commitment`,`Mutual clarity on purpose, agenda, and expected outcome — eliminating mutual mystification`,`A formal opening to meetings`,2,`The UFC prevents mystification and creates conditions for an honest conversation.`),
  qq(`The final rule, Rule #49, is:`,`"You have to learn to fail, to win"`,`"Work smart, not hard"`,`"Leave your child in the car" — operate from the Adult ego state in every interaction`,`"A life without risk is a life without growth"`,2,`Rule #49: Leave your child in the car. Walk into every call as the calm, professional Adult.`),
];

/* APPLY IT TODAY — 49 specific BDR action prompts */
const AT={
  r01:`On your next call, ask one qualifying question you've been avoiding. Your only goal: ask it. Let go of the outcome.`,
  r02:`Before your next demo request, ask three discovery questions first. Don't pitch until you know what matters to them.`,
  r03:`Start your next meeting: "Here's my agenda, and I'd love a yes or a real no at the end. Fair?" Then hold to it.`,
  r04:`Next time a prospect says "let me think about it" — ask: "Help me understand — is that a soft no?" Surface the truth.`,
  r05:`Notice every piece of information you volunteer today that nobody asked for. Tomorrow, stop volunteering each one.`,
  r06:`After your next close, write one thing you will NOT do in the next 48 hours. Honor the close. Implement, don't re-sell.`,
  r07:`Block 45 minutes tomorrow morning for prospecting. Put it in your calendar right now. Show up regardless of how you feel.`,
  r08:`On your next cold call, your only goal: earn the right to a meeting. Nothing else. One ask: "Can we get 20 minutes?"`,
  r09:`Make 5 prospecting calls today. Let every "no" feel like a deposit in your pipeline compounding account.`,
  r10:`Set a phone reminder at 10am and 2pm: "Is there a prospect in the room right now?" Build the awareness muscle.`,
  r11:`Write 3 ideal-fit credit repair agencies you haven't called because you assumed no budget. Call one today.`,
  r12:`Next time a prospect asks "How much?" — try: "What were you expecting to invest?" BEFORE you answer.`,
  r13:`On your next call, catch yourself every time you assume you know what the prospect means. Ask instead. Track how often you assume.`,
  r14:`Set a 2-minute talk-time awareness. If you're still talking when it goes off, stop and ask a question.`,
  r15:`On your next discovery call, your goal: zero presentations. Ask questions only. Let the prospect sell themselves.`,
  r16:`Remove "So, do you want to move forward?" from your vocabulary entirely. The fully-qualified close should be inevitable.`,
  r17:`Identify one technique that worked for you accidentally last month. Practice it deliberately on your next 3 calls.`,
  r18:`On your next call, before you speak — ask: "What specifically did they ask for?" Give only that. Nothing extra.`,
  r19:`Notice every exit line you give today. ("I know you're busy...", "Just real quick...") Eliminate each one. You have value.`,
  r20:`End of day, one question only: "How much revenue did today's activity generate or move toward?" That's your scorecard.`,
  r21:`Next time you're tempted to educate before closing — stop. Ask for the commitment first. Educate after they're in.`,
  r22:`Before your next presentation: confirm pain, budget, and decision process are FULLY qualified. If not, don't present yet.`,
  r23:`Identify your top 3 objections you hear from credit repair agencies. Raise each one yourself in your next 3 calls.`,
  r24:`On your next call, hold back your product knowledge until they reveal a specific pain it solves. Then deploy it.`,
  r25:`When a prospect goes vague ("maybe someday") — anchor them: "What's happening TODAY that makes this relevant right now?"`,
  r26:`On your next call, practice not needing it. Qualify hard. Be willing to walk away. Notice how the dynamic shifts.`,
  r27:`On your next discovery call, ask 5 open questions in a row without presenting anything. Let them discover their own need.`,
  r28:`Next time a prospect challenges you — don't defend. Try: "That's interesting — tell me more about that."`,
  r29:`Before your next meeting, calculate: at your target earnings, what is one hour of your time worth? Act accordingly.`,
  r30:`Before your next call, say: "I own nothing until it's signed. I have nothing to lose by asking hard questions."`,
  r31:`Audit your CRM today. Find deals with no clear next steps after 60+ days. Close each file. Free the pipeline.`,
  r32:`On your next call where you offer value (time, info, demo) — ask for a concrete commitment in return. Track the exchange.`,
  r33:`After your next close, identify one post-deal risk and one action you'll take to prevent it. Stay vigilant 90 days out.`,
  r34:`Identify the ONE activity in your day that generates the most qualified pipeline. Protect that block. Cut everything else.`,
  r35:`Identify three things every BDR in your space does on cold calls. Choose one. Do something completely different instead.`,
  r36:`On your next deal, map who has actual budget authority. If it's not your contact, build a plan to reach that person.`,
  r37:`On your next call, after any prospect statement — ask: "Help me understand what you mean by that." Never assume full truth.`,
  r38:`On your next call, when a prospect names a problem — ask: "How long has this been an issue? What have you tried?"`,
  r39:`On your next stalled deal, drop the pitch. Say: "I want to give you honest advice here. What are you actually trying to solve?"`,
  r40:`Before your next call, act confident regardless of how you feel. Stand up. Voice strong. Ask the hard questions. It's practice.`,
  r41:`After your next lost deal, write 3 things you'd do differently at each stage. Own every decision. Extract the lesson.`,
  r42:`Count your active qualified opportunities today. Fewer than 10? Block 90 minutes for prospecting. Full pipeline = fearless selling.`,
  r43:`On your next 3 calls, actively seek a clean no. Ask: "Is this genuinely the right fit for you right now?"`,
  r44:`When your pipeline slows — ask: "Where exactly am I violating the Sandler system?" Audit your last 5 calls specifically.`,
  r45:`The next time you need to deliver a hard truth, prepare the story: "I had a client once who..." Practice it before the call.`,
  r46:`At end of day, write: what was my goal? Did I achieve it? If not, what specifically will I change tomorrow?`,
  r47:`Tomorrow, record one of your sales calls. Listen back. What was deliberate? What was accidental? Make it all intentional.`,
  r48:`Identify one sales risk you've been avoiding. Commit to taking it on your next call. Growth lives on the other side.`,
  r49:`Before your next call, close your eyes for 30 seconds. Say: "I'm leaving my emotional reactions here. I enter as the Adult."`,
};

const HOOKS={
  r01:`Fear is the enemy of the system. Being willing to fail is what removes it.`,
  r02:`Discovery before disclosure. Every word before qualifying is wasted leverage.`,
  r03:`If it's unclear, it's not agreed. The UFC kills ambiguity before it kills the deal.`,
  r04:`Indecision IS a decision. Surface the hidden no — it belongs in the open.`,
  r05:`Every unasked question becomes a new objection gift-wrapped for the prospect.`,
  r06:`The close is a full stop, not a comma. Stop selling.`,
  r07:`You don't have to love it. You have to do it. Every single day.`,
  r08:`One call, one goal: the meeting. Nothing else belongs on that call.`,
  r09:`Each no is a deposit. Your pipeline compounds interest over time.`,
  r10:`The best prospects aren't always where you're looking. Look everywhere.`,
  r11:`Money exists. The system finds it. Scarcity is a mindset, not a market.`,
  r12:`Questions give control. Always ask before answering. Always.`,
  r13:`Assume nothing. Ask and confirm. Your assumptions cost you real deals.`,
  r14:`If they're mostly listening, you're mostly failing. Get them talking.`,
  r15:`Discovery so complete that presenting becomes unnecessary. That's the goal.`,
  r16:`The system closes. You just follow it. Asking for the order is begging.`,
  r17:`What worked accidentally in year one must work deliberately in year five.`,
  r18:`Their picture. Their vision. Your job: amplify it — never add to it.`,
  r19:`Exit lines are gifts to the prospect. Keep your gifts to yourself.`,
  r20:`Activity doesn't pay bills. Revenue does. The bank only accepts results.`,
  r21:`Close the deal, then educate. Reverse the sequence and you'll lose both.`,
  r22:`Present only when you're positioned to close. Not a moment sooner.`,
  r23:`Surface the bomb yourself. Before the prospect detonates it at close.`,
  r24:`Your expertise overwhelms without context. It impresses only after discovery.`,
  r25:`Future benefits don't hurt yet. Present pain does. Stay in the present.`,
  r26:`The harder you sell, the harder they resist. Remove pressure. Watch them decide.`,
  r27:`You can't install a need. You can only excavate one that's already there.`,
  r28:`Defending is losing. Retreating with a question is winning.`,
  r29:`Unqualified meetings are invisible theft. Your time has a real dollar value.`,
  r30:`You own nothing until it's signed. Fear nothing until you actually have it.`,
  r31:`Yes or no. Anything else is pipeline pollution costing real opportunity.`,
  r32:`Every action is a withdrawal. Get a commitment back. Balance the ledger.`,
  r33:`Vigilance after the close is not optional. Deals die post-signature too.`,
  r34:`One strategic call beats three scattered ones. Protect your highest-yield hours.`,
  r35:`The moment competitors copy a tactic, it becomes invisible. Move first.`,
  r36:`Your champion advocates. Only the decision maker decides. Know the difference.`,
  r37:`Prospects lie to survive pressure. Remove the pressure — honesty follows.`,
  r38:`The symptom gets you in the door. The root pain gets you the deal.`,
  r39:`When selling stops working, stop selling. Start advising. Watch it change.`,
  r40:`Confidence is performed before it is felt. Act first. Feelings always follow.`,
  r41:`You're the only variable you fully control. Start there, every time.`,
  r42:`With alternatives you negotiate. Without them you plead. Fill the pipeline.`,
  r43:`A yes confirms what you did right. A no tells you what to fix. Chase both.`,
  r44:`When everything feels broken, check who's standing where. Usually it's you.`,
  r45:`Direct confrontation triggers walls. Third-party stories walk right through them.`,
  r46:`"I tried" is the most expensive phrase in sales. Only results count.`,
  r47:`Every word is a choice. Every pause is deliberate. Nothing is accidental.`,
  r48:`Comfort is the absence of growth. Every avoided risk installs a new ceiling.`,
  r49:`Your emotional reactions belong outside the room. The Adult walks in alone.`,
};

function useSpeech(){
  const [on,setOn]=useState(false);
  const [paused,setPaused]=useState(false);
  const [rate,setRate]=useState(1);
  const [voices,setVoices]=useState([]);
  const [voiceURI,setVoiceURI]=useState(null);
  const rateRef=useRef(1);
  const voiceRef=useRef(null);
  const tok=useRef(0);
  const lastText=useRef("");
  const speakingRef=useRef(false);
  const ok=typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
  const rank=v=>{
    const n=(v.name||"").toLowerCase();const lang=(v.lang||"").toLowerCase();let s=0;
    if(/natural|neural/.test(n))s+=120;
    if(/google/.test(n))s+=90;
    if(/\b(samantha|ava|allison|zoe|evan|nicky|aaron|joelle|noelle|serena|jenny|aria|guy)\b/.test(n))s+=80;
    if(/enhanced|premium/.test(n))s+=70;
    if(/siri/.test(n))s+=60;
    if(/microsoft/.test(n))s+=30;
    if(/en[-_]us/.test(lang))s+=25;else if(/en[-_]gb/.test(lang))s+=12;
    if(/compact|eloquence|novelty/.test(n))s-=80;
    return s;
  };
  useEffect(()=>{
    if(!ok)return;
    const load=()=>{
      const all=window.speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang||""));
      if(!all.length)return;
      const sorted=[...all].sort((a,b)=>rank(b)-rank(a));
      setVoices(sorted);
      setVoiceURI(prev=>{
        if(prev&&sorted.some(v=>v.voiceURI===prev))return prev;
        voiceRef.current=sorted[0]||null;return sorted[0]?.voiceURI||null;
      });
    };
    load();
    try{window.speechSynthesis.onvoiceschanged=load;}catch{}
    return()=>{try{window.speechSynthesis.cancel();}catch{}};
  },[ok]);
  useEffect(()=>{voiceRef.current=voices.find(v=>v.voiceURI===voiceURI)||voiceRef.current||null;},[voiceURI,voices]);
  const clean=t=>String(t||"").replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/[—–]/g,", ").replace(/\s+/g," ").trim();
  const speak=text=>{
    if(!ok)return;
    try{
      window.speechSynthesis.cancel();
      lastText.current=text;
      const parts=(clean(text).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[clean(text)]).map(s=>s.trim()).filter(Boolean);
      const my=++tok.current;let i=0;
      speakingRef.current=true;setOn(true);setPaused(false);
      const next=()=>{
        if(my!==tok.current)return;
        if(i>=parts.length){speakingRef.current=false;setOn(false);setPaused(false);return;}
        const u=new SpeechSynthesisUtterance(parts[i]);
        if(voiceRef.current)u.voice=voiceRef.current;
        u.lang=voiceRef.current?.lang||"en-US";u.rate=rateRef.current;u.pitch=1;
        u.onend=()=>{if(my!==tok.current)return;i++;next();};
        u.onerror=()=>{if(my!==tok.current)return;speakingRef.current=false;setOn(false);setPaused(false);};
        window.speechSynthesis.speak(u);
      };
      next();
    }catch(e){console.warn("TTS:",e);}
  };
  const pause=()=>{try{window.speechSynthesis.pause();setPaused(true);}catch{}};
  const resume=()=>{try{window.speechSynthesis.resume();setPaused(false);}catch{}};
  const stop=()=>{tok.current++;try{window.speechSynthesis.cancel();}catch{}speakingRef.current=false;setOn(false);setPaused(false);};
  const changeRate=r=>{rateRef.current=r;setRate(r);if(speakingRef.current)speak(lastText.current);};
  const changeVoice=uri=>{setVoiceURI(uri);voiceRef.current=voices.find(v=>v.voiceURI===uri)||null;if(speakingRef.current)speak(lastText.current);};
  return{on,paused,rate,voices,voiceURI,speak,pause,resume,stop,changeRate,changeVoice,ok};
}

const voiceLabel=v=>{let n=(v?.name||"Voice").split("(")[0].replace(/\s*-\s*english.*/i,"").trim();return n.length>20?n.slice(0,20)+"…":(n||"Voice");};
const countSentences=t=>String(t||"").split(/[.!?]+/).map(s=>s.trim()).filter(s=>/[a-z]{3,}/i.test(s)).length;
// Strips fabricated attribution + wrapping quotes from rule headline statements so nothing is presented as a direct quote of a real person.
const principle=s=>String(s||"").replace(/\s*[—–-]\s*(David\s+H\.?\s+Mattson|David\s+Sandler|D\.?\s*Sandler|Sandler)\s*\.?\s*$/i,"").replace(/^[\s"“”'']+|[\s"“”'']+$/g,"").trim();

const AudioControls=({text,color=C.navy,label="Listen to this lesson",compact=false})=>{
  const sp=useSpeech();
  const [openV,setOpenV]=useState(false);
  const RATES=[{v:.85,l:"0.85×"},{v:1,l:"1×"},{v:1.15,l:"1.15×"},{v:1.4,l:"1.4×"}];
  if(!sp.ok)return null;
  if(countSentences(text)<=3)return null;
  const toggle=()=>{if(!sp.on)sp.speak(text);else if(sp.paused)sp.resume();else sp.pause();};
  if(compact)return(
    <button onClick={e=>{e.stopPropagation();toggle();}} title={sp.on?"Stop":"Listen aloud"}
      style={{background:"none",border:"none",cursor:"pointer",fontSize:16,
        color:sp.on?color:C.faint,padding:"0 3px",verticalAlign:"middle",
        display:"inline-flex",alignItems:"center",flexShrink:0}}>
      {sp.on&&!sp.paused?"⏸":sp.on&&sp.paused?"▶":"🔊"}
    </button>
  );
  const cur=sp.voices.find(v=>v.voiceURI===sp.voiceURI);
  return(
    <div style={{borderRadius:12,background:`${color}0b`,border:`1px solid ${color}2a`,marginBottom:10,overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",flexWrap:"wrap"}}>
        <button onClick={toggle} style={{width:40,height:40,borderRadius:"50%",
          background:sp.on?color:`${color}18`,border:`2px solid ${color}`,
          color:sp.on?"#fff":color,fontSize:18,cursor:"pointer",flexShrink:0,
          display:"flex",alignItems:"center",justifyContent:"center",
          transition:"all .2s",boxShadow:sp.on?`0 0 14px ${color}55`:"none"}}>
          {sp.on&&!sp.paused?"⏸":sp.on&&sp.paused?"▶":"🔊"}
        </button>
        {sp.on&&<button onClick={sp.stop} style={{width:32,height:32,borderRadius:"50%",
          background:"none",border:`1px solid ${color}44`,color:C.muted,fontSize:14,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>⏹</button>}
        <div style={{flex:1,minWidth:70,fontSize:12,fontWeight:600,color:sp.on?color:C.muted,lineHeight:1.3}}>
          {sp.on&&!sp.paused?"Reading aloud…":sp.on&&sp.paused?"Paused — tap play":label}
        </div>
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {RATES.map(r=>(
            <button key={r.v} onClick={()=>sp.changeRate(r.v)}
              style={{padding:"3px 7px",borderRadius:5,border:`1px solid ${sp.rate===r.v?color:C.border}`,
                background:sp.rate===r.v?`${color}22`:"transparent",
                fontSize:10,cursor:"pointer",fontWeight:700,color:sp.rate===r.v?color:C.muted}}>{r.l}</button>
          ))}
        </div>
        {sp.voices.length>1&&(
          <button onClick={()=>setOpenV(o=>!o)} title="Change voice"
            style={{padding:"5px 10px",borderRadius:7,border:`1px solid ${color}44`,
              background:openV?`${color}18`:"transparent",cursor:"pointer",fontSize:11,fontWeight:700,
              color,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            🗣 {cur?voiceLabel(cur):"Voice"} <span style={{fontSize:9,opacity:.7}}>{openV?"▲":"▼"}</span>
          </button>
        )}
      </div>
      {openV&&sp.voices.length>1&&(
        <div style={{borderTop:`1px solid ${color}22`,background:"#fff",padding:8,
          display:"flex",flexDirection:"column",gap:4,maxHeight:190,overflowY:"auto"}}>
          <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:1,padding:"2px 6px"}}>CHOOSE A VOICE</div>
          {sp.voices.slice(0,14).map(v=>{
            const active=v.voiceURI===sp.voiceURI;
            return(
              <button key={v.voiceURI} onClick={()=>sp.changeVoice(v.voiceURI)}
                style={{textAlign:"left",padding:"7px 10px",borderRadius:7,cursor:"pointer",
                  border:`1px solid ${active?color:C.borderL}`,background:active?`${color}12`:"#fff",
                  fontSize:12,fontWeight:active?700:500,color:active?color:C.mid,
                  display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v.name}</span>
                {active&&<span style={{fontSize:11}}>✓</span>}
              </button>
            );
          })}
          <div style={{fontSize:10,color:C.faint,padding:"3px 6px",lineHeight:1.4}}>Voices come from your device. The most realistic ones appear on Chrome, Edge, and Safari.</div>
        </div>
      )}
    </div>
  );
};

/* ── BDR SCRIPTS — exact language for ConsumerDirect calls ── */
const SCRIPTS={
r01:`"My goal on this call isn't to get a yes — it's to find out if there's a real fit. If SmartCredit isn't right for your agency right now, I'll tell you directly."`,
r02:`"Before I tell you what we do, can I ask — what's the biggest thing slowing down your agency's client acquisition right now?"`,
r03:`"Who else would be involved in a decision like this, and what would need to happen on this call for it to be worth your time?"`,
r04:`"You mentioned deciding in Q3. What's the cost to your agency of running without this tool for another 90 days?"`,
r05:`"Great question — before I quote anything, I want to make sure the number makes sense for your volume. How many active clients do you work with monthly?"`,
r06:`"Perfect. Let's get your onboarding call scheduled. The platform works best when your team starts using it immediately."`,
r07:`"Block Tuesday and Thursday 9–11 AM in your calendar right now as non-negotiable call blocks. Don't wait to feel ready."`,
r08:`"I'd love to show you exactly how this works for a credit repair agency your size. Can we put 30 minutes on the calendar this week?"`,
r09:`"Picture your advisors pulling up a client's credit score during the consultation call in real time. What would that do for your close rate?"`,
r10:`"What happens to a client whose score doesn't improve within your contract window? What does that cost your agency in renewals?"`,
r11:`"I want to make sure I actually understand your situation — can you walk me through exactly how a new client comes on board today?"`,
r12:`"Before we go too far, I want to be straightforward — what kind of budget does your agency typically set aside for client acquisition tools?"`,
r13:`"That's a great technical question. The best way I can answer it properly is to see how it applies to your specific setup — can we schedule 20 minutes?"`,
r14:`"What would need to happen for you to feel confident moving forward with something like this?"`,
r15:`"Just so we use our time well — if after this call you feel it's the right fit, what would the next step look like on your end?"`,
r16:`"I know you prefer email — totally fine. I'll send the overview and then schedule a quick call to walk through your specific questions."`,
r17:`"I can walk away from any call without anxiety. Every call is just a conversation — the goal is clarity, not persuasion."`,
r18:`"Instead of 'just following up,' try: 'Last we spoke you mentioned [specific pain]. Has that changed?'"`,
r19:`"If the agency owner isn't on this call, this call doesn't count toward a decision. Can we get them on a 15-minute call this week?"`,
r20:`"Every call follows the same structure: pain, impact, budget, authority, timeline. Know yours cold before you dial."`,
r21:`"I want to be direct — is this the kind of investment your agency would actually pull the trigger on if it made sense financially?"`,
r22:`"They said they loved it? Great — now ask: 'What would it take to move forward?' before you get excited about a deal that doesn't exist yet."`,
r23:`"'That's totally fair. What specifically are you thinking about? If it's something I can address right now, let's do it. If not, let's call it.'"`,
r24:`"Most credit repair agencies I work with are dealing with client acquisition costs above $200 per sign-up. Is that a challenge for you as well?"`,
r25:`"Before your next cold call, take 30 seconds to remind yourself: I am the expert here. My time is as valuable as theirs."`,
r26:`"When they push back, respond with a question: 'That's interesting — what would have to change for that not to be a concern?'"`,
r27:`"'On a scale of 1–10, where are you on moving forward — and what would make it a 10?'"`,
r28:`"My team needs a decision by [date] to get you onboarded before Q[X]. Is that realistic on your end?"`,
r29:`"Take yourself out of the outcome. Your job is to find out if there's a deal — not to manufacture one."`,
r30:`"Pull up your activity log right now. Did you execute your cookbook this week — or just react to whatever came up?"`,
r31:`"Most agencies that look at this budget somewhere between $400–$1,200 per month. Where does your agency typically land for tools like this?"`,
r32:`"When a prospect cancels last-minute, respond: 'Totally understand — would [new date] work, or should we reconnect next quarter?'"`,
r33:`"Within 5 minutes of every call: one thing that went well, one thing to improve, and exactly what happens next. Log it."`,
r34:`"'Last time we spoke, you mentioned [specific pain]. Has that gotten better or worse since then?'"`,
r35:`"'Since we last talked, has the urgency around [problem] changed at all — or is it still on the back burner?'"`,
r36:`"'That's not something we offer today — and I'd rather tell you now than waste your time. Is that a dealbreaker, or can we work around it?'"`,
r37:`"Before a hard call, write down: what's the worst realistic outcome? It's a 'no' — and that's completely fine."`,
r38:`"Send the recap email within the hour and include the next step: 'Based on our call, here's what I'd suggest we do next…'"`,
r39:`"For every deal open more than 30 days without activity — either add a concrete next step or close it out today."`,
r40:`"For every lost deal, write one line: what was the real reason, and what specifically could have changed it?"`,
r41:`"Walk into every call knowing: their name, agency size, one specific pain you researched, and one clear goal for the call."`,
r42:`"At close: 'Who in your network runs a similar agency that might also benefit from this tool?'"`,
r43:`"Start every call: 'How's business been lately?' Just being human builds more trust than any feature list."`,
r44:`"'Compared to what? What are you currently paying for [alternative] and what results are you actually getting?'"`,
r45:`"Close every other tab when you dial. Your prospect can hear when you're distracted — it will cost you the deal."`,
r46:`"Read one sales article or listen to one podcast per week. After 90 days you'll be visibly sharper than peers who stopped learning."`,
r47:`"After 10 days of silence: 'Hi [name], still trying to connect — worth a quick 10 minutes this week or should we touch base next quarter?'"`,
r48:`"If the demo doesn't land, what's your secondary goal? Getting a specific pain articulated? A referral? Know it before you dial."`,
r49:`"The prospect who just snapped at you is having a bad day. It has nothing to do with you. Stay calm. Be the professional in the room."`
};

/* ── COMMON MISTAKES — what most BDRs do wrong ────────────── */
const MISTAKES={
r01:`Most BDRs pitch relentlessly because they fear hearing no — making every call emotionally loaded and exhausting.`,
r02:`Most BDRs launch into a full product overview before asking a single qualifying question.`,
r03:`Most BDRs leave calls saying "I think it went well" without confirming any concrete next step.`,
r04:`Most BDRs celebrate "maybes" and nurture deals that were dead weeks ago, wasting pipeline capacity.`,
r05:`Most BDRs answer "what does it cost?" on the first call before establishing value or qualifying fit.`,
r06:`Most BDRs send a congratulatory email that re-pitches the product after the close — reopening doubt they already resolved.`,
r07:`Most BDRs prospect only when their pipeline is dry, creating wild feast-and-famine swings every 60–90 days.`,
r08:`Most BDRs try to explain the full product on a cold call instead of securing just the meeting.`,
r09:`Most BDRs describe features ("we have a score simulator") instead of painting the prospect's improved future.`,
r10:`Most BDRs surface problems but never quantify the cost — leaving pain abstract rather than financially urgent.`,
r11:`Most BDRs rush to demonstrate expertise instead of letting prospects fully reveal their actual situation.`,
r12:`Most BDRs avoid the money conversation until they've invested hours in someone who can't or won't buy.`,
r13:`Most BDRs answer detailed technical questions during prospecting — becoming free consultants for non-buyers.`,
r14:`Most BDRs propose solutions before prospects have fully expressed their own pain and desired outcome in their own words.`,
r15:`Most BDRs start calls without establishing what success looks like — leaving "next steps" vague and optional.`,
r16:`Most BDRs fight communication preferences instead of adapting, causing prospects to disengage quietly.`,
r17:`Most BDRs act as if losing any single deal is catastrophic — creating desperate energy that prospects feel immediately.`,
r18:`Most BDRs use generic "just following up" messages that add zero value and train prospects to ignore future outreach.`,
r19:`Most BDRs spend hours pitching to people who cannot say yes — then wonder why their pipeline produces no revenue.`,
r20:`Most BDRs improvise their process and get inconsistent results — unable to diagnose what went wrong or replicate what worked.`,
r21:`Most BDRs discover whether a prospect qualifies only after investing hours — instead of deciding early with deliberate questions.`,
r22:`Most BDRs celebrate enthusiasm before confirming actual buying intent — then crash when deals fall apart at the finish line.`,
r23:`Most BDRs accept "I need to think about it" and follow up weekly for months, hoping the answer changes on its own.`,
r24:`Most BDRs act grateful for the meeting — unconsciously positioning themselves below the prospect instead of as a peer.`,
r25:`Most BDRs let a rejection at 9 AM tank their energy for the next three calls — letting one moment define their whole day.`,
r26:`Most BDRs respond to objections with justifications and pressure, which creates defensiveness and destroys trust.`,
r27:`Most BDRs convince themselves "they seemed interested" without ever confirming actual buying intent with a direct question.`,
r28:`Most BDRs assume prospects understand the timeline and process — never explicitly setting expectations or deadlines.`,
r29:`Most BDRs are so focused on hitting quota that they unconsciously push prospects toward decisions they're not ready for.`,
r30:`Most BDRs only review their activity when results are bad — instead of consistently tracking to identify patterns and improve.`,
r31:`Most BDRs avoid the money conversation until proposal stage, then get blindsided by budget objections that were always there.`,
r32:`Most BDRs react emotionally to cancellations, ghosting, and no-shows — interpreting them as personal rejection.`,
r33:`Most BDRs rush to the next call without reviewing what just happened — repeating the same mistakes indefinitely.`,
r34:`Most BDRs use generic re-engagement messages instead of referencing the specific pain discussed in the original conversation.`,
r35:`Most BDRs accept "nothing has changed" without probing whether the urgency around the original problem has shifted.`,
r36:`Most BDRs oversell capabilities the platform doesn't have — then lose trust permanently when the truth surfaces.`,
r37:`Most BDRs let the pressure of a difficult prospect or a bad week cloud their judgment on subsequent calls the same day.`,
r38:`Most BDRs let deal momentum die between calls by delaying follow-ups, leaving proposals unscheduled and next steps vague.`,
r39:`Most BDRs avoid cleaning their pipeline because marking deals as lost feels like admitting personal failure.`,
r40:`Most BDRs attribute lost deals to factors outside their control — price, timing, competition — avoiding honest self-examination.`,
r41:`Most BDRs make calls without a clear objective, hoping something useful will emerge — and getting aimless, forgettable conversations.`,
r42:`Most BDRs forget to ask for referrals at peak satisfaction — the 5 minutes right after a successful close or smooth onboarding.`,
r43:`Most BDRs jump straight to business, treating every call as transactional — and missing the human connection that accelerates trust.`,
r44:`Most BDRs accept price objections at face value and immediately discount, rather than exploring what the objection is really about.`,
r45:`Most BDRs half-listen during calls — checking email or updating the CRM — and miss critical buying signals from prospects.`,
r46:`Most BDRs stop investing in their skills after onboarding, falling further behind peers who treat learning as a daily practice.`,
r47:`Most BDRs give up after 2–3 follow-up attempts, walking away from prospects who simply needed more time or a different trigger.`,
r48:`Most BDRs define success only as "closing" — and have no recovery plan when the primary goal isn't achieved.`,
r49:`Most BDRs take a difficult prospect's mood personally, losing professional composure at exactly the moment it matters most.`
};

/* WHY IT WORKS — instant, concise lesson body (≈2 sentences each) */
const WHY={
r01:`Fear of "no" makes you cling to deals and skip the hard questions — which is exactly what loses them. Accept that a no is a fine outcome and you'll execute the system cleanly.`,
r02:`Information given before qualifying has zero leverage — you've spent your value on someone who hasn't earned it. Hold your insight until you know their pain; then it lands with weight.`,
r03:`Both sides leave "aligned" but actually confused, and the deal quietly dies. An Up-Front Contract — purpose, agenda, outcome — set at the top of every call kills that ambiguity.`,
r04:`"Maybe later" feels safe but it's usually a no in disguise, and it rots your pipeline for weeks. A non-decision IS a decision — surface it and make them own it.`,
r05:`Volunteered information hands the prospect objections they never had. Ask what they actually need to know before you answer anything.`,
r06:`After a yes, more selling reopens the doubt you just closed. Stop selling, confirm next steps, and move to delivery.`,
r07:`Motivation follows action, not the reverse — waiting to "feel like it" creates feast-or-famine. Book the blocks and dial regardless of mood.`,
r08:`A cold call can't carry discovery or a close — trying makes you spill candy and lose the meeting. One goal: earn the 20 minutes.`,
r09:`Every call builds skill and plants a seed, even the ones that miss today. "Call me in six months" is an asset, not a waste.`,
r10:`Top reps see opportunity everywhere because they've trained the radar, not because they pitch harder. Keep it on, stay human, never force it.`,
r11:`Scarcity thinking creates desperation, discounting, and bad calls. The budget exists for problems that hurt enough — your job is the system that finds them.`,
r12:`Whoever asks the questions steers the conversation. Answering "how much?" with "what were you expecting to invest?" keeps you in discovery and reveals the real concern.`,
r13:`Assuming what a prospect thinks means you handle the wrong problem and miss the real one. When you don't know, ask — "what are you thinking right now?"`,
r14:`If they're quiet, you're presenting, not discovering — and a passive prospect doesn't buy. Aim for them talking roughly 70% of the time.`,
r15:`Done right, discovery makes the prospect sell themselves, so the formal pitch becomes unnecessary. Ask, don't tell.`,
r16:`"So, do you want it?" hands all the power to them and positions you as begging. Guide the process so committing is simply the next logical step.`,
r17:`Beginners win by accident through honesty and curiosity; pros engineer those same moves deliberately. Name what worked and repeat it on purpose.`,
r18:`Adding features they never asked for forces them to evaluate something new — which creates doubt, not excitement. Amplify their picture; don't add to it.`,
r19:`"I know you're busy, I'll let you go" is a gift that ends the meeting for them. You believe the meeting has value, so don't apologize for it.`,
r20:`Activity and warm feelings don't pay — revenue does. Measure yourself by what closed, not by how many meetings happened.`,
r21:`Endless "one more demo" is the educational stall masquerading as progress. Get the commitment first; education is fulfillment, not a sales tool.`,
r22:`A presentation is the closing ceremony, not a discovery tool. Only present when pain, budget, and decision process are confirmed and you're ready to close.`,
r23:`An objection you ignore detonates at the worst moment — the close. Raise the likely concern yourself first; it loses its power and builds your credibility.`,
r24:`Expertise dumped before discovery overwhelms instead of impresses. The same knowledge that buries them at minute 5 wins at minute 45 — after you know the pain.`,
r25:`Future benefits don't hurt yet, so they don't drive decisions. Anchor to what's costing them today — that's where urgency lives.`,
r26:`Pressure manufactures resistance, not commitment. Remove it and the real buyer steps forward and decides freely.`,
r27:`You can't install a need that isn't there — you can only excavate one that is. Ask the questions that let them reach the "aha" themselves.`,
r28:`Defending confirms the attack was worth defending; it escalates. Retreat with curiosity — "tell me more about that" — and the heat drops.`,
r29:`Your time has a real dollar value, and unqualified meetings are invisible theft. Qualify fast and protect the hours that produce pipeline.`,
r30:`You own nothing until it's signed, so there's nothing to lose by asking the hard question. That mindset kills desperation.`,
r31:`Zombie "maybes" drain time and energy that real deals deserve. Drive every deal to a yes or a clean no, then honor it.`,
r32:`Value you give without a commitment in return is free consulting that bleeds your leverage. Trade every concession for something back.`,
r33:`Signed isn't safe — remorse and internal politics kill deals after the close. Stay alert and check in, without re-selling.`,
r34:`Effort without targeting is just motion. Define your ideal client and pour your hours where the probability and value are highest.`,
r35:`When every rep uses the same move, prospects tune it out. Differentiation in how you show up is your real advantage.`,
r36:`A champion can advocate but can't sign; months spent on someone without authority stalls the deal. Map who actually decides early.`,
r37:`Prospects withhold the truth to protect themselves from pressure — it's defense, not character. The Up-Front Contract creates the safety that lets honesty out.`,
r38:`The problem they name is the symptom; the real pain — with financial stakes — sits beneath it. "How long? What have you tried? What's it costing you?" gets you there.`,
r39:`When selling stalls, advising re-engages — people trust a consultant more than a closer. Drop the pitch and ask what they're really trying to solve.`,
r40:`Confidence is a behavior before it's a feeling; act it and the feeling follows. This applies to mindset only — never to facts or capabilities.`,
r41:`Blaming the prospect forfeits the lesson in every lost deal. Look at your own process first — it's the only variable you control.`,
r42:`One make-or-break deal breeds desperation that prospects feel instantly. A full pipeline lets you qualify hard and walk away — which makes you more attractive.`,
r43:`A yes confirms; a no tells you exactly where the process broke. Seek the clean no and mine it for the lesson.`,
r44:`Most sales problems are self-inflicted through system violations, not the market. When it hurts, check your own footing first.`,
r45:`A direct warning triggers walls; "I had a client who…" walks right through them. They draw their own conclusion — far more powerful than yours.`,
r46:`Professional selling gives no credit for effort — only results count. Drop "I tried" and close the gap between effort and outcome.`,
r47:`The pro is deliberate in every word and pause (Broadway) and fluent in buyer psychology (psychiatrist). Nothing in your call should happen by accident.`,
r48:`Every hard question you avoid becomes a future problem and a ceiling on your growth. Take the calculated risk — that's where development lives.`,
r49:`Your emotional reactions — defensiveness, over-excitement, fear — cause most sale-killing mistakes. Walk in as the calm, curious Adult and leave the rest outside.`,
};

/* TRAPS — per-question coaching: why a wrong pick is tempting but off (matches each rule's 3 questions in order) */
const TRAPS={
r01:[`Cold feet and call reluctance are real, but they're surface symptoms — Sandler's name for the underlying limiting beliefs is Head Trash.`,`Working harder or closing faster misses it — letting go of the fear of failing is what lets you run the system cleanly.`,`It can masquerade as good judgment, but skipping a needed question out of fear is exactly the Head Trash this rule targets.`],
r02:[`Being unprepared or quoting price early aren't it — spilling candy is giving your whole pitch before you've qualified.`,`Wasted time or a long meeting aren't the real cost — it's becoming free consulting for someone who may never buy.`,`Demoing or sending pricing feels helpful, but you must first qualify what specifically matters to them.`],
r03:[`Jargon or vague wording isn't the definition — mystification is both sides believing they're aligned when neither is.`,`Proposals, NDAs, and CRM notes don't prevent it — the Up-Front Contract sets the shared expectations that do.`,`"Stay in touch" sounds positive, but it tells you nothing about where you actually stand — that's the mystification.`],
r04:[`A real timeline is specific — a vague "decide by Q3" with no concrete steps is usually a soft no.`,`Maybes don't convert and aren't free — they quietly consume weeks of pipeline and energy.`,`More info or a 30-day follow-up just delays it — your job is to surface whether "not deciding" actually means no.`],
r05:[`Wasted time or looking unprepared aren't the harm — volunteering creates objections the prospect never had.`,`Giving the overview or a demo answers more than was asked — first find what they actually need to know.`,`It's not another rule — naming an unprompted 90-day timeline is the textbook unasked-question violation.`],
r06:[`A discount or a thank-you note isn't buying back — it's re-pitching after the close and reopening doubt.`,`Contract terms or excitement aren't the cause — it's fear that the prospect might cancel.`,`Re-justifying the choice or confirming excitement reopens doubt — move to implementation instead.`],
r07:[`Waiting for motivation or high-energy days is the trap — you don't have to like prospecting, just do it consistently.`,`More leads or relationships aren't the result of mood-based prospecting — feast-or-famine cycles are.`,`Better scripts or self-motivation don't cure reluctance — a full pipeline makes each call feel less precious.`],
r08:[`Qualifying budget, presenting, or closing all overreach — the single goal of a prospecting call is the appointment.`,`It's not about time or policy — qualification needs a real discovery meeting the cold call can't provide.`,`It's not just one rule — pitching on a cold call breaks both Rule 2 and Rule 8 at once.`],
r09:[`Referral commissions or late-fee interest miss it — every effort, even a miss, compounds toward future results.`,`It's not a wasted call — "call me in 6 months" is a future opportunity already earning interest.`,`Big bets or chasing only hot leads break the principle — compounding needs consistent activity over time.`],
r10:[`A ready deck or constant calls aren't it — awareness is a mental radar for prospects in any situation.`,`Limiting it to events or work hours misses the point — awareness operates everywhere, all the time.`,`More calls or conferences aren't the change — you start seeing every interaction as a potential lead.`],
r11:[`It's not about easy planning or never negotiating — there's unlimited revenue; you need the system to reach it.`,`Overconfidence or rushing isn't the danger — scarcity thinking is what this rule counters.`,`Changing territory or marketing dodges it — assuming "no budget" is the scarcity mindset that sabotages you.`],
r12:[`Stalling or seeming smart isn't the point — questions keep control and surface what's really behind the ask.`,`Quoting price or saying "it depends" gives up control — answer with a question to learn their budget first.`,`It's not about stalling — every question hides another; find it before you answer.`],
r13:[`Reading body language or hiring a psychologist isn't it — never assume; ask what they actually mean.`,`Seeming arrogant or breaking a rule isn't the danger — you'll solve a problem they don't have and miss the real one.`,`Assuming silence is positive or filling it with talk both guess — ask "what are you thinking right now?"`],
r14:[`A quiet prospect isn't deeply interested or introverted — if they're listening, you're presenting too much.`,`50/50 or "it depends" misses the target — the prospect should talk roughly 70% of the time.`,`Finishing your thought or summarizing keeps you talking — stop and ask a question to re-engage them.`],
r15:[`A polished deck or long demo isn't the best presentation — it's the one made unnecessary by great discovery.`,`Length or cost isn't why they fail — they're built around what you want to show, not what they need to hear.`,`Sending or scheduling the deck skips the why — ask what's actually relevant before presenting anything.`],
r16:[`Persistence or aggressive closing isn't it — guide them so committing is the logical next step they reach.`,`Seeming unprepared or breaking policy isn't the issue — asking for the order hands all the power to them.`,`A negotiation or a surprise means discovery was thin — done right, the close feels like a shared conclusion.`],
r17:[`Pretending or going casual misses it — deliberately use the techniques that worked when you applied them by accident.`,`Calling it luck or banning the language wastes it — recognize what worked and engineer it on purpose.`,`Laziness or knowing too much isn't why — pros abandon the curiosity and fundamentals that made them effective.`],
r18:[`Artistic metaphors aren't it — seagulls are features you add to the prospect's vision that they never requested.`,`A long meeting or over-eagerness isn't the harm — unrequested additions create doubt instead of excitement.`,`Showing every feature or suggesting extras adds seagulls — ask deeper about the need they actually named.`],
r19:[`"Tell me more" keeps control — "I'll let you go" is the exit line that ends the meeting for them.`,`Seeming unprofessional or insecure isn't the issue — apologizing for your presence hands them a reason to leave.`,`Apologizing or wrapping early gives them the exit — acknowledge the time and let them decide.`],
r20:[`Relationships, activity, or satisfaction scores aren't the measure — going to the bank, real revenue, is.`,`Praising the meeting count misses it — what matters is what went to the bank, not how many meetings happened.`,`Calling feelings unprofessional isn't the point — warm feelings are irrelevant if the deal never closes.`],
r21:[`Rushing the decision or outsourcing education misses it — close the commitment first, then educate.`,`Calling it smart prep or due diligence excuses the stall — endless education is a substitute for asking to commit.`,`Educating first in any order is the trap — find pain, close, then deliver education as fulfillment.`],
r22:[`Presenting at every meeting or on request is premature — only present when qualified and ready to close.`,`Treating a deck request as buying intent is the trap — it may be an unqualified opportunity that won't close.`,`Showcasing capabilities or answering questions isn't the purpose — the presentation is the closing step.`],
r23:[`A competitor or bad reviews aren't the bomb — it's an unaddressed objection that detonates at the close.`,`Preparing rebuttals or waiting reactively lets it explode — raise the likely concern yourself first.`,`Calling reactive handling professional is the trap — waiting lets the bomb go off at the worst moment.`],
r24:[`Knowing too little or competitors knowing more isn't it — expertise dumped before discovery overwhelms.`,`Praising the feature dump as credibility is the trap — it makes you a pitch machine, not a problem-solver.`,`Leading with knowledge to build credibility backfires — deploy it after you've uncovered the pain it solves.`],
r25:[`Saying prospects don't think long-term misses it — future benefits are too abstract to create urgency now.`,`Shorter meetings or avoiding ROI isn't it — anchor to what's hurting them today.`,`Nurturing a "someday" need is the trap — surface what's happening today that will still hurt in a year.`],
r26:[`Believing pressure closes motivated buyers is the trap — people buy despite the hard sell, not because of it.`,`Thinking pressure-removal loses interest is backwards — it lets qualified prospects decide freely.`,`Calling artificial urgency a proven closer is the trap — it creates resistance and damages trust.`],
r27:[`Waiting passively or using persuasion both miss it — ask questions that let them discover their own need.`,`Treating their clear problem as research or a cue to pitch wastes it — that self-stated need is the power moment.`,`Trying to convince them they have a problem is the trap — you can only surface pain that already exists.`],
r28:[`Defending firmly or matching energy escalates — fall back with a question or story to defuse.`,`More questions or silence aren't the reversal — the instinct to defend and justify is what fuels the fight.`,`Defending with data or discounting takes the bait — turn the attack into discovery instead.`],
r29:[`Hurrying meetings or tracking calls misses it — your time has real dollar value with an opportunity cost.`,`Spending time on everyone or just being aggressive isn't it — qualify ruthlessly because your time is valuable.`,`Calling a 6-month nurture standard is the trap — run a meter check on what that effort actually earned.`],
r30:[`Freedom from paperwork or competition isn't it — you're freed from fearing the loss of what you don't yet own.`,`Delaying or softening the question protects a phantom — you can't lose a deal that isn't signed.`,`Becoming aggressive or closing less isn't the benefit — a zero baseline makes decisions clear, not fearful.`],
r31:[`Archiving for later or deleting the contact isn't it — closing the file means actively disqualifying a dead deal.`,`Hard tracking or a bad close rate isn't the danger — maybes drain the time and space real deals need.`,`More nurturing or a bigger discount feeds the zombie — force a yes or no and honor it.`],
r32:[`Charging for activity or invoicing isn't it — for every action, ask for an equivalent commitment back.`,`Unconditional free POCs give away leverage — attach a commitment in return.`,`Better relationships aren't the result of one-sided giving — it builds an imbalanced, leverage-poor dynamic.`],
r33:[`Suspicion or watching competitors misses it — stay vigilant because deals fall apart after signing too.`,`Saying they're the same rule is the trap — Rule 33 is post-close vigilance; Rule 6 warns against re-selling.`,`Assuming silence means busy is the risk — proactively confirm, because quiet can signal remorse.`],
r34:[`Doing less work or relying on tools isn't it — direct effort toward the highest-return activities.`,`Calling small-account volume confidence-building is the trap — reallocate to higher-probability, higher-value accounts.`,`Better emails or more meetings aren't the start — a defined ideal-client profile is.`],
r35:[`Legal worries or confusing rivals isn't why — sameness makes you invisible, so differentiation wins.`,`Matching the format or sending more volume keeps you invisible — do something genuinely different.`,`Best product or lowest price isn't differentiation — it's how you sell, not just what.`],
r36:[`Always selling to the CEO or avoiding committees misses it — a champion without authority can't get it decided.`,`Continuing with or closing through a non-decision-maker stalls it — engage the economic buyer directly.`,`The CFO or the daily user isn't necessarily it — the economic buyer holds budget and final say.`],
r37:[`Calling prospects dishonest or testers misses it — they withhold truth to protect themselves from pressure.`,`Reading "I'll think about it" as serious interest is the trap — it's the most common polite soft no.`,`More rapport, better pricing, or harder questions aren't the tool — the Up-Front Contract invites honesty.`],
r38:[`Treating the presented problem as the real one is the trap — it's a symptom; the real pain sits beneath.`,`Speeding discovery or creating price urgency isn't the funnel — layered questions reveal the real pain.`,`Pitching the fix or confirming you can solve it skips the dig — ask how long, the impact, and what they've tried.`],
r39:[`Charging for advice or slowing outreach isn't consultant mode — reframe as an advisor without pushing a sale.`,`Asking for a decision date, competitors, or budget pressures them — "what would need to be true?" opens it up.`,`Crediting expertise or credentials misses it — in advisor mode you appear to serve their interests, not a quota.`],
r40:[`Lying about capabilities or your company is never it — act confident before you feel it; behavior shapes mindset.`,`Saying prospects detect it or that it only works early misses the science — performed confidence rewires real confidence.`,`It's permission for mindset, not facts — never fake capabilities or experience to a prospect.`],
r41:[`"All prospects are equal" or "never at fault" misreads it — when a deal fails, examine your own process first.`,`Agreeing they weren't serious or moving on forfeits the lesson — ask what signs you missed.`,`Dishonesty or low energy isn't "bad" here — it's blaming prospects instead of owning your execution.`],
r42:[`More options or less work isn't the advantage — alternatives let you walk away, which draws prospects in.`,`Telling them they're your biggest opportunity signals desperation and hands them all the power.`,`A backup product or small deals isn't the fix — a consistently full pipeline is.`],
r43:[`Nos being common or yeses being luck misses it — a no shows you exactly where your process broke.`,`Calling it a trick or disrespectful misreads it — a clean no removes the maybe and delivers a lesson.`,`A final offer or a quiet exit wastes it — ask what made it not a fit so you can learn.`],
r44:[`Aggression or hurting a relationship isn't it — you create most problems through your own behavior and execution.`,`A bad territory, economy, or product isn't the cause — skipping qualification and pitching early is.`,`Agreeing the market is hard or switching messaging dodges it — examine your process first.`],
r45:[`Being entertaining or more credible isn't why — a third-party story delivers the point without triggering defenses.`,`Criticizing the competitor directly or staying silent both fail — tell the "I had a client who…" story instead.`,`Relatability or memorability isn't the mechanism — they reach their own conclusion, which beats yours.`],
r46:[`Treating effort as the metric or expecting eventual success misses it — only results count in professional selling.`,`Praising 20 calls as commitment is the trap — ask what those calls actually accomplished.`,`Being harsh on yourself or celebrating only big wins misreads it — it's owning the gap between effort and results.`],
r47:[`Manager/subordinate or teacher/student misses it — you're a deliberate performer and a student of psychology at once.`,`Being theatrical or entertaining isn't "Broadway" — it's full intentionality; nothing happens by accident.`,`Manipulating or studying Freud misses "psychiatrist" — you read ego states and defenses and respond strategically.`],
r48:[`Financial or industry risk isn't it — risk the hard question, the direct close, the tough conversation.`,`Calling budget-question avoidance reasonable is the trap — the unasked question derails the deal later.`,`Avoiding or recklessly taking all risk both miss it — embrace calculated risk as the engine of growth.`],
r49:[`Childlike enthusiasm or immature tactics isn't the Child — it's your emotional reaction center: defensiveness, fear, over-excitement.`,`Physical distraction or unpredictability isn't why — your emotional reactions cause most sale-killing mistakes.`,`Parent or Child as the right state misses it — operate from the calm, curious, logical Adult.`],
};

const ENC=[
  `Exactly right! That's the principle in action.`,
  `You've got it! That's the core of this rule.`,
  `Perfect. That's what separates the pros.`,
  `Nailed it. Textbook execution.`,
  `Yes! That's exactly how the system works.`,
];

let _ext=null; // injected storage adapter (e.g. Supabase). Set via App({storageAdapter}). Falls back to window.storage when standalone.
const store={
  async get(k,shared=false){if(_ext){try{return await _ext.get(k,shared);}catch{return null;}}try{const r=await window.storage.get(k,shared);return r?JSON.parse(r.value):null;}catch{return null;}},
  async set(k,v,shared=false){if(_ext){try{return await _ext.set(k,v,shared);}catch{return;}}try{await window.storage.set(k,JSON.stringify(v),shared);}catch{}},
  async list(prefix,shared=false){if(_ext){try{return await _ext.list(prefix,shared);}catch{return[];}}try{const r=await window.storage.list(prefix,shared);return r?.keys||[];}catch{return[];}},
  async del(k){if(_ext){try{return await _ext.del(k);}catch{return;}}try{await window.storage.delete(k);}catch{}},
};

/* (Removed unused genLesson API helper — lessons are authored statically, so no external API calls ship inside the module.) */

const computeXP=p=>{
  let xp=0;
  (p.completedLessons||[]).forEach(()=>xp+=XP_VALUES.lesson_complete);
  Object.values(p.quizScores||{}).forEach(s=>{if(s.passed)xp+=s.perfect?XP_VALUES.quiz_perfect:XP_VALUES.quiz_pass;});
  Object.values(p.assessmentScores||{}).forEach(s=>{if(s.passed)xp+=s.perfect?XP_VALUES.assessment_perfect:XP_VALUES.assessment_pass;});
  if(p.finalScore?.passed)xp+=p.finalScore.perfect?XP_VALUES.final_perfect:XP_VALUES.final_pass;
  return xp;
};

const computeBadges=p=>{
  const e=[];const l=p.completedLessons||[];const s=p.quizScores||{};const xp=computeXP(p);
  if(l.length>=1)e.push('first_rule');
  if(l.length>=25)e.push('halfway');
  if(RULES.filter(r=>r.part==='p1').every(r=>l.includes(r.id)))e.push('part1_done');
  if(RULES.filter(r=>r.part==='p2').every(r=>l.includes(r.id)))e.push('part2_done');
  if(RULES.filter(r=>r.part==='p3').every(r=>l.includes(r.id)))e.push('part3_done');
  if(Object.values(s).some(x=>x.perfect))e.push('perfect_quiz');
  if(Object.values(s).filter(x=>x.perfect).length>=3)e.push('triple_perfect');
  if(Object.values(s).filter(x=>x.passed).length>=10)e.push('no_stopper');
  if(RULES.every(r=>s[r.id]?.passed))e.push('quiz_all');
  if((p.streak||0)>=7)e.push('week_streak');
  if(p.finalScore?.passed)e.push('certified');
  if(xp>=3600)e.push('black_belt');
  return e;
};

const updateStreak=p=>{
  const today=new Date().toDateString();
  if(p.lastActiveDate===today)return p;
  const yesterday=new Date(Date.now()-86400000).toDateString();
  const streak=p.lastActiveDate===yesterday?(p.streak||0)+1:1;
  return{...p,lastActiveDate:today,streak};
};

/* ── CELEBRATION COMPONENTS ─────────────────────────────── */
const Confetti=({active,onDone})=>{
  useEffect(()=>{if(active){const t=setTimeout(()=>onDone&&onDone(),2800);return()=>clearTimeout(t);}},[active]);
  if(!active)return null;
  const pcs=[...Array(55)].map((_,i)=>({
    l:5+Math.random()*90,d:Math.random()*0.9,
    dur:1.4+Math.random()*0.9,
    col:['#F5C200','#003087','#00C2B2','#E84020','#F07820','#fff','#4DC8E8'][i%7],
    sz:6+Math.random()*8,rot:Math.random()*360,
  }));
  return(
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:9999,overflow:'hidden'}}>
      {pcs.map((p,i)=>(<div key={i} style={{position:'absolute',left:`${p.l}%`,top:-20,
        width:p.sz,height:p.sz,borderRadius:p.sz/4,background:p.col,
        animation:`cf ${p.dur}s ease-in ${p.d}s forwards`}}/>))}
      <style>{`@keyframes cf{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(800deg);opacity:0}}`}</style>
    </div>
  );
};

const XPToast=({xp,visible,onHide})=>{
  useEffect(()=>{if(visible){const t=setTimeout(()=>onHide&&onHide(),2200);return()=>clearTimeout(t);}});
  return(
    <div style={{position:'fixed',top:visible?20:-80,right:20,zIndex:9999,
      padding:'10px 18px',borderRadius:24,background:C.gold,color:C.dark,
      fontFamily:'Arial,sans-serif',fontWeight:800,fontSize:15,
      boxShadow:'0 6px 24px rgba(245,166,35,.55)',pointerEvents:'none',
      transition:'all .3s cubic-bezier(.175,.885,.32,1.275)',
      transform:visible?'translateY(0) scale(1)':'translateY(-14px) scale(.85)',
      opacity:visible?1:0}}>
      ⭐ +{xp} XP earned!
    </div>
  );
};

const BadgeToast=({badge,visible,onHide})=>{
  useEffect(()=>{if(visible){const t=setTimeout(()=>onHide&&onHide(),3800);return()=>clearTimeout(t);}});
  return(
    <div style={{position:'fixed',top:visible?72:-120,right:20,zIndex:9998,
      maxWidth:260,padding:'12px 16px',borderRadius:14,
      background:`linear-gradient(135deg,${C.navyD},${C.navyL})`,
      color:'#fff',fontFamily:'Arial,sans-serif',
      boxShadow:'0 8px 28px rgba(0,48,135,.5),0 0 0 1px rgba(255,255,255,.1)',
      pointerEvents:'none',transition:'all .45s cubic-bezier(.175,.885,.32,1.275)',
      opacity:visible?1:0}}>
      <div style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,.45)',letterSpacing:1.5,marginBottom:6}}>🎖️ BADGE UNLOCKED</div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <span style={{fontSize:30,lineHeight:1,flexShrink:0}}>{badge?.icon||'🏆'}</span>
        <div>
          <div style={{fontSize:15,fontWeight:900,lineHeight:1.2}}>{badge?.name}</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,.6)',marginTop:2,lineHeight:1.4}}>{badge?.desc}</div>
        </div>
      </div>
    </div>
  );
};

const LevelUpBanner=({belt,onClose})=>{
  if(!belt)return null;
  return(
    <div style={{position:'fixed',inset:0,zIndex:9997,background:'rgba(0,0,0,.8)',
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Arial,sans-serif'}}
      onClick={onClose}>
      <div style={{background:'#fff',borderRadius:20,padding:40,textAlign:'center',
        maxWidth:360,width:'90%',boxShadow:'0 24px 64px rgba(0,0,0,.4)',
        animation:'lu .45s cubic-bezier(.175,.885,.32,1.275)'}}>
        <div style={{fontSize:56,marginBottom:6}}>🥋</div>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:C.muted,marginBottom:6}}>BELT PROMOTION!</div>
        <div style={{fontSize:28,fontWeight:900,color:C.dark,marginBottom:12}}>{belt.name}</div>
        <div style={{padding:'10px 24px',borderRadius:12,background:belt.color,
          color:belt.textColor,fontWeight:700,fontSize:14,marginBottom:20,display:'inline-block'}}>
          You earned it. Keep going.
        </div>
        <br/>
        <button onClick={onClose} style={{background:C.navy,color:'#fff',border:'none',
          borderRadius:10,padding:'12px 28px',fontWeight:700,fontSize:14,cursor:'pointer'}}>
          Keep Training →
        </button>
      </div>
      <style>{`@keyframes lu{from{transform:scale(.4) translateY(60px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}`}</style>
    </div>
  );
};

/* ── CDLogo (fixed ® as superscript) ───────────────────── */
const CDLogo=({size=90,text=true,light=false})=>{
  const [uid]=useState(()=>`lg${Math.random().toString(36).slice(2,9)}`);
  const A=[['#003087',14,'M18,133 C62,228 212,162 250,90'],['#4DC8E8',13.5,'M22,113 C65,205 208,143 246,72'],['#E84020',13,'M26,93 C68,182 204,124 241,54'],['#F07820',12.5,'M31,73 C72,160 199,105 235,37'],['#F5C200',12,'M36,53 C76,138 194,87 228,20']];
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',lineHeight:1}}>
      <svg width={size} height={size*0.74} viewBox='0 0 270 195' fill='none'>
        <defs>{A.map(([col],i)=>(<marker key={i} id={`${uid}${i}`} markerWidth='15' markerHeight='11' refX='0' refY='5.5' orient='auto' markerUnits='userSpaceOnUse'><polygon points='0 0,15 5.5,0 11' fill={col}/></marker>))}</defs>
        {A.map(([col,sw,d],i)=>(<path key={i} d={d} stroke={col} strokeWidth={sw} strokeLinecap='round' fill='none' markerEnd={`url(#${uid}${i})`}/>))}
      </svg>
      {text&&<div className="cd-d" style={{fontFamily:'"Poppins",Arial,sans-serif',fontSize:size*0.235,fontWeight:700,
        color:light?'#fff':'#111',letterSpacing:'-0.4px',marginTop:5,whiteSpace:'nowrap'}}>
        ConsumerDirect<sup style={{fontSize:size*0.12,fontWeight:400,verticalAlign:'super'}}>®</sup>
      </div>}
    </div>
  );
};

/* ── PROGRESS RING ──────────────────────────── */
const ProgressRing=({pct=0,size=80,color=C.teal,track="rgba(0,0,0,.07)",sw=8,children})=>{
  const r=(size-sw*2)/2;const circ=2*Math.PI*r;const offset=circ*(1-Math.min(1,pct/100));
  return(
    <div style={{position:"relative",width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={size} height={size} style={{position:"absolute",top:0,left:0,transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={track} strokeWidth={sw}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{transition:"stroke-dashoffset .9s cubic-bezier(.175,.885,.32,1.275)"}}/>
      </svg>
      {children&&<div style={{position:"relative",textAlign:"center"}}>{children}</div>}
    </div>
  );
};

/* ── SEARCH MODAL ──────────────────────────── */
const SearchModal=({onClose,onNavigate,progress})=>{
  const [q,setQ]=useState("");
  const inp=useRef(null);
  useEffect(()=>{inp.current?.focus();},[]);
  useEffect(()=>{
    const h=e=>{if(e.key==="Escape")onClose();};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);
  const results=RULES.filter(r=>{
    if(!q.trim())return true;
    const t=q.toLowerCase();
    return r.title.toLowerCase().includes(t)||String(r.num).includes(t)||
      (HOOKS[r.id]||"").toLowerCase().includes(t)||r.pts.some(p=>p.toLowerCase().includes(t));
  }).slice(0,10);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:900,
      display:"flex",flexDirection:"column",alignItems:"center",
      padding:"48px 16px 20px",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",overflowY:"auto"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxWidth:520,background:"#fff",borderRadius:16,overflow:"hidden",
        boxShadow:"0 32px 80px rgba(0,0,0,.4)",animation:"fadeUp .22s ease",flexShrink:0}}>
        <div style={{padding:"13px 16px",borderBottom:`1px solid ${C.border}`,
          display:"flex",alignItems:"center",gap:10,background:C.surface}}>
          <span style={{fontSize:15,opacity:.45,userSelect:"none"}}>🔍</span>
          <input ref={inp} value={q} onChange={e=>setQ(e.target.value)}
            placeholder="Search all 49 rules — title, number, or keyword…"
            style={{flex:1,border:"none",outline:"none",fontSize:14,color:C.dark,
              fontFamily:"Arial,sans-serif",background:"transparent"}}/>
          <kbd onClick={onClose} style={{fontSize:11,color:C.faint,cursor:"pointer",
            padding:"2px 7px",borderRadius:5,border:`1px solid ${C.border}`,
            background:"#fff",fontFamily:"Arial,sans-serif"}}>ESC</kbd>
        </div>
        <div style={{maxHeight:380,overflowY:"auto"}}>
          {results.map((r,ri)=>{
            const p=PARTS.find(pt=>pt.id===r.part);
            const done=(progress.completedLessons||[]).includes(r.id);
            const qs=progress.quizScores?.[r.id];
            return(
              <div key={r.id} onClick={()=>{onNavigate(r.part,r.id);onClose();}}
                style={{padding:"10px 16px",cursor:"pointer",
                  borderBottom:ri<results.length-1?`1px solid ${C.borderL}`:"none",
                  display:"flex",gap:12,alignItems:"flex-start",
                  background:"#fff",transition:"background .1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                <div style={{width:36,height:36,borderRadius:9,
                  background:done?`${C.success}1a`:p.color,
                  flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:12,fontWeight:800,color:done?C.success:"#fff"}}>
                  {done?"✓":r.num}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.dark,marginBottom:1}}>{r.title}</div>
                  <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",
                    whiteSpace:"nowrap",fontStyle:"italic",marginBottom:2}}>{HOOKS[r.id]}</div>
                  <div style={{fontSize:10,color:p.color,fontWeight:700}}>
                    Pt.{p.num} · p.{r.page}{qs?.passed?" · ✓ Quizzed":""}
                  </div>
                </div>
                <div style={{color:C.faint,fontSize:16,alignSelf:"center",flexShrink:0}}>›</div>
              </div>
            );
          })}
          {q.trim()&&results.length===0&&(
            <div style={{padding:32,textAlign:"center",color:C.muted,fontSize:14}}>
              No rules matched “{q}”
            </div>
          )}
        </div>
        <div style={{padding:"8px 16px",background:C.bg,fontSize:10,color:C.faint,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Click a rule to jump to that lesson</span>
          <span style={{fontWeight:600,color:C.muted}}>
            {q.trim()?`${results.length} of 49 rules`:"All 49 rules"}
          </span>
        </div>
      </div>
    </div>
  );
};

/* ── UI PRIMITIVES ──────────────────────────────────────── */
const Btn=({children,onClick,v='primary',size='md',disabled=false,full=false,sx={}})=>{
  const [h,setH]=useState(false);
  const sz={sm:{padding:'8px 16px',fontSize:13},md:{padding:'11px 20px',fontSize:14},lg:{padding:'14px 26px',fontSize:15}};
  const base={primary:{background:C.navy,color:'#fff'},teal:{background:C.teal,color:'#fff'},
    gold:{background:C.gold,color:C.dark},red:{background:C.red,color:'#fff'},
    outline:{background:'transparent',color:C.navy,border:`2px solid ${C.navy}`},
    ghost:{background:'rgba(255,255,255,.1)',color:'rgba(255,255,255,.8)',border:'1px solid rgba(255,255,255,.2)'},
    success:{background:C.success,color:'#fff'},dark:{background:C.dark,color:'#fff'},
    muted:{background:C.borderL,color:C.muted,border:`1px solid ${C.border}`}};
  const hov={primary:{background:C.navy2},teal:{background:'#00A89E'},gold:{background:C.goldD,color:'#fff'},
    red:{background:'#B91C1C'},outline:{background:`${C.navy}0e`},ghost:{background:'rgba(255,255,255,.18)'},
    success:{background:'#15803D'},dark:{background:C.mid},muted:{background:C.border}};
  const st={display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6,
    fontFamily:'Arial,sans-serif',fontWeight:700,cursor:disabled?'not-allowed':'pointer',
    border:'none',borderRadius:8,transition:'all .15s',opacity:disabled?.45:1,
    transform:h&&!disabled?'translateY(-1px)':'translateY(0)',
    boxShadow:h&&!disabled?'0 4px 12px rgba(0,0,0,.15)':'none',
    width:full?'100%':'auto',...sz[size],...base[v],...(h&&!disabled?hov[v]||{}:{}),...sx};
  return(<button onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    onClick={disabled?undefined:onClick} style={st}>{children}</button>);
};
const Card=({children,sx={},onClick})=>(<div onClick={onClick} style={{background:'#fff',borderRadius:12,border:`1px solid ${C.border}`,padding:20,transition:'all .2s',cursor:onClick?'pointer':'default',boxShadow:'0 1px 4px rgba(0,0,0,.05)',...sx}}>{children}</div>);
const Prog=({value,max,color=C.teal,h=8,sx={}})=>(<div style={{background:C.borderL,borderRadius:99,height:h,overflow:'hidden',...sx}}><div style={{height:'100%',width:`${Math.min(100,max?Math.round(value/max*100):0)}%`,background:color,borderRadius:99,transition:'width .5s ease'}}/></div>);
const Spin=()=>(<div style={{display:'inline-block',width:20,height:20,border:`3px solid ${C.border}`,borderTopColor:C.navy,borderRadius:'50%',animation:'spin .8s linear infinite'}}/>);
const XPBadge=({xp})=>{const b=getBelt(xp);return(<div style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:b.color,fontSize:12,fontWeight:700,color:b.textColor,whiteSpace:'nowrap'}}>{b.name}</div>);};

/* ── LANDING SCREEN ─────────────────────────────────────── */
function LandingScreen({onStart,onManager}){
  const [name,setName]=useState('');
  const [pw,setPw]=useState('');
  const [mode,setMode]=useState('student');
  const [err,setErr]=useState('');
  const [foc,setFoc]=useState(false);
  const [clicks,setClicks]=useState(0);
  const go=()=>{if(!name.trim()){setErr('Please enter your name.');return;}onStart(name.trim());};
  const mgo=()=>{if(pw==='MANAGER2024')onManager();else setErr('Incorrect password.');};
  return(
    <div style={{minHeight:'100vh',
      background:'linear-gradient(150deg,#001F5B 0%,#003087 50%,#1A5098 78%,#007A72 100%)',
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:'20px 16px',fontFamily:'Arial,sans-serif',position:'relative',overflow:'hidden'}}>
      <div style={{position:'fixed',inset:0,backgroundImage:'radial-gradient(rgba(255,255,255,.1) 1px,transparent 1px)',
        backgroundSize:'36px 36px',pointerEvents:'none'}}/>
      <div style={{width:'100%',maxWidth:420,position:'relative',zIndex:1}}>
        <div style={{textAlign:'center',marginBottom:24,cursor:'pointer',animation:'fadeUp .55s ease both'}}
          onClick={()=>{const n=clicks+1;setClicks(n);if(n>=5)setMode('manager');}}>  
          <div style={{display:'inline-flex',padding:'18px 28px',background:'rgba(255,255,255,.09)',
            backdropFilter:'blur(16px)',borderRadius:20,marginBottom:16,
            boxShadow:'0 0 0 1px rgba(255,255,255,.15),0 0 60px rgba(0,194,178,.15)'}}>
            <CDLogo size={80} light/>
          </div>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:4,color:'rgba(255,255,255,.45)',marginBottom:8}}>BDR SALES TRAINING</div>
          <div className="cd-d" style={{fontSize:28,fontWeight:800,color:'#fff',lineHeight:1.15,letterSpacing:'-.5px'}}>The Sandler Rules</div>
          <div style={{fontSize:13,color:'rgba(255,255,255,.5)',marginTop:6}}>49 Timeless Selling Principles</div>
        </div>
        <div style={{background:'rgba(255,255,255,.97)',borderRadius:20,padding:'28px 28px 24px',
          boxShadow:'0 40px 80px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.12)',
          animation:'fadeUp .55s .12s ease both'}}>
          {mode==='student'?(
            <>
              <div style={{display:'flex',borderRadius:10,overflow:'hidden',border:`1px solid ${C.border}`,marginBottom:20}}>
                {[{n:'3',l:'Parts',c:C.navy},{n:'49',l:'Rules',c:C.teal},{n:'~2.5h',l:'To Certify',c:C.teal},{n:'🏆',l:'Included',c:C.gold}].map((s,i)=>(
                  <div key={s.l} style={{flex:1,textAlign:'center',padding:'10px 4px',
                    borderRight:i<2?`1px solid ${C.border}`:'none',
                    background:i===1?C.bg:'#fff'}}>
                    <div style={{fontSize:18,fontWeight:900,color:s.c,lineHeight:1}}>{s.n}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:2,fontWeight:600}}>{s.l}</div>
                  </div>
                ))}
              </div>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:C.mid,marginBottom:6,letterSpacing:.5}}>YOUR NAME</label>
              <div style={{position:'relative',marginBottom:err?8:14}}>
                <input value={name} onChange={e=>{setName(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&go()}
                  onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
                  placeholder='First and last name...' autoComplete='name'
                  style={{width:'100%',padding:'13px 42px 13px 14px',borderRadius:10,
                    border:`2px solid ${foc?C.navy:name.trim()?C.teal:C.border}`,
                    fontSize:15,fontFamily:'Arial,sans-serif',outline:'none',
                    boxSizing:'border-box',color:C.dark,transition:'border-color .15s',background:'#fff'}}/>
                {name.trim()&&<div style={{position:'absolute',right:14,top:'50%',transform:'translateY(-50%)',color:C.teal,fontSize:18,fontWeight:900}}>✓</div>}
              </div>
              {err&&<div style={{color:C.fail,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:5}}>⚠ {err}</div>}
              <Btn onClick={go} full size='lg' sx={{borderRadius:10}}>Begin Training →</Btn>
              <div style={{marginTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,color:C.faint}}>Auto-saves · No account needed</span>
                <span onClick={()=>setMode('manager')} style={{fontSize:12,color:C.muted,cursor:'pointer',fontWeight:600}}>Manager →</span>
              </div>
            </>
          ):(
            <>
              <div style={{marginBottom:18}}>
                <div style={{fontSize:18,fontWeight:900,color:C.dark,marginBottom:2}}>Manager Dashboard</div>
                <div style={{fontSize:13,color:C.muted}}>Enter your password to view team progress</div>
              </div>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:C.mid,marginBottom:6}}>PASSWORD</label>
              <input value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} type='password'
                placeholder='Manager password...' onKeyDown={e=>e.key==='Enter'&&mgo()}
                style={{width:'100%',padding:'13px 14px',borderRadius:10,border:`2px solid ${C.border}`,
                  fontSize:15,fontFamily:'Arial,sans-serif',outline:'none',boxSizing:'border-box',
                  marginBottom:err?8:14,color:C.dark,background:'#fff'}}/>
              {err&&<div style={{color:C.fail,fontSize:13,marginBottom:12}}>⚠ {err}</div>}
              <Btn onClick={mgo} full v='teal' sx={{borderRadius:10}}>Access Manager Dashboard →</Btn>
              <div style={{textAlign:'center',marginTop:12}}>
                <span onClick={()=>{setMode('student');setErr('');}} style={{fontSize:13,color:C.muted,cursor:'pointer'}}>← Back to training</span>
              </div>
            </>
          )}
        </div>
        <div style={{textAlign:'center',marginTop:18,fontSize:10,color:'rgba(255,255,255,.3)',lineHeight:1.6,maxWidth:380,marginLeft:'auto',marginRight:'auto'}}>
          Internal ConsumerDirect® BDR training aid based on the book “The Sandler Rules” by David H. Mattson.<br/>Not affiliated with, endorsed by, or certified by Sandler Systems, LLC.
        </div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );}

/* ── FLASHCARD SCREEN (Quick Review) ──────────────────────── */
function FlashcardScreen({progress,onBack}){
  const [idx,setIdx]=useState(0);const [flipped,setFlipped]=useState(false);
  const rule=RULES[idx];
  const done=(progress.completedLessons||[]).includes(rule.id);
  const qs=progress.quizScores?.[rule.id];
  const learned=RULES.filter(r=>(progress.completedLessons||[]).includes(r.id)).length;
  const prev=()=>{if(idx>0){setIdx(i=>i-1);setFlipped(false);}};
  const next=()=>{if(idx<48){setIdx(i=>i+1);setFlipped(false);}};
  useEffect(()=>{
    const h=e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowDown')next();
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp')prev();
      else if(e.key===' '||e.key==='Enter'){e.preventDefault();setFlipped(f=>!f);}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[idx]);
  const t0=useRef(null);
  const onTS=e=>t0.current=e.touches[0].clientX;
  const onTE=e=>{if(!t0.current)return;const dx=e.changedTouches[0].clientX-t0.current;if(Math.abs(dx)>40){dx<0?next():prev();}t0.current=null;};
  const cardScript=`Rule ${rule.num}: ${rule.title}. ${principle(rule.msg)}. Key concepts: ${rule.pts.join(". ")}. ${HOOKS[rule.id]||""}. Apply it today: ${AT[rule.id]||""}`;
  return(
    <div onTouchStart={onTS} onTouchEnd={onTE} style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.navyD},#1a2a4a)`,fontFamily:"Arial,sans-serif",display:"flex",flexDirection:"column"}}>
      <div style={{background:"rgba(255,255,255,.07)",padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.7)",fontSize:22,cursor:"pointer"}}>&#8592;</button>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:PARTS.find(p=>p.id===RULES[idx].part)?.color||C.teal,flexShrink:0}}/>
            <div style={{color:"rgba(255,255,255,.5)",fontSize:10,letterSpacing:2}}>{PARTS.find(p=>p.id===RULES[idx].part)?.title.split(":")[0]||"REVIEW"}</div>
          </div>
          <div style={{color:"#fff",fontSize:13,fontWeight:700}}>Rule {idx+1} of 49 &nbsp;&middot;&nbsp; {learned}/49 learned</div>
        </div>
        <Prog value={idx+1} max={49} color={C.teal} h={5} sx={{width:100}}/>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px 16px"}}>
        <div onClick={()=>setFlipped(!flipped)} style={{
          width:"100%",maxWidth:520,cursor:"pointer",minHeight:320,
          background:flipped?C.navy:"rgba(255,255,255,.08)",
          backdropFilter:"blur(10px)",borderRadius:20,padding:28,
          border:`2px solid ${flipped?C.teal:"rgba(255,255,255,.15)"}`,
          transition:"all .35s cubic-bezier(.175,.885,.32,1.275)",
          boxShadow:flipped?`0 12px 48px rgba(0,194,178,.2)`:"0 8px 32px rgba(0,0,0,.3)",
          display:"flex",flexDirection:"column",justifyContent:"space-between",
        }}>
          {!flipped?(
            <>
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:10,color:C.teal,letterSpacing:2,fontWeight:700}}>RULE #{rule.num} &middot; PAGE {rule.page}</div>
                  <div style={{display:"flex",gap:6}}>
                    {done&&<span style={{fontSize:10,color:C.teal,fontWeight:700}}>✓ Studied</span>}
                    {qs?.passed&&<span style={{fontSize:10,color:C.gold,fontWeight:700}}>💯 Quiz</span>}
                  </div>
                </div>
                <div style={{fontSize:22,fontWeight:900,color:"#fff",lineHeight:1.3,marginBottom:16}}>{rule.title}</div>
                <div style={{padding:"12px 14px",borderRadius:10,background:"rgba(0,194,178,.12)",border:"1px solid rgba(0,194,178,.32)"}}>
                  <div style={{fontSize:9,color:C.teal,fontWeight:700,letterSpacing:1.5,marginBottom:4}}>💡 REMEMBER THIS</div>
                  <div style={{fontSize:14,color:"rgba(255,255,255,.9)",fontWeight:700,lineHeight:1.55,fontStyle:"italic"}}>
                    {HOOKS[rule.id]||rule.title}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14}}>
                <div style={{fontSize:11,color:"rgba(255,255,255,.3)"}}>Memorize that hook. Then tap to test yourself.</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.4)"}}>Tap →</div>
              </div>
            </>
          ):(
            <>
              <div>
                <div style={{fontSize:10,color:C.teal,letterSpacing:2,fontWeight:700,marginBottom:8}}>RULE #{rule.num} &middot; KEY INSIGHT</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,.85)",fontStyle:"italic",lineHeight:1.7,marginBottom:14,paddingLeft:10,borderLeft:"3px solid rgba(0,194,178,.4)"}}>{principle(rule.msg)}</div>
                {rule.pts.map((pt,i)=>(
                  <div key={i} style={{display:"flex",gap:10,marginBottom:9}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:C.teal,flexShrink:0,marginTop:5}}/>
                    <div style={{fontSize:13,color:"rgba(255,255,255,.75)",lineHeight:1.5}}>{pt}</div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{padding:"10px 14px",borderRadius:10,background:`${C.gold}20`,border:`1px solid ${C.gold}44`,marginBottom:8}}>
                  <div style={{fontSize:9,color:C.gold,fontWeight:700,letterSpacing:1,marginBottom:3}}>🎯 APPLY IT TODAY</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.75)",lineHeight:1.5}}>{AT[rule.id]||""}</div>
                </div>
                <div style={{textAlign:"center",fontSize:11,color:"rgba(255,255,255,.3)"}}>Tap to flip back</div>
              </div>
            </>
          )}
        </div>
      </div>
      <div style={{padding:"10px 16px 16px",borderTop:"1px solid rgba(255,255,255,.07)"}}>
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <AudioControls text={cardScript} color={C.teal} label={`Listen to Rule #${rule.num}: ${rule.title}`}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
            <Btn onClick={prev} v="ghost" disabled={idx===0}>← Prev</Btn>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
              <div style={{display:"flex",gap:4}}>
              {[...Array(Math.min(7,49))].map((_,i)=>{
                const di=Math.max(0,Math.min(42,idx-3))+i;
                return(<div key={i} style={{width:di===idx?16:6,height:6,borderRadius:3,background:di===idx?C.teal:"rgba(255,255,255,.2)",transition:"all .2s"}}/>);
              })}
              </div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.25)",letterSpacing:.5,whiteSpace:"nowrap"}}>← → keys · SPACE to flip</div>
            </div>
            <Btn onClick={next} v="teal" disabled={idx===48}>Next →</Btn>
          </div>
        </div>
      </div>
    </div>
  );}


/* ── DASHBOARD SCREEN ─────────────────────────────────────── */
function DashboardScreen({user,progress,onPart,onManager,onLogout,onCertificate,onFlashcard,embedded=false,onExit=null}){
  const xp=computeXP(progress);const belt=getBelt(xp);const toNext=getXpToNext(xp);
  const badges=computeBadges(progress);const completed=(progress.completedLessons||[]).length;
  const partsPassed=Object.values(progress.assessmentScores||{}).filter(s=>s.passed).length;
  const allPartsPassed=partsPassed===3;const finalPassed=progress.finalScore?.passed;
  const nextRule=RULES.find(r=>!(progress.completedLessons||[]).includes(r.id));
  const nextPart=nextRule?PARTS.find(p=>p.id===nextRule.part):null;
  const streak=progress.streak||0;
  const partStats=PARTS.map(p=>{const rules=RULES.filter(r=>r.part===p.id);const done=rules.filter(r=>(progress.completedLessons||[]).includes(r.id)).length;return{...p,done,total:rules.length,aScore:progress.assessmentScores?.[p.id]};});
  const quizPassed=Object.values(progress.quizScores||{}).filter(s=>s.passed).length;
  const beltRange=belt.max===9999?500:(belt.max-belt.min);
  const beltPct=Math.min(100,Math.round((xp-belt.min)/beltRange*100));
  const [showReset,setShowReset]=useState(false);
  const [showSearch,setShowSearch]=useState(false);
  useEffect(()=>{
    const h=e=>{if(e.key==="/"&&!showSearch&&e.target.tagName!=="INPUT"){e.preventDefault();setShowSearch(true);}};
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[showSearch]);
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"Arial,sans-serif"}}>
      {showReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.65)",zIndex:500,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <Card sx={{maxWidth:340,width:"100%",textAlign:"center",padding:28}}>
            <div style={{fontSize:44,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:900,color:C.dark,marginBottom:6}}>Reset All Progress?</div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.6,marginBottom:20}}>Your XP, quiz scores, and belt rank will be permanently erased. This cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>setShowReset(false)} full v="muted">Cancel</Btn>
              <Btn onClick={onLogout} full v="red">Erase Everything</Btn>
            </div>
          </Card>
        </div>
      )}
      {showSearch&&<SearchModal onClose={()=>setShowSearch(false)} onNavigate={onPart} progress={progress}/>}
      <div style={{background:C.navy,padding:"12px 20px",display:"flex",alignItems:"center",gap:12}}>
        <CDLogo size={32} light text={false}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:"rgba(255,255,255,.55)",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {user.name}{streak>=2?` · 🔥 ${streak}-day streak!`:""}
            <span style={{opacity:.4,fontWeight:400}}> · {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
          </div>
          <Prog value={xp} max={belt.max===9999?xp+500:belt.max} color={C.gold} h={6} sx={{background:'rgba(255,255,255,.2)'}}/>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
          <XPBadge xp={xp}/>
          <button onClick={()=>setShowSearch(true)} title="Search rules (/)" style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.7)",borderRadius:7,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:15}}>&#128269;</button>
          {!embedded&&<button onClick={onManager} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.75)",borderRadius:7,padding:"4px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>MGR</button>}
          {!embedded&&<button onClick={()=>setShowReset(true)} style={{background:"transparent",border:"none",color:"rgba(255,255,255,.2)",fontSize:10,cursor:"pointer",fontFamily:"Arial,sans-serif",padding:"4px 6px"}}>Reset</button>}
          {embedded&&onExit&&<button onClick={onExit} title="Back to Resources" style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.75)",borderRadius:7,padding:"4px 12px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Arial,sans-serif"}}>Exit</button>}
        </div>
      </div>
      <div style={{maxWidth:880,margin:"0 auto",padding:"16px"}}>
        <div style={{background:`linear-gradient(135deg,${C.navyD},${C.navyL})`,borderRadius:14,padding:22,color:"#fff",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:14}}>
            <div style={{flex:1}}>
              <div style={{fontSize:19,fontWeight:900,lineHeight:1.25}}>
                {completed===0?"Start your training.":finalPassed?"Course Complete. 🏆":
                completed<49&&nextRule?`Next: Rule #${nextRule.num}`:"Complete the final exam."}
              </div>
              <div style={{fontSize:12,opacity:.5,marginTop:3}}>
                {xp} XP · {belt.name}{toNext?` · ${toNext} to next belt`:""}
              </div>
            </div>
            <ProgressRing pct={beltPct} size={76} color={belt.color} track="rgba(255,255,255,.15)" sw={7}>
              <div>
                <div style={{fontSize:17,fontWeight:900,color:"#fff",lineHeight:1}}>{beltPct}%</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.5)",marginTop:1}}>{belt.name.split(" ")[0]}</div>
              </div>
            </ProgressRing>
          </div>
          <Prog value={completed} max={49} color={C.teal} h={8}/>
          <div style={{fontSize:11,opacity:.4,marginTop:5}}>{completed}/49 rules · {partsPassed}/3 assessments</div>
          <div style={{marginTop:14,display:"flex",gap:8,flexWrap:"wrap"}}>
            {nextRule&&<Btn onClick={()=>onPart(nextRule.part,nextRule.id)} v="teal" size="sm">Continue: Rule #{nextRule.num} →</Btn>}
            <Btn onClick={onFlashcard} v="ghost" size="sm">🃏 Flashcard Review</Btn>
            <Btn onClick={()=>setShowSearch(true)} v="ghost" size="sm">🔍 Search Rules</Btn>
            {finalPassed&&<Btn onClick={onCertificate} v="gold" size="sm">🏆 Certificate</Btn>}
          </div>
        </div>
        {nextRule&&nextPart&&(
          <Card sx={{marginBottom:14,background:`linear-gradient(135deg,${nextPart.color}0d,${nextPart.color}05)`,border:`1.5px solid ${nextPart.color}30`}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
              <div style={{width:52,height:52,borderRadius:12,background:nextPart.color,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:17,fontWeight:900,color:nextPart.textColor,flexShrink:0,
                boxShadow:`0 4px 14px ${nextPart.color}44`}}>
                {nextRule.num}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,fontWeight:700,color:nextPart.color,letterSpacing:1.5,marginBottom:3}}>
                  NEXT UP · RULE #{nextRule.num} · p.{nextRule.page}
                </div>
                <div style={{fontSize:15,fontWeight:900,color:C.dark,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{nextRule.title}</div>
                <div style={{fontSize:12,color:C.mid,lineHeight:1.5,fontStyle:"italic",marginBottom:10,
                  display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                  {HOOKS[nextRule.id]}
                </div>
                <Btn onClick={()=>onPart(nextRule.part,nextRule.id)} size="sm"
                  sx={{background:nextPart.color,color:nextPart.textColor}}>Start Lesson →</Btn>
              </div>
            </div>
          </Card>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:14}}>
          <Card sx={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>TOTAL XP</div>
                <div style={{fontSize:24,fontWeight:900,color:C.gold,lineHeight:1}}>{xp}</div>
                <div style={{fontSize:11,color:C.faint,marginTop:3}}>{belt.name}</div>
              </div>
              <ProgressRing pct={beltPct} size={54} color={belt.min===0?C.gold:belt.color} sw={6}>
                <div style={{fontSize:10,fontWeight:800,color:C.dark}}>{beltPct}%</div>
              </ProgressRing>
            </div>
          </Card>
          <Card sx={{padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>RULES DONE</div>
                <div style={{fontSize:24,fontWeight:900,color:C.teal,lineHeight:1}}>{completed}/49</div>
                <div style={{fontSize:11,color:C.faint,marginTop:3}}>{partsPassed}/3 parts passed</div>
              </div>
              <ProgressRing pct={Math.round(completed/49*100)} size={54} color={C.teal} sw={6}>
                <div style={{fontSize:10,fontWeight:800,color:C.dark}}>{Math.round(completed/49*100)}%</div>
              </ProgressRing>
            </div>
          </Card>
          <Card sx={{padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>QUIZZES PASSED</div>
            <div style={{fontSize:24,fontWeight:900,color:C.navy,lineHeight:1}}>{quizPassed}/49</div>
            <div style={{fontSize:11,color:C.faint,marginTop:3}}>{quizPassed===0?"start quizzing!":quizPassed===49?"all passed!":"keep going"}</div>
          </Card>
          <Card sx={{padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>DAY STREAK</div>
            <div style={{fontSize:24,fontWeight:900,color:streak>=3?C.red:C.muted,lineHeight:1}}>
              {streak>=1?`${streak} 🔥`:"0 days"}
            </div>
            <div style={{fontSize:11,color:C.faint,marginTop:3}}>{streak>=2?"days in a row!":streak===1?"day started!":"log in daily"}</div>
          </Card>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:12,marginBottom:12}}>
          {partStats.map(p=>{
            const pct=Math.round(p.done/p.total*100);
            const assessReady=p.done===p.total&&!p.aScore?.passed;
            return(
              <Card key={p.id} onClick={()=>onPart(p.id,null)}
                sx={{cursor:"pointer",overflow:"hidden",padding:0,transition:"transform .15s,box-shadow .15s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 8px 24px ${p.color}30`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.05)";}}>
                <div style={{background:p.color,padding:"14px 16px",color:p.textColor}}>
                  <div style={{fontSize:10,fontWeight:700,letterSpacing:2,opacity:.75}}>PART {p.num} · {p.sub}</div>
                  <div style={{fontSize:15,fontWeight:900,lineHeight:1.3,marginTop:2}}>{p.title}</div>
                </div>
                <div style={{padding:"12px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                    <span style={{fontSize:12,color:C.muted}}>{p.done}/{p.total} rules</span>
                    <span style={{fontSize:11,fontWeight:700,color:p.aScore?.passed?C.success:assessReady?C.warn:C.faint}}>
                      {p.aScore?.passed?"✓ Passed":assessReady?"🟡 Take Assessment":"In Progress"}
                    </span>
                  </div>
                  <Prog value={p.done} max={p.total} color={p.color}/>
                  <div style={{fontSize:10,color:C.faint,marginTop:5,textAlign:"right"}}>{pct}% complete</div>
                </div>
              </Card>
            );
          })}
        </div>
        {allPartsPassed&&(
          <Card sx={{background:`${C.gold}0e`,border:`2px solid ${C.gold}55`,marginBottom:12,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:15,fontWeight:800,color:C.dark,marginBottom:2}}>🏆 Final Certification Exam</div>
                <div style={{fontSize:12,color:C.muted}}>20 questions · 75% to pass · Earns your certificate</div>
                {progress.finalScore&&<div style={{fontSize:12,marginTop:3,color:finalPassed?C.success:C.fail,fontWeight:600}}>Last: {progress.finalScore.score}/20 · {finalPassed?"Certified ✓":"Retake available"}</div>}
              </div>
              <Btn onClick={()=>onPart("final",null)} v="gold">{progress.finalScore?"Retake":"Take Exam"} →</Btn>
            </div>
          </Card>
        )}
        <Card>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:12}}>ACHIEVEMENTS · {badges.length}/{BADGES.length}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {BADGES.map(b=>{const e=badges.includes(b.id);return(
              <div key={b.id}
                title={e?b.desc:`Locked: ${b.desc}`}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 11px",
                  borderRadius:20,background:e?`${C.navy}14`:C.bg,
                  border:`1px solid ${e?`${C.navy}33`:C.border}`,
                  opacity:e?1:.35,fontSize:12,color:e?C.dark:C.faint,
                  fontWeight:e?700:400,transition:"all .25s",
                  transform:e?"scale(1)":"scale(.96)",cursor:"default"}}>
                <span style={{fontSize:14}}>{b.icon}</span><span>{b.name}</span>
              </div>
            );})}
          </div>
          {badges.length===0&&<div style={{fontSize:12,color:C.faint,textAlign:"center",paddingTop:4}}>Complete your first lesson to earn your first badge.</div>}
        </Card>
        <div style={{textAlign:"center",padding:"14px 0 4px",fontSize:11,color:C.faint}}>
          Press <kbd style={{padding:"1px 5px",borderRadius:4,border:`1px solid ${C.border}`,fontSize:10,background:"#fff",fontFamily:"Arial,sans-serif"}}>/</kbd> anywhere to search all 49 rules
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>
    </div>
  );}

/* ── PART SCREEN ────────────────────────────────────────── */
function PartScreen({partId,progress,onChapter,onAssessment,onBack}){
  const part=PARTS.find(p=>p.id===partId);const rules=RULES.filter(r=>r.part===partId);
  const allDone=rules.every(r=>(progress.completedLessons||[]).includes(r.id));
  const aScore=progress.assessmentScores?.[partId];
  const quizzesPassed=rules.filter(r=>progress.quizScores?.[r.id]?.passed).length;
  const doneCt=rules.filter(r=>(progress.completedLessons||[]).includes(r.id)).length;
  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'Arial,sans-serif'}}>
      <div style={{background:part.color,padding:'14px 20px'}}>
        <div style={{maxWidth:820,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
            <button onClick={onBack} style={{background:'transparent',border:'none',color:'rgba(255,255,255,.7)',fontSize:22,cursor:'pointer'}}>&#8592;</button>
            <div style={{flex:1,color:'#fff'}}>
              <div style={{fontSize:10,opacity:.7,letterSpacing:2}}>PART {part.num} · p.{part.page}</div>
              <div style={{fontSize:18,fontWeight:900,lineHeight:1.2}}>{part.title}</div>
              <div style={{fontSize:12,opacity:.65,marginTop:1}}>{part.tagline}</div>
            </div>
            <div style={{textAlign:'right',color:'rgba(255,255,255,.8)',flexShrink:0}}>
              <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{doneCt}/{rules.length}</div>
              <div style={{fontSize:10,opacity:.6}}>completed</div>
            </div>
          </div>
          <Prog value={doneCt} max={rules.length} color='#fff' h={7} sx={{background:'rgba(0,0,0,.24)'}}/>
          <div style={{display:'flex',gap:14,marginTop:6,fontSize:11,color:'rgba(255,255,255,.5)'}}>
            <span>{quizzesPassed}/{rules.length} quizzes passed</span>
            <span>{aScore?.passed?'✓ Assessment passed':allDone?'Ready for assessment':'Complete all rules to unlock'}</span>
          </div>
        </div>
      </div>
      <div style={{maxWidth:820,margin:'0 auto',padding:'16px'}}>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:12}}>
          {rules.map((r,i)=>{
            const done=(progress.completedLessons||[]).includes(r.id);
            const qs=progress.quizScores?.[r.id];
            const isNext=!done&&rules.slice(0,i).every(rr=>(progress.completedLessons||[]).includes(rr.id));
            return(
              <div key={r.id} onClick={()=>onChapter(r.id)}
                style={{background:'#fff',borderRadius:12,padding:'12px 16px 10px',cursor:'pointer',
                  border:`2px solid ${isNext?part.color:done?`${C.success}44`:C.border}`,
                  display:'flex',alignItems:'flex-start',gap:12,
                  boxShadow:isNext?`0 4px 16px ${part.color}22`:'0 1px 3px rgba(0,0,0,.04)',
                  transition:'all .15s'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateX(3px)';e.currentTarget.style.boxShadow=`0 4px 16px ${part.color}22`;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateX(0)';e.currentTarget.style.boxShadow=isNext?`0 4px 16px ${part.color}22`:'0 1px 3px rgba(0,0,0,.04)';}}>
                <div style={{width:40,height:40,borderRadius:10,flexShrink:0,marginTop:2,
                  background:done?`${C.success}18`:isNext?part.color:C.borderL,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:done?17:14,fontWeight:800,
                  color:done?C.success:isNext?part.textColor:C.faint}}>
                  {done?'✓':r.num}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.dark,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>Rule #{r.num}: {r.title}</div>
                    {qs&&<div style={{padding:'2px 8px',borderRadius:8,fontSize:11,fontWeight:700,flexShrink:0,
                      background:qs.passed?`${C.success}18`:`${C.fail}18`,
                      color:qs.passed?C.success:C.fail}}>{qs.perfect?'💯':''}{qs.score}/3</div>}
                    <div style={{color:C.faint,fontSize:18,flexShrink:0}}>›</div>
                  </div>
                  <div style={{fontSize:11,color:C.faint,marginBottom:HOOKS[r.id]?3:0}}>
                    p.{r.page}{isNext?' · ▶ Up next':done?' · Completed':''}
                  </div>
                  {HOOKS[r.id]&&<div style={{fontSize:12,color:C.muted,lineHeight:1.4,fontStyle:'italic',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{HOOKS[r.id]}</div>}
                </div>
              </div>
            );
          })}
        </div>
        <Card sx={{background:allDone?`${part.color}0d`:C.bg,border:`2px solid ${allDone?part.color+'55':C.border}`,padding:'16px 18px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div>
              <div style={{fontSize:15,fontWeight:800,color:allDone?C.dark:C.faint,marginBottom:2}}>Part {part.num} Assessment</div>
              <div style={{fontSize:12,color:C.muted}}>8 questions · 75% to pass{!allDone?' · Complete all rules to unlock':''}</div>
              {aScore&&<div style={{fontSize:12,marginTop:3,color:aScore.passed?C.success:C.fail,fontWeight:600}}>{aScore.score}/8 · {aScore.passed?'Passed ✓':'Retake available'}</div>}
            </div>
            {allDone?
              <Btn onClick={onAssessment} sx={{background:part.color,color:part.textColor}}>{aScore?'Retake':'Start Assessment'} →</Btn>:
              <div style={{padding:'6px 12px',borderRadius:8,background:C.borderL,color:C.faint,fontSize:12,fontWeight:700}}>🔒 {rules.length-doneCt} rule{rules.length-doneCt!==1?"s":""} to unlock</div>}
          </div>
        </Card>
      </div>
    </div>
  );}

/* ── LESSON SCREEN ──────────────────────────────────────── */
function LessonScreen({ruleId,progress,onQuiz,onBack,onNavigateRule}){
  const rule=RULES.find(r=>r.id===ruleId);const part=PARTS.find(p=>p.id===rule.part);
  const partRules=RULES.filter(r=>r.part===rule.part);const idx=partRules.findIndex(r=>r.id===ruleId);
  const prevInPart=idx>0?partRules[idx-1]:null;const nextInPart=idx<partRules.length-1?partRules[idx+1]:null;
  const done=(progress.completedLessons||[]).includes(ruleId);const qs=progress.quizScores?.[ruleId];
  const STEPS=[
    {k:"rule",t:"The Rule",d:"What Sandler says"},
    {k:"why",t:"Why It Works",d:"The psychology behind it"},
    {k:"takeaways",t:"Key Takeaways",d:"The 3 core ideas"},
    {k:"apply",t:"Use It Today",d:"Your script + next move"},
  ];
  const TOTAL=STEPS.length;
  const [revealed,setRevealed]=useState(1);
  const [loaded,setLoaded]=useState(false);
  const stepRefs=useRef([]);
  useEffect(()=>{
    let alive=true;setLoaded(false);
    (async()=>{
      const saved=await store.get(`step-${ruleId}`);
      if(!alive)return;
      setRevealed(done?TOTAL:Math.min(TOTAL,Math.max(1,saved?.n||saved||1)));
      setLoaded(true);
    })();
    return()=>{alive=false;};
  },[ruleId,done]);
  const advance=()=>{
    const target=Math.min(TOTAL,revealed+1);
    setRevealed(target);store.set(`step-${ruleId}`,{n:target});
    setTimeout(()=>{const el=stepRefs.current[target-1];el&&el.scrollIntoView({behavior:"smooth",block:"center"});},90);
  };
  const allRevealed=revealed>=TOTAL;
  const pct=done?100:Math.round(revealed/(TOTAL+1)*100);
  const cv=s=>String(s||"").replace(/[“”‘’—–]/g," ").replace(/\s+/g," ").trim();
  const buildScript=()=>[
    `Rule ${rule.num}. ${cv(rule.title)}.`,
    cv(principle(rule.msg))+".",
    `Why it works. ${cv(WHY[rule.id]||"")}.`,
    `Say this. ${cv(SCRIPTS[rule.id]||"")}.`,
    `Do this. ${cv(AT[rule.id]||"")}.`,
    `Remember. ${cv(HOOKS[rule.id]||"")}.`,
  ].join(" ");

  const StepShell=({i,children})=>(
    <div ref={el=>stepRefs.current[i]=el} style={{marginBottom:10,animation:"fadeUp .3s ease both"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:part.color,color:part.textColor,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,flexShrink:0}}>{i+1}</div>
        <div className="cd-d" style={{fontSize:11,fontWeight:800,color:part.color,letterSpacing:1}}>{STEPS[i].t.toUpperCase()}</div>
        <div style={{flex:1,height:1,background:C.borderL}}/>
        <div style={{fontSize:10,color:C.faint}}>{STEPS[i].d}</div>
      </div>
      {children}
    </div>
  );

  const renderStep=i=>{
    const k=STEPS[i].k;
    if(k==="rule")return(
      <Card sx={{borderLeft:`4px solid ${part.color}`}}>
        <div style={{fontSize:14,color:C.mid,fontStyle:"italic",lineHeight:1.7,marginBottom:14}}>{principle(rule.msg)}</div>
        <div style={{padding:"12px 14px",borderRadius:10,background:`${part.color}10`,border:`1px solid ${part.color}33`,display:"flex",gap:10,alignItems:"flex-start"}}>
          <span style={{fontSize:20,lineHeight:1}}>💡</span>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:part.color,letterSpacing:1.5,marginBottom:4}}>REMEMBER THIS — YOUR MENTAL ANCHOR</div>
            <div style={{fontSize:15,fontWeight:800,color:C.dark,lineHeight:1.45}}>{HOOKS[rule.id]||rule.title}</div>
          </div>
        </div>
      </Card>
    );
    if(k==="why")return(<Card><div style={{fontSize:14.5,lineHeight:1.8,color:C.mid}}>{WHY[rule.id]||rule.msg}</div></Card>);
    if(k==="takeaways")return(
      <Card>
        {rule.pts.map((pt,j)=>(<div key={j} style={{display:"flex",gap:10,marginBottom:j<rule.pts.length-1?12:0}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:`${part.color}20`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:part.color,flexShrink:0}}>{j+1}</div>
          <div style={{fontSize:14,color:C.mid,lineHeight:1.55}}>{pt}</div>
        </div>))}
      </Card>
    );
    return(
      <div style={{borderRadius:14,overflow:"hidden",border:`2px solid ${C.gold}66`,background:"#fff",boxShadow:`0 2px 12px ${C.gold}1a`}}>
        <div style={{background:`${C.gold}1a`,padding:"9px 16px"}}>
          <div className="cd-d" style={{fontSize:11,fontWeight:800,color:C.goldD,letterSpacing:1}}>⚡ YOUR NEXT CALL — SAY IT, DO IT, AVOID IT</div>
        </div>
        <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
          {[["SAY",C.success,SCRIPTS[rule.id]||rule.msg,true],["DO",C.navy,AT[rule.id],false],["AVOID",C.red,MISTAKES[rule.id],false]].map(([lab,col,txt,ital])=>(
            <div key={lab} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:9,fontWeight:800,color:"#fff",background:col,borderRadius:5,padding:"3px 7px",flexShrink:0,letterSpacing:.5,marginTop:2}}>{lab}</span>
              <div style={{fontSize:13,color:C.mid,lineHeight:1.55,fontStyle:ital?"italic":"normal"}}>{txt}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg}}>
      <div style={{background:C.navy,padding:"12px 20px 14px",position:"sticky",top:0,zIndex:20,boxShadow:"0 2px 10px rgba(0,0,0,.18)"}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button onClick={onBack} title="Back to all rules" style={{background:"rgba(255,255,255,.12)",border:"none",color:"#fff",width:34,height:34,borderRadius:9,fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>&#8592;</button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,.45)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{part.title} &middot; {idx+1} of {partRules.length}</div>
              <div className="cd-d" style={{fontSize:15,color:"#fff",fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Rule #{rule.num}: {rule.title}</div>
            </div>
            <div style={{flexShrink:0,padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:800,
              background:done?C.gold:"rgba(255,255,255,.14)",color:done?C.dark:"rgba(255,255,255,.85)"}}>
              {done?"✓ COMPLETE":allRevealed?"QUIZ LEFT":"IN PROGRESS"}
            </div>
          </div>
          <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:7,borderRadius:99,background:"rgba(255,255,255,.15)",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,borderRadius:99,background:done?C.gold:C.teal,transition:"width .5s cubic-bezier(.175,.885,.32,1.275)"}}/>
            </div>
            <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",flexShrink:0,minWidth:38,textAlign:"right"}}>{pct}%</div>
          </div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:4}}>
            {done?"Module complete — quiz passed.":allRevealed?"All steps read — take the quiz to complete this module.":`Step ${revealed} of ${TOTAL} · keep going`}
          </div>
        </div>
      </div>

      <div style={{maxWidth:760,margin:"0 auto",padding:"16px"}}>
        <AudioControls text={buildScript()} color={part.color} label="Listen to the full lesson"/>
        {loaded&&STEPS.slice(0,revealed).map((s,i)=>(<StepShell key={s.k} i={i}>{renderStep(i)}</StepShell>))}

        {!allRevealed&&loaded&&(
          <Btn onClick={advance} full size="lg" sx={{background:part.color,marginTop:4}}>
            Continue <span style={{opacity:.75,fontWeight:600,marginLeft:6}}>· {revealed} of {TOTAL}</span> →
          </Btn>
        )}

        {allRevealed&&(
          <Card sx={{textAlign:"center",marginTop:6,background:`${part.color}0c`,border:`2px solid ${part.color}44`}}>
            <div style={{fontSize:30,marginBottom:6}}>{done?"✅":"🎯"}</div>
            <div className="cd-d" style={{fontSize:16,fontWeight:800,color:C.dark,marginBottom:4}}>
              {done?"You've completed this module":"You've read all 4 steps"}
            </div>
            <div style={{fontSize:13,color:C.muted,lineHeight:1.5,marginBottom:14}}>
              {done?"Nice work. Review the quiz or move to the next rule.":"Pass the 3-question quiz to mark this module complete."}
            </div>
            {qs&&(<div style={{display:"inline-block",padding:"7px 14px",borderRadius:10,marginBottom:14,
              background:qs.passed?`${C.success}1e`:`${C.fail}1e`,border:`1px solid ${qs.passed?C.success:C.fail}44`,
              fontSize:13,color:qs.passed?C.success:C.fail,fontWeight:700}}>
              {qs.passed?`✓ Quiz passed · ${qs.score}/3`:`Last attempt ${qs.score}/3 — retake to pass`}
            </div>)}
            <Btn onClick={onQuiz} full size="lg" v={done?"outline":"gold"}>
              {done?"Review Quiz":qs?"Retake Chapter Quiz":"Take Chapter Quiz"} →
            </Btn>
            {!done&&<div style={{fontSize:11,color:C.faint,marginTop:8}}>Passing earns +{XP_VALUES.quiz_pass} XP · perfect score +{XP_VALUES.quiz_perfect}</div>}
          </Card>
        )}

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
          {prevInPart?
            <button onClick={()=>onNavigateRule(prevInPart.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,fontSize:12,fontWeight:700,textAlign:"left"}}>
              <div style={{fontSize:10,color:C.faint,fontWeight:600}}>← Previous</div>Rule #{prevInPart.num}
            </button>:<span/>}
          <button onClick={onBack} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer",color:C.muted,fontSize:12,fontWeight:700}}>All Rules</button>
          {nextInPart?
            <button onClick={()=>onNavigateRule(nextInPart.id)} style={{background:"none",border:"none",cursor:"pointer",color:done?part.color:C.muted,fontSize:12,fontWeight:700,textAlign:"right"}}>
              <div style={{fontSize:10,color:C.faint,fontWeight:600}}>Next →</div>Rule #{nextInPart.num}
            </button>:<span/>}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );}


/* ── QUIZ SCREEN (with confetti, encouragements, next-rule flow) ── */
function QuizScreen({questions,title,subtitle,passing,nextRule,onComplete,onBack,onConfetti,traps}){
  const [idx,setIdx]=useState(0);const [sel,setSel]=useState(null);const [answered,setAnswered]=useState(false);
  const [answers,setAnswers]=useState([]);const [done,setDone]=useState(false);const [encMsg,setEncMsg]=useState("");
  const q=questions[idx];const total=questions.length;const score=answers.filter(Boolean).length;
  const passed=done&&(score/total)>=passing;const perfect=done&&score===total;
  const handleSel=i=>{
    if(answered)return;setSel(i);setAnswered(true);
    const correct=i===q.a;
    if(correct)setEncMsg(ENC[Math.floor(Math.random()*ENC.length)]);
    const next=[...answers,correct];setAnswers(next);
    if(next.length===total)setTimeout(()=>setDone(true),700);
  };
  const nextQ=()=>{setSel(null);setAnswered(false);setIdx(idx+1);setEncMsg("");};
  const retry=()=>{setIdx(0);setSel(null);setAnswered(false);setAnswers([]);setDone(false);setEncMsg("");};
  useEffect(()=>{if(done&&passed&&onConfetti)onConfetti();},[done,passed]);
  if(done){
    const pct=Math.round(score/total*100);
    const xp=passed?(perfect?
      (total<=3?XP_VALUES.quiz_perfect:total<=8?XP_VALUES.assessment_perfect:XP_VALUES.final_perfect):
      (total<=3?XP_VALUES.quiz_pass:total<=8?XP_VALUES.assessment_pass:XP_VALUES.final_pass)):0;
    const hookRule=passed&&total===3?RULES.find(r=>r.quiz&&r.quiz.length===3&&r.quiz[0]&&r.quiz[0].q===questions[0].q):null;
    return(
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Arial,sans-serif"}}>
        <div style={{maxWidth:480,width:"100%",textAlign:"center"}}>
          <div style={{fontSize:perfect?72:58,marginBottom:8,transition:"font-size .3s"}}>{perfect?"🏆":passed?"🎯":"💪"}</div>
          <Card>
            <div style={{fontSize:22,fontWeight:900,color:passed?C.success:C.fail,marginBottom:3}}>
              {perfect?"Perfect Score!":passed?"Passed!":"Keep Learning!"}
            </div>
            <div style={{fontSize:13,color:C.muted,marginBottom:14}}>{title}</div>
            <div style={{fontSize:52,fontWeight:900,color:C.dark,marginBottom:3}}>{score}/{total}</div>
            <div style={{fontSize:13,color:C.muted,marginBottom:4}}>{pct}% correct &middot; Need {Math.round(passing*100)}% to pass</div>
            <Prog value={score} max={total} color={passed?C.success:C.fail} h={10} sx={{marginBottom:14}}/>
            <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:14}}>
              {answers.map((correct,i)=>(
                <div key={i} style={{width:32,height:32,borderRadius:8,
                  background:correct?`${C.success}22`:`${C.fail}22`,
                  border:`2px solid ${correct?C.success:C.fail}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:14,fontWeight:700,color:correct?C.success:C.fail}}>
                  {correct?"✓":"✗"}
                </div>
              ))}
            </div>
            {xp>0&&<div style={{padding:"8px 14px",borderRadius:10,background:`${C.gold}22`,color:C.goldD,fontSize:14,fontWeight:700,marginBottom:12}}>⭐ +{xp} XP earned!</div>}
            {hookRule&&HOOKS[hookRule.id]&&(
              <div style={{padding:"12px 14px",borderRadius:10,background:`${C.teal}12`,
                border:`1px solid ${C.teal}33`,marginBottom:14,textAlign:"left"}}>
                <div style={{fontSize:9,fontWeight:700,color:C.teal,letterSpacing:1,marginBottom:4}}>💡 LOCK IT IN</div>
                <div style={{fontSize:14,fontWeight:800,color:C.dark,lineHeight:1.5,marginBottom:8}}>{HOOKS[hookRule.id]}</div>
                <AudioControls text={`Lock it in: ${HOOKS[hookRule.id]}`} color={C.teal} label="Hear your key takeaway"/>
              </div>
            )}
            <div style={{display:"flex",gap:9,flexDirection:"column"}}>
              {!passed&&<Btn onClick={retry} full v="primary" sx={{marginBottom:0}}>Try Again →</Btn>}
              {passed&&nextRule&&(
                <Btn onClick={()=>onComplete(score,total,passed,perfect,"next")} full v="teal">
                  Next: Rule #{nextRule.num} →
                </Btn>
              )}
              <Btn onClick={()=>onComplete(score,total,passed,perfect,"back")} full v={passed?"primary":"outline"}>
                {passed?nextRule?"Part Overview":"Continue →":"Skip for Now"}
              </Btn>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  const qText=`Question ${idx+1} of ${total}: ${q.q}. Options: ${q.opts.map((o,i)=>String.fromCharCode(65+i)+". "+o).join(". ")}`;
  const exText=(sel===q.a?"Correct. ":"Incorrect. ")+(q.ex||"");
  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Arial,sans-serif"}}>
      <div style={{maxWidth:580,width:"100%"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",color:C.muted,fontSize:20,cursor:"pointer"}}>&#8592;</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:C.dark}}>{title}</div>
            <div style={{fontSize:11,color:C.muted}}>{subtitle}</div>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:C.muted}}>{idx+1}/{total}</div>
        </div>
        <div style={{display:"flex",gap:5,justifyContent:"center",marginBottom:14}}>
          {[...Array(total)].map((_,i)=>(
            <div key={i} style={{width:i<answers.length?28:i===idx?20:8,height:8,borderRadius:4,
              transition:"all .3s",
              background:i<answers.length?(answers[i]?C.success:C.fail):i===idx?C.navy:C.borderL}}/>
          ))}
        </div>
        <Card>
          <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:18}}>
            <div style={{fontSize:15,fontWeight:800,color:C.dark,lineHeight:1.55,flex:1}}>{q.q}</div>
            <AudioControls text={qText} color={C.navy} compact={true}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {q.opts.map((opt,i)=>{
              let bg=C.offW,border=C.border,color=C.dark,fw=400,transform="";
              if(answered){
                if(i===q.a){bg=C.successBg;border=C.success;color=C.success;fw=700;}
                else if(i===sel&&i!==q.a){bg=C.failBg;border=C.fail;color=C.fail;fw=700;transform="translateX(2px)";}
              }else if(sel===i){bg=`${C.navy}11`;border=C.navy;}
              return(
                <div key={i} role="button" tabIndex={answered?-1:0} aria-disabled={answered}
                  onClick={()=>handleSel(i)}
                  onKeyDown={e=>{if(!answered&&(e.key==='Enter'||e.key===' ')){e.preventDefault();handleSel(i);}}}
                  onFocus={e=>{if(!answered)e.currentTarget.style.boxShadow=`0 0 0 3px ${C.navy}40`;}}
                  onBlur={e=>{e.currentTarget.style.boxShadow='none';}}
                  style={{
                  padding:"12px 16px",borderRadius:9,border:`2px solid ${border}`,background:bg,
                  cursor:answered?"default":"pointer",color,fontSize:14,fontWeight:fw,lineHeight:1.4,
                  transition:"all .15s",transform,outline:'none'}}>
                  <span style={{marginRight:8,fontWeight:700,opacity:.4}}>{String.fromCharCode(65+i)}.</span>{opt}
                </div>
              );
            })}
          </div>
          {answered&&sel===q.a&&(
            <div role="status" aria-live="polite" style={{marginTop:14,padding:"12px 16px",borderRadius:10,
              background:C.successBg,border:`1px solid ${C.success}44`,
              fontSize:13,color:C.mid,lineHeight:1.6}}>
              <strong style={{color:C.success}}>✓ {encMsg} </strong>{q.ex}
            </div>
          )}
          {answered&&sel!==q.a&&(
            <div style={{marginTop:14,borderRadius:12,overflow:"hidden",border:`2px solid ${C.fail}55`}}>
              <div style={{background:`${C.fail}12`,padding:"9px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:11,fontWeight:800,color:C.fail,letterSpacing:.8}}>📌 COACHING MOMENT — LET'S LOCK THIS IN</div>
                <AudioControls text={`Let's review this one. The correct answer is ${String.fromCharCode(65+q.a)}. ${q.opts[q.a]}. ${q.ex} You chose ${String.fromCharCode(65+sel)}, ${q.opts[sel]}. That option doesn't apply the rule the way the correct answer does. Compare them side by side and lock in the difference.`} color={C.fail} compact={true}/>
              </div>
              <div style={{padding:"12px 14px",background:"#fff",display:"flex",flexDirection:"column",gap:10}}>
                <div style={{padding:"10px 12px",borderRadius:9,background:C.successBg,border:`1px solid ${C.success}44`}}>
                  <div style={{fontSize:10,fontWeight:800,color:C.success,letterSpacing:.5,marginBottom:3}}>✓ CORRECT ANSWER · {String.fromCharCode(65+q.a)}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.dark,lineHeight:1.45,marginBottom:6}}>{q.opts[q.a]}</div>
                  <div style={{fontSize:12.5,color:C.mid,lineHeight:1.6}}><strong style={{color:C.success}}>Why it's right: </strong>{q.ex}</div>
                </div>
                <div style={{padding:"10px 12px",borderRadius:9,background:C.failBg,border:`1px solid ${C.fail}44`}}>
                  <div style={{fontSize:10,fontWeight:800,color:C.fail,letterSpacing:.5,marginBottom:3}}>✗ YOU CHOSE · {String.fromCharCode(65+sel)}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.dark,lineHeight:1.45,marginBottom:6}}>{q.opts[sel]}</div>
                  <div style={{fontSize:12.5,color:C.mid,lineHeight:1.6}}><strong style={{color:C.fail}}>Why it's off: </strong>{traps&&traps[idx]?traps[idx]:"It's a tempting choice, but it doesn't apply this rule the way the correct answer does. Read both side by side — the gap between them is exactly what this rule is teaching you."}</div>
                </div>
              </div>
            </div>
          )}
          {answered&&idx<total-1&&(
            <div style={{marginTop:12,textAlign:"right"}}>
              <Btn onClick={nextQ} size="sm">Next Question →</Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );}


/* ── CERTIFICATE SCREEN ─────────────────────────────────── */
function CertificateScreen({user,progress,onBack}){
  const xp=computeXP(progress);const belt=getBelt(xp);const f=progress.finalScore;
  const d=progress.certDate?new Date(progress.certDate).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"}):new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  const [confetti,setConfetti]=useState(true);
  const Seal=()=>(
    <svg width="92" height="92" viewBox="0 0 100 100">
      {[...Array(24)].map((_,i)=>{const a=i*(360/24)*Math.PI/180;const x1=50+40*Math.cos(a);const y1=50+40*Math.sin(a);const x2=50+47*Math.cos(a);const y2=50+47*Math.sin(a);return<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.gold} strokeWidth="1.5"/>;})}
      <circle cx="50" cy="50" r="38" fill="none" stroke={C.gold} strokeWidth="1.5"/>
      <circle cx="50" cy="50" r="31" fill={`${C.gold}18`} stroke={`${C.gold}55`} strokeWidth="1"/>
      <text x="50" y="46" textAnchor="middle" fill={C.goldD} fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">PROGRAM</text>
      <text x="50" y="56" textAnchor="middle" fill={C.goldD} fontSize="7.5" fontWeight="700" fontFamily="Arial,sans-serif">COMPLETE</text>
    </svg>
  );
  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.bg},#E8F0FF)`,fontFamily:"Arial,sans-serif"}}>
      <style>{`@media print{body *{visibility:hidden!important}.cert-print,.cert-print *{visibility:visible!important}.cert-print{position:absolute!important;left:0;top:0;width:100%;box-shadow:none!important;border-width:3px!important}@page{margin:12mm}}`}</style>
      <Confetti active={confetti} onDone={()=>setConfetti(false)}/>
      <div style={{padding:"12px 20px",display:"flex",gap:12,alignItems:"center"}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",color:C.mid,fontSize:20,cursor:"pointer"}}>&#8592;</button>
        <Btn onClick={()=>window.print()} size="sm" v="outline">Print Certificate</Btn>
      </div>
      <div style={{maxWidth:720,margin:"0 auto",padding:"0 16px 48px"}}>
        <div className="cert-print" style={{background:"#fff",border:`5px double ${C.gold}`,borderRadius:16,padding:"44px 48px",
          textAlign:"center",boxShadow:`0 20px 60px rgba(0,48,135,.12),0 0 0 1px ${C.gold}33`,position:"relative"}}>
          <div style={{position:"absolute",top:12,left:12,width:22,height:22,borderTop:`2px solid ${C.gold}88`,borderLeft:`2px solid ${C.gold}88`}}/>
          <div style={{position:"absolute",top:12,right:12,width:22,height:22,borderTop:`2px solid ${C.gold}88`,borderRight:`2px solid ${C.gold}88`}}/>
          <div style={{position:"absolute",bottom:12,left:12,width:22,height:22,borderBottom:`2px solid ${C.gold}88`,borderLeft:`2px solid ${C.gold}88`}}/>
          <div style={{position:"absolute",bottom:12,right:12,width:22,height:22,borderBottom:`2px solid ${C.gold}88`,borderRight:`2px solid ${C.gold}88`}}/>
          <div style={{marginBottom:20}}><Seal/></div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:6,color:C.gold,marginBottom:8}}>CERTIFICATE OF ACHIEVEMENT</div>
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.gold}88,transparent)`,marginBottom:24}}/>
          <div style={{fontSize:13,color:C.muted,marginBottom:6,letterSpacing:.5}}>This certifies that</div>
          <div style={{fontSize:38,fontWeight:900,color:C.navy,letterSpacing:"-.5px",marginBottom:6,fontFamily:"Georgia,serif"}}>{user.name}</div>
          <div style={{fontSize:13,color:C.muted,marginBottom:16,letterSpacing:.3}}>has successfully completed</div>
          <div style={{fontSize:20,fontWeight:900,color:C.dark,marginBottom:4}}>BDR Sales Training Course</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:22}}>49 Selling Principles · A ConsumerDirect® internal course based on the book “The Sandler Rules” by David H. Mattson</div>
          {f&&(
            <div style={{display:"inline-flex",gap:0,borderRadius:12,overflow:"hidden",marginBottom:24,border:`1px solid ${C.navy}22`}}>
              {[{l:"Final Exam",v:`${f.score}/20 (${Math.round(f.score/20*100)}%)`,bg:C.navy,c:"#fff"},{l:"Belt Earned",v:belt.name,bg:belt.color,c:belt.textColor},{l:"Total XP",v:`${xp} pts`,bg:C.bg,c:C.dark}].map((s,i)=>(
                <div key={s.l} style={{padding:"10px 18px",background:s.bg,color:s.c,
                  borderRight:i<2?`1px solid rgba(255,255,255,.25)`:"none",minWidth:110}}>
                  <div style={{fontSize:9,opacity:.7,fontWeight:600,marginBottom:2,letterSpacing:.5}}>{s.l.toUpperCase()}</div>
                  <div style={{fontSize:14,fontWeight:800}}>{s.v}</div>
                </div>
              ))}
            </div>
          )}
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.border},transparent)`,marginBottom:20}}/>
          <div style={{display:"flex",justifyContent:"space-around",marginBottom:20}}>
            {[{l:"Date Completed",v:d},{l:"Rules Mastered",v:"All 49"},{l:"Quizzes Passed",v:String(Object.values(progress.quizScores||{}).filter(s=>s.passed).length)+"/49"}].map(s=>(
              <div key={s.l}>
                <div style={{fontSize:10,color:C.muted,marginBottom:3,letterSpacing:.3}}>{s.l}</div>
                <div style={{fontSize:13,fontWeight:700,color:C.dark}}>{s.v}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:9,color:C.faint,letterSpacing:.3,lineHeight:1.5,maxWidth:520,margin:"0 auto"}}>ConsumerDirect® internal training program · Independent study aid based on the book “The Sandler Rules” by David H. Mattson · Not affiliated with, endorsed by, or certified by Sandler Systems, LLC. This certificate reflects completion of an internal ConsumerDirect training module only.</div>
        </div>
      </div>
    </div>
  );}

/* ── MANAGER SCREEN (fixed infinite loop bug) ───────────── */
function ManagerScreen({onBack}){
  const [users,setUsers]=useState([]);const [loading,setLoading]=useState(true);const [sel,setSel]=useState(null);
  /* FIX: added [] dependency array — was causing infinite re-render loop */
  useEffect(()=>{
    (async()=>{
      const keys=await store.list('mgr-',true);
      const data=await Promise.all(keys.map(async k=>{const v=await store.get(k,true);return v?{key:k,...v}:null;}));
      setUsers(data.filter(Boolean).sort((a,b)=>new Date(b.lastUpdated||0)-new Date(a.lastUpdated||0)));
      setLoading(false);
    })();
  },[]);  /* <-- critical fix: [] ensures this only runs once on mount */
  const avg=users.length?Math.round(users.reduce((s,u)=>s+(u.completed||0)/49*100,0)/users.length):0;
  return(
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:'Arial,sans-serif'}}>
      <div style={{background:C.navy,padding:'14px 20px',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={onBack} style={{background:'transparent',border:'none',color:'rgba(255,255,255,.7)',fontSize:20,cursor:'pointer'}}>&#8592;</button>
        <CDLogo size={32} light text={false}/>
        <div style={{color:'#fff'}}><div style={{fontSize:10,opacity:.6,letterSpacing:1}}>MANAGER VIEW</div><div style={{fontSize:16,fontWeight:900}}>Team Progress Dashboard</div></div>
      </div>
      <div style={{maxWidth:820,margin:'0 auto',padding:'16px'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10,marginBottom:14}}>
          {[{l:'Users',v:users.length,c:C.navy},{l:'Avg Progress',v:`${avg}%`,c:C.teal},{l:'Certified',v:users.filter(u=>u.certified).length,c:C.gold},{l:'All Parts',v:users.filter(u=>(u.partsPassed||0)>=3).length,c:C.success}].map(s=>(<Card key={s.l} sx={{padding:'12px 14px',textAlign:'center'}}><div style={{fontSize:22,fontWeight:900,color:s.c}}>{s.v}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{s.l}</div></Card>))}
        </div>
        {loading&&<div style={{textAlign:'center',padding:32}}><Spin/></div>}
        {!loading&&users.length===0&&(<Card sx={{textAlign:'center',padding:36}}>
          <div style={{fontSize:36,marginBottom:10}}>👥</div>
          <div style={{fontSize:15,fontWeight:700,color:C.dark,marginBottom:4}}>No team members yet.</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>When your team opens this app and enters their name, their progress will appear here automatically.</div>
          <div style={{marginTop:12,fontSize:12,color:C.faint}}>Progress syncs when they complete lessons and quizzes.</div>
        </Card>)}
        {!loading&&users.length>0&&(<Card>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:1,marginBottom:10}}>ALL USERS · {users.length} total</div>
          {users.map(u=>(
            <div key={u.key} onClick={()=>setSel(sel===u.key?null:u.key)}
              style={{padding:'12px 14px',borderRadius:8,border:`1px solid ${sel===u.key?`${C.navy}44`:C.border}`,background:sel===u.key?`${C.navy}06`:C.offW,cursor:'pointer',marginBottom:8,transition:'all .15s'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontWeight:700,color:C.dark,fontSize:13}}>{u.name||'Unknown'}</div>
                  <div style={{fontSize:11,color:C.muted}}>{u.lastUpdated?new Date(u.lastUpdated).toLocaleDateString():'No activity'}{u.streak>=2?` · 🔥 ${u.streak}-day streak`:''}</div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {u.certified&&<div style={{padding:'2px 7px',borderRadius:8,background:`${C.gold}33`,color:C.goldD,fontSize:10,fontWeight:700}}>CERTIFIED</div>}
                  <div style={{fontSize:12,color:C.muted,fontWeight:600}}>{u.completed||0}/49</div>
                </div>
              </div>
              <Prog value={u.completed||0} max={49} color={u.certified?C.gold:C.navy} h={5} sx={{marginTop:7}}/>
              {sel===u.key&&(
                <div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7}}>
                  {[{l:'Chapters',v:`${u.completed||0}/49`},{l:'Parts Passed',v:`${u.partsPassed||0}/3`},{l:'Belt',v:u.belt||'White Belt'},{l:'XP',v:u.xp||0},{l:'Streak',v:u.streak>=1?`${u.streak} days`:'—'},{l:'Status',v:u.certified?'Certified':`In Progress`}].map(s=>(<div key={s.l} style={{background:C.bg,borderRadius:6,padding:'7px 10px',textAlign:'center'}}><div style={{fontWeight:700,color:C.dark,fontSize:12}}>{s.v}</div><div style={{fontSize:10,color:C.muted}}>{s.l}</div></div>))}
                </div>
              )}
            </div>
          ))}
        </Card>)}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── MAIN APP ───────────────────────────────────────────── */
export default function App(cfg={}){
  const {embedded=false,injectedUser=null,onCertified=null,onExit=null,storageAdapter=null}=cfg;
  if(storageAdapter&&_ext!==storageAdapter)_ext=storageAdapter;
  const [screen,setScreen]=useState('init');const [user,setUser]=useState(null);
  const [progress,setProgress]=useState({completedLessons:[],quizScores:{},assessmentScores:{},finalScore:null,certified:false,certDate:null,streak:0,lastActiveDate:null});
  const [nav,setNav]=useState({partId:null,ruleId:null});

  /* Celebration state */
  const [confetti,setConfetti]=useState(false);
  const [xpToastState,setXpToastState]=useState({xp:0,visible:false});
  const [levelUpBelt,setLevelUpBelt]=useState(null);
  const prevXpRef=useRef(0);
  const prevBeltRef=useRef('White Belt');
  const prevBadgesRef=useRef([]);
  const [badgeToast,setBadgeToast]=useState({badge:null,visible:false});

  /* Init: load user + progress */
  useEffect(()=>{
    if(!embedded&&typeof document!=='undefined'&&!document.getElementById('cd-font-link')){
      const pc=document.createElement('link');pc.rel='preconnect';pc.href='https://fonts.gstatic.com';pc.crossOrigin='anonymous';document.head.appendChild(pc);
      const l=document.createElement('link');l.id='cd-font-link';l.rel='stylesheet';
      l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@500;600;700;800;900&display=swap';
      document.head.appendChild(l);
      const s=document.createElement('style');s.id='cd-font-style';
      s.textContent="*{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif!important;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}.cd-d{font-family:'Poppins','Inter',sans-serif!important}";
      document.head.appendChild(s);
    }
    (async()=>{
      if(embedded&&injectedUser){
        const eu={id:injectedUser.id||injectedUser.email||'bdr-user',name:injectedUser.name||injectedUser.email||'BDR Rep'};
        setUser(eu);
        const ep=await store.get('cd-progress');
        if(ep){setProgress(ep);prevXpRef.current=computeXP(ep);prevBeltRef.current=getBelt(computeXP(ep)).name;prevBadgesRef.current=computeBadges(ep);}
        setScreen('dashboard');return;
      }
      const u=await store.get('cd-user');const p=await store.get('cd-progress');
      if(u){setUser(u);if(p){setProgress(p);prevXpRef.current=computeXP(p);prevBeltRef.current=getBelt(computeXP(p)).name;prevBadgesRef.current=computeBadges(p);}setScreen('dashboard');}
      else setScreen('landing');
    })();
  },[]);

  /* FIX: auto-save only on progress change, not screen change */
  useEffect(()=>{
    if(!user)return;
    const xp=computeXP(progress);const belt=getBelt(xp);
    store.set('cd-progress',progress);
    store.set(`mgr-${user.id}`,{name:user.name,completed:progress.completedLessons?.length||0,
      partsPassed:Object.values(progress.assessmentScores||{}).filter(s=>s.passed).length,
      certified:progress.certified,belt:belt.name,xp,streak:progress.streak||0,
      lastUpdated:new Date().toISOString()},true);

    /* XP + level-up detection */
    if(xp>prevXpRef.current){
      const earned=xp-prevXpRef.current;
      setXpToastState({xp:earned,visible:true});
      if(belt.name!==prevBeltRef.current){
        setLevelUpBelt(belt);
        setConfetti(true);
      }
      prevXpRef.current=xp;
      prevBeltRef.current=belt.name;
    }
    /* Badge detection */
    const curBadges=computeBadges(progress);
    const newBadge=curBadges.find(b=>!prevBadgesRef.current.includes(b));
    if(newBadge){const bd=BADGES.find(b=>b.id===newBadge);if(bd)setBadgeToast({badge:bd,visible:true});}
    prevBadgesRef.current=curBadges;
  },[progress]);  /* <-- only fires when progress changes, not screen */

  /* Helpers */
  const startUser=async name=>{
    const id=`u${Date.now()}`;const u={id,name,startDate:new Date().toISOString()};
    await store.set('cd-user',u);setUser(u);setScreen('dashboard');
  };
  /* FIX: markComplete via onMount prop, called in LessonScreen's useEffect */
  const markComplete=ruleId=>setProgress(p=>{
    const cl=[...(p.completedLessons||[])];
    if(!cl.includes(ruleId))cl.push(ruleId);
    return updateStreak({...p,completedLessons:cl});
  });
  const saveQuiz=(ruleId,sc,tot,pa,pe)=>setProgress(p=>({
    ...updateStreak(p),
    quizScores:{...(p.quizScores||{}),[ruleId]:{score:sc,total:tot,passed:pa,perfect:pe}},
    completedLessons:pa?[...new Set([...(p.completedLessons||[]),ruleId])]:(p.completedLessons||[]),
  }));
  const saveAssessment=(partId,sc,tot,pa,pe)=>setProgress(p=>({
    ...updateStreak(p),
    assessmentScores:{...(p.assessmentScores||{}),[partId]:{score:sc,total:tot,passed:pa,perfect:pe}},
  }));
  const saveFinal=(sc,tot,pa,pe)=>{
    setProgress(p=>({...updateStreak(p),finalScore:{score:sc,total:tot,passed:pa,perfect:pe},
      certified:pa,certDate:pa?new Date().toISOString():p.certDate}));
    if(pa){setConfetti(true);setScreen('certificate');
      if(onCertified){try{onCertified({name:user?.name,module:'sandler-rules',score:sc,total:tot,perfect:pe,certified:true,date:new Date().toISOString()});}catch(e){}}
    }else setScreen('dashboard');
  };
  const navigate=(partId,ruleId)=>{
    if(partId==='final'){setScreen('final-exam');return;}
    setNav({partId,ruleId});setScreen(ruleId?'lesson':'part');
  };
  const navigateRule=ruleId=>{
    const r=RULES.find(x=>x.id===ruleId);
    setNav({partId:r.part,ruleId});setScreen('lesson');
  };
  const logout=async()=>{
    await store.del('cd-user');await store.del('cd-progress');
    setUser(null);setProgress({completedLessons:[],quizScores:{},assessmentScores:{},finalScore:null,certified:false,certDate:null,streak:0,lastActiveDate:null});
    setScreen('landing');
  };

  /* Overlay celebrations */
  const overlays=(<>
    <Confetti active={confetti} onDone={()=>setConfetti(false)}/>
    <XPToast xp={xpToastState.xp} visible={xpToastState.visible} onHide={()=>setXpToastState(s=>({...s,visible:false}))}/>
    <BadgeToast badge={badgeToast.badge} visible={badgeToast.visible} onHide={()=>setBadgeToast(s=>({...s,visible:false}))}/>
    <LevelUpBanner belt={levelUpBelt} onClose={()=>setLevelUpBelt(null)}/>
  </>);

  /* Routing */
  if(screen==='init')return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:C.bg,fontFamily:'Arial,sans-serif'}}>  <div style={{textAlign:'center'}}><Spin/><div style={{marginTop:10,fontSize:13,color:C.muted}}>Loading your progress…</div></div><style>{`*{box-sizing:border-box;-webkit-font-smoothing:antialiased;}body{margin:0;padding:0;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}@keyframes cf{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(800deg);opacity:0}}@keyframes lu{from{transform:scale(.4) translateY(60px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CDD5E8;border-radius:99px}::selection{background:#003087;color:#fff}`}</style></div>);
  if(screen==='landing')return <LandingScreen onStart={startUser} onManager={()=>setScreen('manager')}/>;
  if(screen==='manager')return(<>{overlays}<ManagerScreen onBack={()=>setScreen(user?'dashboard':'landing')}/></>);
  if(screen==='certificate')return(<>{overlays}<CertificateScreen user={user} progress={progress} onBack={()=>setScreen('dashboard')}/></>);
  if(screen==='flashcard')return(<>{overlays}<FlashcardScreen progress={progress} onBack={()=>setScreen('dashboard')}/></>);

  if(screen==='final-exam')return(<>{overlays}<QuizScreen questions={FINAL_EXAM} title="Sandler Certification Exam" subtitle="20 questions · 75% to pass" passing={0.75} onConfetti={()=>setConfetti(true)} onBack={()=>setScreen('dashboard')} onComplete={(sc,tot,pa,pe)=>saveFinal(sc,tot,pa,pe)}/></>);

  if(screen==='quiz'&&nav.ruleId){
    const rule=RULES.find(r=>r.id===nav.ruleId);
    const ci=RULES.findIndex(r=>r.id===nav.ruleId);
    const nr=ci<48?RULES[ci+1]:null;const nirp=nr&&nr.part===rule.part?nr:null;
    return(<>{overlays}<QuizScreen questions={rule.quiz} title={`Rule #${rule.num} Quiz`} subtitle={rule.title} passing={0.67} nextRule={nirp} traps={TRAPS[rule.id]}
      onConfetti={()=>setConfetti(true)} onBack={()=>setScreen('lesson')}
      onComplete={(sc,tot,pa,pe,dir)=>{saveQuiz(nav.ruleId,sc,tot,pa,pe);if(pa&&dir==='next'&&nirp){navigateRule(nirp.id);}else setScreen('part');}}/></>);
  }

  if(screen==='assessment'&&nav.partId){const a=ASSESSMENTS[nav.partId];return(<>{overlays}<QuizScreen questions={a.questions} title={a.title} subtitle="8 questions · 75% to pass" passing={0.75} onConfetti={()=>setConfetti(true)} onBack={()=>setScreen('part')} onComplete={(sc,tot,pa,pe)=>{saveAssessment(nav.partId,sc,tot,pa,pe);setScreen('part');}}/></>);}

  if(screen==='lesson'&&nav.ruleId)return(<>{overlays}<LessonScreen ruleId={nav.ruleId} progress={progress}
    onQuiz={()=>setScreen('quiz')}
    onBack={()=>setScreen('part')}
    onNavigateRule={navigateRule}/></>);

  if(screen==='part'&&nav.partId)return(<>{overlays}<PartScreen partId={nav.partId} progress={progress}
    onChapter={ruleId=>{setNav(n=>({...n,ruleId}));setScreen('lesson');}}
    onAssessment={()=>setScreen('assessment')} onBack={()=>setScreen('dashboard')}/></>);

  return(<>{overlays}<DashboardScreen user={user} progress={progress}
    embedded={embedded} onExit={onExit}
    onPart={navigate} onManager={()=>setScreen('manager')}
    onCertificate={()=>setScreen('certificate')}
    onFlashcard={()=>setScreen('flashcard')}
    onLogout={logout}/></>);
}
