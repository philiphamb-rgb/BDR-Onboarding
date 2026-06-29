// Single source of truth for every external system the tool launches into.
// Wire a task/button to a system key here, and swap a placeholder homepage for a
// real deep link in ONE place — every launch button across the app updates.
//
// `placeholder: true` means the URL is a generic landing page, still awaiting a
// real per-record/deep-link URL from the team (HubSpot deal pattern, Stripe
// onboarding link, Nextiva click-to-call scheme, Slack per-user IDs, etc.).

export interface SystemLink {
  key: string
  label: string
  url: string
  placeholder?: boolean
}

export const SYSTEMS: Record<string, SystemLink> = {
  hubspot:    { key: 'hubspot',    label: 'HubSpot',         url: 'https://app.hubspot.com',                placeholder: true },
  onit:       { key: 'onit',       label: 'Onit',            url: 'https://onit.com',                       placeholder: true },
  partnerhub: { key: 'partnerhub', label: 'PartnerHub',      url: 'https://partnerhub.consumerdirect.com' },
  stripe:     { key: 'stripe',     label: 'Stripe',          url: 'https://dashboard.stripe.com',           placeholder: true },
  nextiva:    { key: 'nextiva',    label: 'Nextiva',         url: 'https://nextiva.com',                    placeholder: true },
  slack:      { key: 'slack',      label: 'Slack',           url: 'https://consumerdirect.slack.com' },
  devdocs:    { key: 'devdocs',    label: 'Developer Docs',  url: 'https://developer.consumerdirect.io' },
  seamless:   { key: 'seamless',   label: 'Seamless.AI',     url: 'https://seamless.ai',                    placeholder: true },
  dropbox:    { key: 'dropbox',    label: 'Dropbox',         url: 'https://dropbox.com',                    placeholder: true },
  jira:       { key: 'jira',       label: 'JIRA',            url: 'https://jira.com',                       placeholder: true },
}

export function systemLink(key: string | undefined): SystemLink | undefined {
  return key ? SYSTEMS[key] : undefined
}
