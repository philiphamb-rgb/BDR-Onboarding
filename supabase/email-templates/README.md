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

| Field | What to enter | Example |
|---|---|---|
| Sender email | the "from" address reps see | `onboarding@consumerdirect.com` |
| Sender name | the display name | `ConsumerDirect BDR OS` |
| Host | your mail provider's SMTP host | `smtp.sendgrid.net` |
| Port | usually `587` | `587` |
| Username | SMTP username | (from provider) |
| Password | SMTP password / API key | (from provider) |

**You need to get these 6 values** from whoever runs ConsumerDirect email.
Most companies use one of: SendGrid, Amazon SES, Postmark, Mailgun, or
Google Workspace SMTP. Any of them works — you just need the host, port,
username, and password from that provider, plus a from-address you're
allowed to send from.

> Important: the sender domain must be verified with your email provider
> (SPF/DKIM records), or messages land in spam. The provider walks you
> through this when you add the domain.

Once saved, send yourself a test signup to confirm it arrives from your address.

---

## 3. Make the emails beautiful (paste the templates)

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
