# Social Command Center

MVP for planning social campaigns, saving Profiles, Brand Voice Rules, Company Knowledge inputs, and reusable media assets, generating platform-specific draft posts, and repurposing approved content across channels.

## Run locally

```bash
npm install
npm run dev
```

Then open:

```bash
http://localhost:3000
```

## Deploy to Vercel

This is a standard Next.js App Router app and can be deployed to Vercel.

1. Push the project to a Git repository.
2. In Vercel, click `Add New Project` and import the repository.
3. Keep the default framework preset as `Next.js`.
4. Add the required environment variables in Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
```

5. Deploy the project.
6. In Supabase, open `Authentication > URL Configuration` and add:

```bash
https://YOUR-VERCEL-DOMAIN/reset-password
```

Set the production Site URL to your Vercel domain as well.

7. In Supabase SQL Editor, run the full schema in `supabase/schema.sql`.
8. Visit the Vercel URL, create or sign in to an account, and confirm the app
   creates/loads the default `Conduit` workspace.

### Deployment environment variables

Required for shared production mode:

- `NEXT_PUBLIC_SUPABASE_URL`: safe public Supabase project URL used by the browser client.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: safe public Supabase anon key used by the browser client with authenticated RLS.
- `SUPABASE_SERVICE_ROLE_KEY`: secret server-only key for server utilities and smoke tests. Never expose it in client code.
- `OPENAI_API_KEY`: secret server-only key used only by API routes for generation and image analysis.

Optional:

- `OPENAI_MODEL`: model override for server-side OpenAI calls. Defaults are set in the API routes.

Only variables prefixed with `NEXT_PUBLIC_` are available to browser code. Do
not prefix `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`.

### Serverless behavior on Vercel

The app's API routes are marked for the Node.js runtime:

- `POST /api/generate`
- `POST /api/analyze-media`
- `POST /api/fetch-url`
- `POST /api/extract-document`
- `GET /api/status`

OpenAI generation, image analysis, website fetching, and document extraction run
server-side. Uploaded campaign/media files are stored in Supabase Storage when
Supabase is configured. Browser previews may still use temporary object URLs for
the current session.

Keep upload sizes practical for serverless requests. Company Knowledge document
extraction currently rejects files over 8MB. Very large images may exceed
serverless request limits during AI image analysis; upload smaller screenshots or
save media without analysis if that happens.

## Add OpenAI generation

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Add your API key:

```bash
OPENAI_API_KEY=your_key_here
```

Restart the dev server after editing `.env.local`.

The key is only read in the server-side route at `POST /api/generate`. It is not exposed to browser/client code.

## Mock fallback

If `OPENAI_API_KEY` is missing, the app automatically uses the local mock generator.

If the OpenAI API call fails, the Create Post screen shows an error and lets you use mock generation instead. Campaigns, Profiles, Company Knowledge items, statuses, and edited posts still save locally in browser `localStorage`.

## Repurpose workflow

Approved posts and campaign cards include repurpose actions. A repurposed campaign keeps a reference to the original campaign or post, then generates platform-native drafts for selected target channels. The generator is instructed to preserve the core idea, avoid copying the source word-for-word, and adjust length, format, tone, and media use for each platform.

## Ready to Post

Approved generated posts are automatically added to the Ready to Post. The queue is for manual publishing coordination only: you can filter by platform, profile, status, or campaign, set planned publish times, copy post text, preview the post, mark it posted, or archive it. Real social posting is not connected yet.

When a queued post is marked `Posted`, you can track manual publishing details:

- live post URL
- posted date/time
- notes
- impressions
- likes
- comments
- shares/reposts
- saves
- clicks

These fields save with the queue item in Supabase when configured, or local
fallback otherwise. The Analytics page shows total posted posts, impressions,
likes, best platform by engagement, and top posts by engagement.

## Intake

`Intake` is the universal front door for new material. It combines one-off
source triage, browser captures, and past-content imports so you do not have to
decide the perfect destination first.

It accepts:

- website, blog, document, social profile, and social post URLs
- pasted text, transcripts, notes, or rough ideas
- document uploads
- screenshot uploads
- reusable media uploads
- raw post ideas

Click `Classify source` to get a recommended destination, confidence, and why
the source belongs there. You can confirm the recommendation or change it before
saving.

Destination options:

- `Company Knowledge`: Conduit truth layer, proof points, source material, and
  reviewed context.
- `Profile Voice Source`: internal/company/founder/team voice and cadence.
- `Inspiration / Reference Profile`: external pattern-only inspiration.
- `Competitor / Market Watch`: saved for market context and future monitoring.
- `Audience Persona`: customer or audience voice/context.
- `Media Library`: reusable visual/audio assets.
- `Create Post / Content Brief`: starts a new draft brief from the intake.
- `Manual review only`: keeps the item in intake history without using it yet.

Important behavior:

- Normal public website/blog URLs can use the existing website fetch flow.
- Social links are saved as source links only. The app does not scrape X,
  LinkedIn, Instagram, TikTok, YouTube, or Facebook.
- External inspiration stays pattern-only and must never provide Conduit facts,
  claims, or identity.
- Company Knowledge remains the source of truth for generated claims.
- Intake keeps recent history with status and destination links.

### Browser capture bookmarklet

Intake includes a lightweight `Browser capture` helper. Drag the
`Capture to Conduit` button from Intake to your browser bookmarks bar.
When you see a page, article, social post, or opportunity:

1. Select useful text on the page if you want to include an excerpt.
2. Click the bookmarklet.
3. The bookmarklet opens `/capture` with query params:
   - `url`: current page URL
   - `title`: current page title
   - `text`: selected text, if any
   - `capturedAt`: timestamp
4. `/capture` stores the payload in Intake browser captures using local
   browser storage, keeps a temporary `sessionStorage` copy for the current
   redirect, and then returns to the app. If you are signed out, captures remain
   in that browser and can be reviewed after login.
5. Intake shows Browser Captures so captured links, selected text, and
   browser inputs can be triaged later. Each capture can be routed to Company
   Knowledge, Opportunity Inbox, a Profile Voice Source, Media Library, Create
   Post, or Manual Review.
6. If Supabase is configured and the workspace is loaded, the app also persists
   captures to the `source_captures` table. Social links are saved and triaged,
   but they are not scraped automatically.

This is not a browser extension and it does not scrape social platforms.
LinkedIn, X, Instagram, TikTok, YouTube, and similar links are saved and
triaged as references. Add screenshots, pasted text, notes, or future official
API sync before treating social content as analyzed.

### Past Content Import

Intake also includes `Import past content` for manual past-content imports. Use
it to paste multiple old posts or captions, upload CSV exports, upload
TXT/Markdown files, or paste simple JSON. Pasted text is split into individual
items by blank lines.

CSV import is flexible and looks for common columns when present:

- `platform`
- `post copy`, `caption`, `content`, or `text`
- `date`
- `author`, `profile`, or `posting account`
- `url`
- `impressions`, `likes`, `comments`, `shares`/`reposts`, `saves`, `clicks`
- `notes`
- `status`

Before saving, the import review step lets you choose a destination for each
item:

- `Content Library`
- `Profile Voice Source`
- `Approved examples`
- `Company Knowledge`
- `Feedback Memory`
- `Manual review`

Founder and company posts can be imported as Profile voice examples and
optionally analyzed with deterministic fallback voice analysis. Past Conduit
posts can be saved into Content Library, marked as approved examples, and used
as positive Feedback Memory. Imported metrics are attached to posted historical
items so Analytics and Performance Insights can use them.

Inspiration/reference and competitor imports default to pattern-only behavior.
They can teach structure, cadence, hooks, and style, but they never become
Conduit facts or claims. Company Knowledge remains the truth layer.

## Opportunity Inbox

`Opportunity Inbox` is the manual social listening layer. Use it for potential
posts, replies, mentions, trend ideas, competitor posts, news links, founder
thoughts, sales notes, or customer stories that Conduit may want to respond to
or turn into content.

It is intentionally manual for now:

- no social monitoring APIs are connected
- no social platforms are scraped
- source URLs are saved as references
- analysis uses the pasted note/text, screenshot metadata, and user-provided
  context

Opportunity analysis can suggest why something matters, a Conduit angle,
whether it should become a reply or standalone post, possible platforms,
relevant Conduit Brain themes, risks, and a first draft idea. From an
opportunity you can:

- create a post/content brief
- draft a reply
- save useful context to Company Knowledge
- save an external reference as an Inspiration / Reference profile
- mark reviewed or archive

Reply drafting is a dedicated safe-response workflow. Paste the comment,
mention, shoutout, competitor claim, or question, then use `Draft reply` to
generate a short reply, warmer reply, founder-led reply, and optional longer
reply. Replies use Company Knowledge as the truth layer, Brand Voice Rules as
guardrails, and the selected posting account for perspective. Approved replies
are saved into Content Library as reply content. Nothing is posted
automatically.

When a post is created from an opportunity, Content Library shows
`Created from opportunity` so performance can be traced later. Future
integrations can feed this inbox automatically once account permissions and
social listening APIs are ready.

The classification route is `POST /api/intake/classify-source`. It uses OpenAI
when `OPENAI_API_KEY` is configured and a deterministic fallback when it is not.

## Instagram sandbox scaffolding

The `Connections` page includes an Instagram sandbox setup panel. This is
planning and validation scaffolding only: real Instagram publishing and real
Conduit account connections are still disabled.

The setup supports two sandbox paths:

**Instagram Login path**

- Intended for Instagram Professional accounts, including Creator sandbox accounts.
- Requires a Creator or Business account type.
- Requires Meta Developer App, Instagram Login configuration, redirect URL,
  Instagram permissions, Instagram User ID, and server-side token status.
- May avoid the Facebook Page-centered setup while still staying sandbox-only.

**Facebook Page / Graph API path**

- Requires an Instagram Professional account connected to a Facebook Page.
- Requires Facebook Page ID, Instagram Business Account ID, and server-side page
  access token status.

Real publishing is disabled for both paths. Manual posting remains the
production workflow.

Optional server-side env vars for future dry-run identity checks:

```bash
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
INSTAGRAM_REDIRECT_URI=
INSTAGRAM_SANDBOX_META_APP_ID=
INSTAGRAM_SANDBOX_USER_ID=
INSTAGRAM_SANDBOX_USERNAME=
INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID=
INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID=
INSTAGRAM_SANDBOX_ACCESS_TOKEN=
```

Keep `INSTAGRAM_SANDBOX_ACCESS_TOKEN` server-side only. Do not paste it into
the Connections UI and do not store the raw token in Supabase. The server routes
only return token status:

- `available_server_side`
- `missing`
- `expired_or_invalid`

If `INSTAGRAM_SANDBOX_ACCESS_TOKEN` and `INSTAGRAM_SANDBOX_USER_ID` are present,
the Instagram status and identity routes can perform a server-side sandbox
identity check and return only metadata such as username, user ID, check status,
and last checked time.

For local development, set `INSTAGRAM_REDIRECT_URI` to:

```bash
http://localhost:3000/api/integrations/instagram/oauth/callback
```

For Vercel, set it to:

```bash
https://YOUR-VERCEL-DOMAIN/api/integrations/instagram/oauth/callback
```

Add the same redirect URI in the Meta Developer App's Instagram Login settings.
The OAuth skeleton starts Instagram Login, handles the callback server-side,
exchanges the code for a token, fetches Instagram identity, and stores only
connection metadata plus token status. The raw token is not persisted; encrypted
token storage must be added before publishing is enabled.

The UI does not store real token values. It stores only token availability
status and setup metadata in `social_connections`. Prefer server-side env vars
for sandbox secrets. The current API routes are dry-run placeholders:

- `GET /api/integrations/instagram/oauth/start`
- `GET /api/integrations/instagram/oauth/callback`
- `POST /api/integrations/instagram/disconnect`
- `GET /api/integrations/instagram/status`
- `POST /api/integrations/instagram/test-identity`
- `POST /api/integrations/instagram/test-publish-dry-run`
- `POST /api/integrations/instagram/publish-readiness`

Manual publishing remains the production workflow: copy the caption, download
media, open Instagram, publish manually, paste the live URL, and enter metrics.

Instagram Ready to Post cards include a `Check Instagram publish readiness`
button. It validates whether the queued post has Instagram media, a reasonable
caption, the selected integration path requirements, and token availability. It
always returns a dry-run result and never publishes.

## Website fetching for Company Knowledge

Company Knowledge items can pull text from normal public website, blog, and
marketing page URLs.

1. Open `Company Knowledge`.
2. Add or edit an item with a public website URL.
3. Click `Fetch website content` on the saved item card.
4. The server fetches the HTML, extracts readable page text, appends it to the
   item's pasted content, updates `Last checked`, recalculates the local mock
   analysis, and saves through Supabase or local fallback.

Limitations:

- Only public webpages are supported.
- LinkedIn, X/Twitter, Instagram, TikTok, Facebook, and YouTube URLs are blocked
  for now because they require platform API access or account connections.
- Some sites may block automated fetching. Paste content manually when that
  happens.
- The fetcher extracts plain text only; it does not scrape private pages,
  authenticate, crawl multiple pages, or sync accounts.

## Document upload for Company Knowledge

Company Knowledge items also support document uploads for source material like
pitch notes, marketing docs, founder notes, transcripts, and public research.

Supported now:

- `.txt`
- `.md` / `.markdown`
- plain-text transcript files such as `.transcript`, `.vtt`, and `.srt`
- text-readable `.pdf` files when basic text extraction succeeds

Recognized but limited:

- `.docx` files are rejected with a clear message for now. Export the document
  as `.txt` or paste the content until a dedicated DOCX parser is added.
- Some PDFs store text in a way that basic extraction cannot read. Paste the PDF
  text manually if extraction fails.

How it works:

1. Open `Company Knowledge`.
2. Click `Upload document` on a saved item.
3. The server extracts readable text.
4. If Supabase is configured, the original file is uploaded to the
   `campaign-media` bucket under `knowledge-documents/...`.
5. The extracted text is appended to the item's pasted content under the label
   `Extracted from document`.
6. File metadata is saved on the Company Knowledge item, including filename,
   file type, storage path, extracted text length, and upload time.

Security note: avoid uploading sensitive customer, account, credential, or
private operational data until auth, permissions, and storage access rules are
finalized for production.

## Transcript and notes ingestion

Company Knowledge includes an `Add transcript / notes` flow for meeting notes,
Granola transcripts, founder notes, sales notes, customer conversations,
investor narratives, and product notes.

The flow saves:

- title
- source type
- pasted transcript or notes
- optional speaker labels
- optional date
- optional tags
- intended use, such as Company Knowledge, Danny voice example, Sahil voice
  example, customer pain source, product/source material, or save-only

When `OPENAI_API_KEY` is configured, `/api/analyze-transcript` extracts key
themes, useful phrases, customer pain points, product claims, founder voice
examples, proof points, post ideas, and public safety notes. Without OpenAI, the
app uses deterministic fallback analysis so the source can still be saved.

Safe default: new transcript and notes sources are marked `Needs review` before
they are used automatically in the Conduit Brain. Review the details panel, then
choose `Use in Brain` when the source is safe to influence generation.

Security note: avoid uploading sensitive customer/account data until permissions
are confirmed.

## Profile Source Sync and Voice Learning

Profiles are designed to learn voice primarily from saved voice sources:
account/profile URLs, specific post URLs, website/blog URLs, uploaded
screenshots, pasted examples, and notes/transcript snippets. Open a profile,
choose `Voice Sources`, and add a voice source.

API keys are not required per profile. X, LinkedIn, Instagram, and TikTok direct
sync require official platform API access and are not connected yet. The app
does not scrape social platforms and does not pretend account sync works before
it does. Owned-account API sync can be added later for Conduit, Danny, Sahil, or
other approved accounts.

For analysis today, use screenshots, pasted text, notes, public website/blog
fetches, or best-effort public page analysis. Website/blog/doc URLs can be
fetched through `POST /api/profile-sources/fetch` when the site allows public
fetching. Social profile and post URLs are saved as first-class sources. They
are not recurring sync connections, and saved-only links do not influence
generation.

`Try public analysis` on a social source runs
`POST /api/profile-sources/public-link-analysis`. The route attempts one safe
public fetch of the page, extracts readable text/metadata when available, and
analyzes only content that is actually visible to the server. If LinkedIn, X,
Instagram, TikTok, YouTube, or another platform blocks the request, the app
marks the source `Saved link, fetch blocked`, keeps the URL, and suggests
screenshots, pasted examples, notes, or future official API sync. LinkedIn
company posts pages such as `linkedin.com/company/.../posts` often block
automated fetching, so screenshots or pasted posts remain the practical fallback
until approved API access exists.

Source fetching rules:

- website/blog/doc links: fetched server-side when public and readable, then
  marked `Fetched, ready to analyze`
- public social links: one-time best-effort public analysis when readable, then
  marked `Public page analyzed`; if blocked, marked `Saved link, fetch blocked`
- owned/internal social links: saved for future official API sync, with
  screenshots/pasted examples available for analysis today
- external inspiration/reference links: saved as pattern-only inspiration; no
  API keys are requested and no facts/claims are learned from them
- competitor/market watch links: saved for future monitoring; no scraping or
  analysis is performed unless approved content is pasted or uploaded

Each profile source stores:

- source title
- source kind: account URL, post URL, website, screenshot, pasted text, or notes
- URL
- platform
- uploaded screenshot metadata when present
- pasted or fetched text when present
- source type, such as internal voice, company account, inspiration/reference,
  competitor/market watch, or audience/persona
- sync status
- last synced / last analyzed
- notes
- pattern-only flag
- analysis JSON when available

The `API sync later` action is a safe placeholder for now. It explains that API
sync is optional future work and recommends screenshots or pasted text for
analysis today.

Manual pasted examples remain available as a fallback in the same `Voice
Sources` tab. Paste posts, captions, founder notes, transcript snippets, or
other examples when you want the app to analyze voice before API sync exists.

Each example stores:

- title
- platform/source
- pasted content
- optional notes
- whether it should be used as a voice/style example
- whether it is pattern-only and should not be copied
- voice analysis when available

When `OPENAI_API_KEY` is configured, `/api/analyze-profile-voice` extracts tone
traits, hook patterns, sentence style, common topics, repeated phrases,
formatting habits, reusable structures, what to imitate, what not to copy,
platform-specific patterns, and confidence level. Without OpenAI, the app uses
deterministic fallback analysis.

Analyzed sources and manual examples roll up into the profile personality
summary and can influence future generation through Posting Account, Simple Mode
learned voice chips, or Advanced Mode Voice Influence. Saved links with no
analysis are not treated as learned style. External Inspiration / Reference
profiles are always pattern-only: they can influence structure, format, and
energy, but never facts, claims, identity, or exact wording. Company Knowledge
remains the source of truth for what Conduit says.

Profile source routes:

- `POST /api/profile-sources/fetch`
- `POST /api/profile-sources/sync`
- `POST /api/profile-sources/analyze`
- `POST /api/profile-sources/public-link-analysis`
- `GET /api/profile-sources/status`

## Inspiration / Reference profiles

Inspiration Patterns have been merged into Profiles. Use profile type
`Inspiration / Reference` for outside brands, creators, companies, media teams,
and trends. Use `Competitor / Market Watch` for market references and
competitors. These profiles are pattern-only: they can influence structure,
hooks, pacing, tone, visual ideas, and creative formats, but never Conduit
facts, claims, identity, or exact wording.

Company Knowledge remains the truth layer. Brand Voice Rules remain the global
guardrails. Inspiration/reference profiles must never override either one.

Inside a profile, add source links, screenshots, pasted examples, notes, or
public website/blog pages from the Voice Sources tab. Social links are saved as
references only and are not scraped. Website/blog links can be fetched when
public. Screenshots and pasted examples can be analyzed now. Future official
API sync can be added later for owned/supported accounts, but external
inspiration profiles do not require API keys.

Older Inspiration Pattern records are preserved as imported pattern-only
reference material under Profiles and summarized in Company Knowledge as
profile inspiration signals. New Create Post briefs should use Inspiration /
Reference profiles from Advanced Mode instead of a separate Inspiration
Patterns library.

These routes do not call X, LinkedIn, Instagram, or TikTok APIs yet.
`/api/profile-sources/sync` is intentionally a future-work placeholder.

## Media Library

The Media Library stores reusable social assets so you can upload a photo,
screenshot, video, or audio file once and use it in future posts.

Supported media:

- images: `.png`, `.jpg`, `.jpeg`, `.webp`
- videos: `.mp4`, `.mov`, `.webm`
- audio: `.mp3`, `.wav`, `.m4a`

When Supabase is configured, files are uploaded to the `campaign-media` bucket
under `media-library/...` and metadata is saved in the `media_library` table.
Without Supabase, metadata is stored in local fallback data and previews use a
session-only object URL.

Image assets can be analyzed server-side with OpenAI Vision when
`OPENAI_API_KEY` is present. The analysis stores a visual description,
suggested post angles, overlay text, sensitivity warnings, alt text, and tags.
Video and audio assets are stored with notes for now; transcription and frame
analysis can be added later.

In `Create Post`, choose either `Upload media` for a one-off campaign asset or
`Select from Media Library` to reuse a saved asset.

### Media-to-Post Packs

From any Media Library asset, use `Generate content pack` to create a normal
Content Brief backed by that media asset. The setup panel asks for posting
account, style, main message, optional context notes, and selected platforms.

The generated pack creates platform-native drafts for LinkedIn, X, Instagram,
and/or TikTok/Reels, including post copy, overlay text, alt text, CTA, hashtags
where useful, and short-form hook/script ideas. The drafts are saved as normal
generated posts and opened in Review Drafts, so Post Readiness, Brand Safety,
founder review, approval, Ready to Post, Content Calendar, Analytics, and
Content Library all continue to work the same way.

Generated briefs keep `mediaContext.assetId`, so the Media Library Usage tab can
show which briefs/posts came from each asset. Video and audio packs use filename
and notes for now; transcription and frame analysis remain future work.

## Demo mode

Use the Dashboard `Load demo data` button to add presentation-ready sample data without deleting anything you already created. The demo set includes labeled founder and company profiles, Company Knowledge items, Brand Voice Rules, one campaign, and approved post examples.

Clicking `Load demo data` again will not duplicate the same demo records. Use `Clear demo data` to remove only records labeled as demo data; user-created profiles, campaigns, Company Knowledge items, and approvals are left alone.

## Add Supabase persistence

Create `.env.local` from the example file:

```bash
cp .env.local.example .env.local
```

Add your Supabase project values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are used by the browser client. `SUPABASE_SERVICE_ROLE_KEY` is kept server-only for future server operations and must not be exposed in client code.

### Database schema

Open the Supabase SQL editor and run:

```sql
-- see the full migration in supabase/schema.sql
```

The schema creates:

- `profiles`
- `knowledge_base_items`
- `brand_rules`
- `campaigns`
- `generated_posts`
- `post_feedback`
- `media_files`
- `media_library`
- `approved_posts`
- `rejected_posts`
- `post_queue`

The migration is safe to run more than once. It creates missing tables, adds any
missing columns for existing projects, enables RLS, and installs authenticated
workspace-scoped MVP policies.

### RLS policy model

The app now uses Supabase Auth with email/password sign-in. If Supabase env vars
are configured, users must sign in before seeing shared data. On first login,
the app creates a default workspace named `Conduit`.

### Password reset

The login screen includes a `Forgot password?` link. It uses Supabase Auth's
password reset email flow and redirects reset links back to:

```bash
http://localhost:3000/reset-password
```

For production, add your deployed app URL in Supabase under
`Authentication > URL Configuration`:

- Site URL: your production app URL
- Redirect URLs: `https://YOUR-VERCEL-DOMAIN/reset-password`

