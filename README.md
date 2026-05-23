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

## Instagram sandbox scaffolding

The `Connections` page includes an Instagram sandbox setup panel. This is
planning and validation scaffolding only: real Instagram publishing, OAuth, and
real Conduit account connections are still disabled.

Sandbox account requirements before future API testing:

- Instagram account is Business/Professional.
- Instagram account is connected to a Facebook Page.
- Meta Developer App exists.
- Redirect URL is configured in the Meta app.
- Required Instagram Graph API permissions are configured.
- Sandbox access token is available.

Optional server-side env vars for future dry-run identity checks:

```bash
INSTAGRAM_SANDBOX_META_APP_ID=
INSTAGRAM_SANDBOX_BUSINESS_ACCOUNT_ID=
INSTAGRAM_SANDBOX_FACEBOOK_PAGE_ID=
INSTAGRAM_SANDBOX_ACCESS_TOKEN=
```

The UI does not store real token values. It stores only token availability
status and setup metadata in `social_connections`. Prefer server-side env vars
for sandbox secrets. The current API routes are dry-run placeholders:

- `GET /api/integrations/instagram/status`
- `POST /api/integrations/instagram/test-identity`
- `POST /api/integrations/instagram/test-publish-dry-run`

Manual publishing remains the production workflow: copy the caption, download
media, open Instagram, publish manually, paste the live URL, and enter metrics.

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
