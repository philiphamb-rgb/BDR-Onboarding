# BDR OS — Email setup (Supabase Auth)

Everything here is configured in the **Supabase dashboard**, not in code.
Project ref: `zbgimoasdqqprymbykqb`

There are three separate things, in the order you should do them:

1. **Fix the `localhost` link** (Site URL) — required, fixes the "site can't be reached" error
2. **Send from your ConsumerDirect address** (Custom SMTP) — makes email come from you, not Supabase
3. **Make the email beautiful** (paste the templates in this folder)

---

## 1. Fix the "localhost refused to connect" error  (do this first)

The confirmation link points at `localhost` because that's still the Site URL from development.

1. Open: <https://app.supabase.com/project/zbgimoasdqqprymbykqb/auth/url-configuration>
2. Set **Site URL** to your live URL:
   ```
   https://bdr-os.vercel.app
   ```
3. Under **Redirect URLs**, click **Add URL** and add both:
   ```
   https://bdr-os.vercel.app/**
   https://bdr-os.vercel.app/auth/callback
   ```
4. **Save.**

New confirmation emails now link to the live site. (Old emails already sent still point at localhost — just sign up / resend once after saving.)

---

## 2. Send email from a ConsumerDirect address (Custom SMTP)

By default Supabase sends from its own shared address and is rate-limited
(a few emails/hour) — not good for real onboarding. Point it at your company
mail server so email comes **from ConsumerDirect**.

Open: <https://app.supabase.com/project/zbgimoasdqqprymbykqb/auth/templates>
→ **SMTP Settings** (toggle **Enable Custom SMTP**), then fill in:

### Option A — Personal Gmail (fastest, no IT needed)

Send via `philiphamb@gmail.com`. Good for launch/testing. Limit ~500 emails/day.

**Step 1 — turn on 2-Step Verification** (required before you can make an app password):
<https://myaccount.google.com/signinoptions/two-step-verification>

**Step 2 — create an App Password:**
<https://myaccount.google.com/apppasswords> → app name `BDR OS` → **Create** →
copy the 16-character code (remove the spaces).

**Step 3 — enter in Supabase SMTP Settings:**

| Supabase field | Value |
|---|---|
| Sender email | `philiphamb@gmail.com` |
| Sender name | `ConsumerDirect BDR OS` |
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | `philiphamb@gmail.com` |
| Password | the 16-char **app password** (NOT your normal Gmail password) |
| Minimum interval | `60` |

> Note: emails will visibly come **from philiphamb@gmail.com** — Gmail won't let
> you show a different address. Fine for launch; switch to Option B (M365 /
> `onboarding@consumerdirect.com`) when you want a branded company sender.

### Option B — Microsoft 365 (`onboarding@consumerdirect.com`)
ConsumerDirect uses Microsoft 365 — use these exact values

| Supabase field | Value |
|---|---|
| Sender email | `onboarding@consumerdirect.com` (a real M365 mailbox you control) |
| Sender name | `ConsumerDirect BDR OS` |
| Host | `smtp.office365.com` |
| Port | `587` |
| Username | the full mailbox address, e.g. `onboarding@consumerdirect.com` |
| Password | that mailbox's password — or an **app password** if MFA is on (it almost always is) |
| Minimum interval | `60` seconds (leave default) |

**Two things IT must enable first** (otherwise login fails with an auth error):

1. **Turn on Authenticated SMTP for that mailbox.**
   M365 Admin Center → Users → the mailbox → **Mail** tab → **Manage email apps**
   → check **Authenticated SMTP** → Save.
   (PowerShell equivalent: `Set-CASMailbox -Identity onboarding@consumerdirect.com -SmtpClientAuthenticationDisabled $false`)

2. **Create an app password** (because Microsoft blocks basic password login when MFA is on).
   The mailbox owner: <https://mysignins.microsoft.com/security-info> → Add sign-in method
   → **App password** → name it "BDR OS" → copy the generated password → use THAT as the
   Supabase password. If "App password" isn't offered, IT needs to allow it
   (Entra ID → per-user MFA, or disable Security Defaults for that account).

**Deliverability:** your domain already has SPF for Outlook. Ask IT to also turn on
**DKIM** for `consumerdirect.com` (Microsoft Defender → Email & collaboration →
Policies → DKIM) so messages don't land in spam.

> Heads-up: Microsoft 365 SMTP works fine for onboarding volumes, but it uses
> basic auth (being phased out) and has per-day send limits. If IT prefers not to
> enable SMTP AUTH, the robust alternative is a free dedicated sender — SendGrid
> or Amazon SES — host `smtp.sendgrid.net` / port `587`, same Supabase fields.

> Important: the sender domain must be verified with your email provider
> (SPF/DKIM records), or messages land in spam. The provider walks you
> through this when you add the domain.

Once saved, send yourself a test signup to confirm it arrives from your address.

---

## 3. Make the emails beautiful (paste the templates)

> ⚠️ **Order matters.** These templates link to `/auth/confirm` (the token-hash
> sign-in flow that works from mobile mail apps). That route must be **deployed
> to the live site first**, otherwise the links 404. Deploy the code that adds
> `src/app/auth/confirm/route.ts`, confirm the site is live, *then* paste these
> templates.

Open: <https://app.supabase.com/project/zbgimoasdqqprymbykqb/auth/templates>

For each template below: select it, switch the editor to **HTML / source**,
delete what's there, paste the file's full contents, and **Save**.

| Supabase template | Paste this file |
|---|---|
| **Magic Link** (used at every sign-in) | `magic-link.html` |
| **Confirm signup** | `confirm-signup.html` |
| **Invite user** | `invite-rep.html` |

Both use Supabase's `{{ .ConfirmationURL }}` variable, so the real link is
filled in automatically. Branding uses the app's colors (navy `#003087`,
teal `#00C2B2`, gold `#F5A623`) and a text logo so nothing breaks if a mail
client blocks images.

**Subject lines** (set the field above the body):
- Confirm signup → `Welcome to BDR OS — confirm your email`
- Invite user → `You're invited to ConsumerDirect BDR OS 🚀`

---

## Quick checklist
- [ ] Site URL + redirect URLs updated (fixes localhost error)
- [ ] Custom SMTP enabled with ConsumerDirect credentials
- [ ] Sender domain verified (SPF/DKIM) with the email provider
- [ ] `confirm-signup.html` pasted into **Confirm signup**
- [ ] `invite-rep.html` pasted into **Invite user**
- [ ] Subjects set
- [ ] Sent a test signup and it looks right
