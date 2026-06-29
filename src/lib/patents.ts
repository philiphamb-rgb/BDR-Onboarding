// ConsumerDirect patent portfolio — compiled from public USPTO / Google Patents
// records (inventor: David B. Coulter; assignee: ConsumerDirect, Inc., formerly
// PathwayData, Inc.). Grouped by what the technology actually protects so a BDR
// can speak to it as a competitive moat. Every entry links to the full filing.

export interface Patent {
  number: string        // display number
  slug: string          // google patents path id
  title: string
  status: 'Granted' | 'Application'
  year: string
  what: string          // plain-English: what it protects / does
}

export interface PatentGroup {
  title: string
  blurb: string
  patents: Patent[]
}

export const PATENT_SEARCH_URL =
  'https://patents.google.com/?q=(Consumer+Direct)&inventor=David+B+Coulter'

export function patentUrl(slug: string) {
  return `https://patents.google.com/patent/${slug}/en`
}

export const PATENT_GROUPS: PatentGroup[] = [
  {
    title: 'Credit Dispute & Resolution',
    blurb: 'The engine behind SmartCredit’s “dispute in a few clicks.” These patents cover how a consumer’s dispute is filed, routed to the bureau and creditor, tracked, and reported back — including alerts when a creditor is slow or misses the regulatory response window.',
    patents: [
      { number: 'US 9,697,568 B1', slug: 'US9697568B1', title: 'Systems and methods for credit dispute processing, resolution, and reporting', status: 'Granted', year: '2017',
        what: 'Receives a consumer’s dispute, processes it, submits it to the credit bureau/creditor, tracks the outcome, and reports status back — flagging slow or non-responsive creditors against regulatory timelines.' },
      { number: 'US 9,406,085 B1', slug: 'US9406085B1', title: 'Systems and methods for credit dispute processing, resolution, and reporting', status: 'Granted', year: '2016',
        what: 'The foundational dispute-workflow patent: end-to-end processing, resolution, and reporting of credit disputes with consumer status updates.' },
      { number: 'US 2013/0173449 A1', slug: 'US20130173449A1', title: 'System and method for automated dispute resolution of credit data', status: 'Application', year: '2013',
        what: 'Automates resolving disputed items on a consumer’s credit data rather than relying on manual, mailed disputes.' },
      { number: 'US 7,249,113 B1', slug: 'US7249113B1', title: 'System and method for facilitating the handling of a dispute', status: 'Granted', year: '2007',
        what: 'The original method for facilitating how a credit/consumer dispute is handled from start to finish.' },
    ],
  },
  {
    title: 'Consumer Credit Information Management',
    blurb: 'The platform foundation: presenting a consumer’s credit report and giving them ways to act on it. This is the patented core that lets partners offer a real credit-management experience, not just a static report.',
    patents: [
      { number: 'US 7,877,304 B1', slug: 'US7877304B1', title: 'System and method for managing consumer information', status: 'Granted', year: '2011',
        what: 'Presents the consumer’s credit report and provides options to dispute negative entries with creditors and bureaus, start automated debt-settlement negotiations, or declare identity theft.' },
      { number: 'US 7,818,228 B1', slug: 'US7818228B1', title: 'System and method for managing consumer information', status: 'Granted', year: '2010',
        what: 'The earlier consumer-information-management patent underpinning how credit data is surfaced and acted on inside the platform.' },
    ],
  },
]

export const PATENT_COUNT = PATENT_GROUPS.reduce((n, g) => n + g.patents.length, 0)