For local development, make sure `http://localhost:3000/reset-password` is
allowed as a redirect URL. After the user sets a new password, the reset page
redirects back to the app.

Rows are scoped by `workspace_id` for:

- `profiles`
- `knowledge_base_items`
- `brand_rules`
- `campaigns`
- `generated_posts`
- `approved_posts`
- `rejected_posts`
- `post_queue`
- `media_library`
- `media_files`
- `post_feedback`

Workspace membership is stored in:

- `workspaces`
- `workspace_members`

Roles:

- `owner` and `admin`: can create, edit, and delete workspace data
- `editor`: can create campaigns, approve posts, and update queue/content
- `viewer`: can view workspace data only

The browser still uses:

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

But once a user signs in, requests run as the authenticated user. `supabase/schema.sql`
revokes anonymous table writes and adds policies so users can only access rows
for workspaces they belong to. Transitional rows with `workspace_id = null` can
be read by signed-in users so old internal demo data can be migrated manually;
new app writes include the active workspace id.

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It is currently used only by
server-side utilities/status checks when needed, and must never be exposed in
browser code.

### Storage bucket

The SQL file also creates a public Storage bucket called `campaign-media` and authenticated policies for internal MVP uploads. Uploaded campaign images, videos, audio files, Company Knowledge documents, profile avatars, and reusable Media Library assets are saved there when Supabase is configured.

