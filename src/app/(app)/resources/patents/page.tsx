'use client'

import Link from 'next/link'
import { Card } from '@/components/ui'
import { ShieldIcon, ExternalLinkIcon, BackIcon } from '@/components/icons'
import { PATENT_GROUPS, PATENT_COUNT, PATENT_SEARCH_URL, patentUrl } from '@/lib/patents'

export default function PatentsPage() {
  return (
    <div className="space-y-5 pb-4">
      <Link href="/resources" className="inline-flex items-center gap-2 text-sm text-gray hover:text-dark-text">
        <BackIcon size={16} /> Resource Center
      </Link>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy-ink">
          <ShieldIcon size={22} />
        </div>
        <div>
          <h1 className="text-h1 text-dark-text">Patent Portfolio</h1>
          <p className="mt-0.5 text-[13px] text-gray">{PATENT_COUNT} patents & filings that make ConsumerDirect’s technology defensible.</p>
        </div>
      </div>

      {/* Why it matters — the BDR talking point */}
      <Card className="bg-gradient-hero text-white">
        <div className="text-[11px] font-[800] uppercase tracking-[0.08em] text-white/70">Why this matters in a partner conversation</div>
        <p className="mt-1 text-sm leading-relaxed">
          ConsumerDirect didn’t just build credit tools — it <span className="font-[800]">invented and patented</span> the
          dispute and credit-management technology behind them. When a partner asks “why you?”, this is your moat:
          competitors can’t legally replicate the patented engine your partners get to resell.
        </p>
      </Card>

      {/* Groups */}
      {PATENT_GROUPS.map(group => (
        <section key={group.title} className="space-y-2">
          <div>
            <h2 className="text-h3 text-dark-text">{group.title}</h2>
            <p className="mt-0.5 text-[12px] text-gray leading-relaxed">{group.blurb}</p>
          </div>
          <div className="space-y-2">
            {group.patents.map(p => (
              <a key={p.slug} href={patentUrl(p.slug)} target="_blank" rel="noopener noreferrer" className="block">
                <Card hover className="!p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-[800] text-navy-ink">{p.number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-[700] ${p.status === 'Granted' ? 'bg-success/10 text-success' : 'bg-gold/10 text-[#A06C00]'}`}>
                          {p.status} · {p.year}
                        </span>
                      </div>
                      <div className="mt-1 text-[14px] font-[700] text-dark-text leading-snug">{p.title}</div>
                      <p className="mt-1 text-[12px] text-gray leading-relaxed">{p.what}</p>
                    </div>
                    <ExternalLinkIcon size={15} className="mt-1 shrink-0 text-gray" />
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </section>
      ))}

      {/* Source */}
      <Card className="!p-3">
        <p className="text-[11px] leading-relaxed text-gray">
          Compiled from public USPTO / Google Patents records — inventor <span className="font-[700] text-mid-text">David B. Coulter</span>,
          assignee <span className="font-[700] text-mid-text">ConsumerDirect, Inc.</span> (formerly PathwayData, Inc.).
          Tap any patent to read the full filing.{' '}
          <a href={PATENT_SEARCH_URL} target="_blank" rel="noopener noreferrer" className="font-[700] text-teal hover:underline">View the live patent search →</a>
        </p>
      </Card>
    </div>
  )
}
