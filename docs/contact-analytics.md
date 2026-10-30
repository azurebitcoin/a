# Contact letters and analytics

The Ukrainian (`/kontakti.html`) and English (`/en/kontakti.html`) forms are
letter preparation tools. They do not POST a request to the foundation, send
email, or verify delivery. Both lead to their own language's
`dyakuyemo-za-zvernennya.html`, which is a draft review page despite its historic
URL. Visiting that URL is never evidence of a received request.

## Event contract

| Stage / action | Event | What it establishes |
| --- | --- | --- |
| Valid form creates a draft | `contact_letter_prepared` | Text was prepared locally. One event per preparation measured with consent, including a second draft in the same session. |
| User activates “Open in your email” | `contact_send_intent` | The user asked the browser to open a composed email. It does not establish that a mail app opened, the user pressed Send, or mail arrived. Each activation is an action. |
| Clipboard write succeeds | `contact_letter_copied` | Text was copied. Selecting text after a clipboard failure does not count as a successful copy. |
| Verified receipt by the foundation | `generate_lead` (reserved; not emitted by this site) | Requires a trusted server/mailbox/CRM acknowledgement. There is currently no such integration. |
| Other email / telephone links | `contact_click` | A contact link was activated, not a received request. The prepared-letter button uses only `contact_send_intent`, avoiding a duplicate `contact_click`. |

The three letter events contain only `contact_source: letter_form`, the page
language (`uk` or `en`), and a fixed `contact_topic` code. The bilingual categories
normalize to `military_aid`, `military_dental`, `children`, `displaced_people`,
`hospitals`, `animals`, `volunteering`, `reporting`, or `other`. Unknown values
become `other`. Names, email addresses, telephone numbers, city, message text,
raw subjects, draft identifiers and composed `mailto:` URLs are never event
parameters. The mail link's DOM `href` stays a generic foundation email address;
the composed URL is constructed locally only when activated.

Custom events require the existing explicit analytics consent. A pending
preparation may be recorded when consent is granted on the draft page, then is
consumed so reloads and repeated consent notifications do not duplicate it.
Unconsented copy/open actions are not queued or replayed. Old
`andriuk_lead_pending` flags are discarded without recording an event.
If session storage is unavailable or cannot store the complete draft, the text
and email/copy controls stay on the contact page instead of losing the draft
through a redirect. This fallback uses memory for its pending preparation.

The browser no longer emits `generate_lead`, `contact_submit` or
`volunteer_interest` for contact letters. Volunteering preparations are now the
`volunteering` topic of `contact_letter_prepared`, not an additional conversion.
Donation events and donation conversion tags are outside this change.

## GA4 / Google Ads rollout

Repository changes cannot inspect or change account-level conversion rules.
Before treating contact metrics as received requests, the account owner should:

1. In GA4, inspect key events, created/modified events, and any tag-manager rules
   derived from `generate_lead`, `contact_submit`, `volunteer_interest`, automatic
   `form_submit`, or either contact draft URL (including `/en/`). Remove draft
   preparation and page visits from confirmed-contact conversions.
2. In Google Ads, audit imported GA4 events, direct conversion tags, URL rules,
   primary/secondary status, account-default goals and campaign-specific goals.
   Do not use the new preparation/copy/intent events as primary received-lead
   goals. They can be secondary observations if useful. Historical lead counts
   from the old events cannot be reclassified as delivered mail by this fix.
3. Review GA4 Enhanced measurement **Form interactions**: `form_submit` detects
   a form interaction and does not verify receipt. Disable it for this stream if
   it creates misleading goals or unwanted duplicate counts. Review outbound
   click and user-provided-data settings as well; do not collect form contents.
4. With consent granted, inspect both languages in DebugView / Tag Assistant.
   Expect one preparation, one intent per mail-button activation and one copy
   per successful clipboard write. Reload/direct visits must not create new
   preparations. Reject/revoke consent and confirm these custom events stop.
5. Separately test real email sending and receipt in the foundation's mailbox.
   Opening `mailto:` is insufficient evidence. A future receipt integration must
   validate a trusted acknowledgement, deduplicate receipts, honor consent and
   pass only approved non-personal metadata to analytics. Do not add a browser
   “I sent it” flag or a thank-you-page event as a substitute.

The current source has GA4 `G-8ES52L4R1P` and Ads `AW-18467119985` configured.
The presence of those IDs does not verify Google Ads goals or mailbox delivery.

Official references:

- [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#generate_lead)
- [Enhanced measurement events and their parameters](https://support.google.com/analytics/answer/9216061?hl=en)
- [Google Analytics collection policy](https://developers.google.com/analytics/devguides/collection/protocol/ga4/policy)

## Automated verification

Use Node.js 24, run `npm ci --ignore-scripts`, then
`npx playwright install --with-deps chromium --only-shell` and `npm test`.
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` optionally selects an already installed
Chromium binary. The GitHub Actions Contact flow workflow runs the same suite.

The tests serve the real HTML and JavaScript locally in Chromium, intercept all
external network requests (including Google tags), and inspect the `gtag` queue.
They never send test letters or analytics hits to live services. They cover both
languages, validation, draft restoration, repeated preparations, consent,
storage/clipboard failures, legacy flags, topic allowlisting and personal-data
exclusion. Live GA4 ingestion, account conversion settings, opening a native
email app and actual delivery require separate verification.