### Verify Supabase writes

After running `supabase/schema.sql`, you can run a practical authenticated workspace write test:

```bash
npm run supabase:smoke
```

The test creates a temporary Supabase Auth user, workspace, workspace member,
profile, Company Knowledge item, campaign, generated post, approved post,
rejected post, Ready to Post queue item, Media Library row, and post feedback
row, then cleans them up. It requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
so it can create and remove the temporary Auth user. If it fails with an RLS
error, rerun the SQL migration in the Supabase SQL editor and restart
`npm run dev`.

The app also exposes a development status endpoint:

```bash
http://localhost:3000/api/status
```

It reports whether Supabase env vars exist, whether app tables are reachable,
and whether the `campaign-media` bucket can be reached. It never returns secret
key values.

### Feedback Memory

Feedback Memory stores lightweight preference signals from edits,
regeneration instructions, approvals, rejections, review notes, Brand Safety
actions, and Post Readiness actions. It summarizes patterns such as preferring
shorter posts, stronger hooks, fewer hashtags, more factory-floor specificity,
less corporate language, or more media-grounded captions.

This is not model fine-tuning. It is structured workspace data that is included
in generation prompts as taste/style guidance. Company Knowledge remains the
truth layer and Brand Voice Rules remain the global guardrails. Feedback Memory
can be turned off, ignored item by item, marked important, or deleted from the
Brand Voice Rules page.

### Claim Library

Company Knowledge includes a Claim Library inside the Conduit Brain. Use it to
separate what Conduit can safely say from claims that need review or should be
avoided.

Claim types include:

- Approved claim
- Needs review
- Do not say
- Customer-sensitive
- Proof-backed
- Internal only

Each claim can store the claim text, supporting source, source type, notes, risk
level, reviewer, and last reviewed date. Claims are saved in Supabase in the
`claim_library` table when shared storage is configured, with local browser
fallback in local mode.

The Claim Library does not automatically approve extracted statements. The
`Extract candidate claims` action scans active Company Knowledge and adds
candidates as review-needed items so a human can approve, edit, or mark them as
do-not-say.

Generation receives approved/proof-backed claims and do-not-say claims as part
of the prompt context. It is instructed to prefer approved claims when relevant,
avoid do-not-say claims and close rewrites, and keep needs-review claims out of
public post copy unless reviewed. Company Knowledge remains the truth layer.

Brand Safety / Claim Check compares drafts against the Claim Library. Approved
matches show as supported, needs-review matches are flagged for review, and
do-not-say matches are marked risky. Post Readiness also rewards approved or
proof-backed claims and penalizes unsupported or review-needed claims.

### Activity Log and Undo

The Dashboard includes a lightweight Activity Log under Recent activity. It
records major workspace actions such as captures, routing, opportunity work,
approvals, queue changes, scheduling, archiving, hiding completed items,
marking posts/replies done, and Feedback Memory signals.

Activity Log is a safety layer, not the content archive. Content Library remains
the permanent record of created, approved, posted, replied, archived, and
repurposed content.

Some actions include safe undo/restore support:

- Hidden queue items can be restored.
- Archived queue items, captures, and opportunities can be restored.
- Clearing completed items from the Ready queue can be undone.

Destructive test/demo deletes still require confirmation and are logged when
they happen. Activity data is saved to Supabase when configured and falls back
to local browser storage in local mode.

### Manager Review Links

Content Calendar and Ready to Post include `Share review link` actions for
limited manager review. A link can be scoped to this week, a selected date
range, selected posts/replies, Ready to Post only, or scheduled content only.

Permissions are limited to:

- View only
- Comment only
- Can suggest edits
- Can approve/request changes

Manager links open a restricted `/manager-review/[token]` portal. The portal
shows only scoped schedule/queue content, copy, planned timing, media preview,
readiness/safety summary, and review notes. It does not expose Company
Knowledge, Profiles, Brand Voice Rules, admin screens, API keys, tokens, or any
publishing controls.

Suggested edits never overwrite the original automatically. They are saved as
review feedback and appear in the main app, where the team can accept the edit,
regenerate from feedback, or mark the item approved. Shared review data is saved
in Supabase using the `review_links` and `review_feedback` tables. Local mode can
draft link settings, but externally shareable manager portals require Supabase
and the updated schema.

### Fallback behavior

If Supabase environment variables are missing, the app automatically uses local browser `localStorage` like before. If Supabase is configured but no user is signed in, the app shows a sign-in screen instead of loading shared workspace data.

If the Supabase tables are not set up yet or a Supabase request fails during startup, the app falls back to local mode and shows a notice. The Dashboard button is labeled `Reset local fallback data`; it clears only browser fallback data and does not delete Supabase records.

If a save fails during normal use, the UI shows a clean message and keeps the
technical Supabase error in debug details or the browser console. The local
fallback remains available for approval memory and Ready to Post queue items.

## Current limits

- No social account connections yet
- No social URL scraping/fetching yet
- Company Knowledge can fetch normal public website URLs; social/profile URLs are stored only
- Company Knowledge can extract plain text/Markdown/transcript files and some readable PDFs; DOCX needs a parser later
- Media Library can analyze images; video/audio transcription and frame analysis are placeholders for now
- Basic Supabase Auth and workspace permissions are in place, but social account OAuth/publishing permissions are not connected yet
- Instagram sandbox scaffolding is available for setup/dry-run checks only; real publishing is disabled
