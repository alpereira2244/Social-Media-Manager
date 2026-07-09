# Phase 5 Workflow QA Audit

Date: 2026-07-06

## Scope

Phase 5 is focused on workflow-level QA and product readiness after the large feature buildout. The goal is to verify the app feels recoverable and usable across the main command-center loop:

- Dashboard orientation
- Source/Capture intake
- Opportunity and reply workflow
- Review and manager feedback
- Ready to Post / Ready to Reply execution
- Calendar, Analytics, Content Library, and history
- Local/Supabase startup behavior

## Changes made during this pass

### Root loading hardening

Files:

- `app/page.tsx`
- `app/home-client.tsx`

The home route now renders a lightweight client wrapper that dynamically loads the large `SocialCommandCenter` bundle with a compact loading shell. This keeps the App Router page small and avoids server-rendering the entire command-center client component at the root.

### Icon import optimization

File: `next.config.mjs`

- Enabled Next package import optimization for `lucide-react`.
- This is a safe compile/bundle reduction because the app imports many Lucide icons in the command-center UI.
- The optimization alone did not make the current dev server startup reliable, so deeper screen-level bundle splitting is still required.

### Manager review link hardening

File: `app/api/manager-review/[token]/route.ts`

- Added a fast token-shape guard for manager review API requests.
- Invalid or malformed manager review URLs now return a clean `404` without querying Supabase.
- Kept the existing server-side timeout wrappers for review link, queue, feedback, and activity log calls.

File: `app/manager-review/[token]/page.tsx`

- Manager review page already includes client-side fetch timeouts.
- Timeout messaging tells the manager to refresh or ask the Conduit team to recreate the link.

### Confirmed implemented UX recovery controls

File: `components/social-command-center.tsx`

- Archived Ready to Post / Ready to Reply queue items include a `Delete` action.
- Delete confirms before removing the archived queue item.
- Manager feedback includes `Resolve feedback`.
- Resolving manager feedback persists the feedback status as `resolved` and logs activity.
- Accepting a suggested manager edit from the Review Queue resolves the related manager feedback automatically.

### Bundle-splitting prep

Files:

- `lib/media-utils.ts`
- `lib/performance-insights.ts`
- `lib/planning-utils.ts`
- `lib/weekly-performance-reports.ts`
- `components/social-command-center.tsx`

Progress:

- Moved reusable media URL type inference into `lib/media-utils.ts`.
- Moved performance insight aggregation and weekly learning review calculations into `lib/performance-insights.ts`.
- Moved weekly content plan generation into `lib/planning-utils.ts`.
- Moved weekly performance report aggregation into `lib/weekly-performance-reports.ts`.
- Updated `components/social-command-center.tsx` to import those helpers instead of defining duplicate local copies.

Reason:

- The command-center component is still very large, but these helpers were pure enough to extract safely before moving full UI screens.
- This reduces coupling for the next split: Dashboard, Analytics, Content Calendar, and report cards can now share planning/performance logic from `lib/` instead of depending on lower sections of the monolith.

### Dashboard screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/dashboard.tsx`

Progress:

- Moved the Dashboard UI, Today view, This Week planning cards, Activity tab, System tab, Workspace Readiness card, and Dashboard-only helper cards into `components/social-command-center/dashboard.tsx`.
- Swapped the main command-center component to lazy-load the Dashboard screen through `next/dynamic`.
- Removed the old inline Dashboard implementation and Dashboard-only helper blocks from `components/social-command-center.tsx`.
- The main command-center component dropped from roughly 27k lines to roughly 22.4k lines.

Reason:

- Dashboard was one of the largest self-contained screen sections and was the best first UI-level split after the pure helper extractions.
- This preserves the same Dashboard props and behavior while reducing the amount of UI code compiled inside the main command-center module.

### Media Library screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/media-library.tsx`

Progress:

- Moved the Media Library UI, media upload flow, media asset cards, media details panel, media usage tab, media preview, and media-to-post pack setup panel into `components/social-command-center/media-library.tsx`.
- Swapped the main command-center component to lazy-load the Media Library screen through `next/dynamic`.
- Removed the old inline Media Library implementation and its Media Library-only helper blocks from `components/social-command-center.tsx`.
- The main command-center component dropped further from roughly 22.4k lines to roughly 21.5k lines.

Reason:

- Media Library had a cleaner prop boundary than Analytics/Content Calendar in the current file layout.
- Extracting it reduces another large screen surface while preserving media upload, media analysis, media usage, and content-pack generation behavior.

### Source Inbox screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/source-inbox.tsx`

Progress:

- Moved the Source Inbox UI, Browser Capture, Capture Queue, AI Triage, routing actions, and Bulk Import workflow into `components/social-command-center/source-inbox.tsx`.
- Swapped the main command-center component to lazy-load the Source Inbox screen through `next/dynamic`.
- Removed the old inline Source Inbox implementation and Source/Bulk Import-only helper blocks from `components/social-command-center.tsx`.
- The main command-center component dropped further from roughly 21.5k lines to roughly 18.7k lines.

Reason:

- Source Inbox is a natural next screen split because it already owns capture, triage, routing, and bulk import.
- This also prepares the product direction toward a unified Intake area without renaming or removing existing routes during the stability pass.

### Content Calendar screen extraction and screen wiring repair

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/dashboard.tsx`
- `components/social-command-center/content-calendar.tsx`

Progress:

- Moved the Content Calendar UI into `components/social-command-center/content-calendar.tsx`.
- Swapped the main command-center component to lazy-load the Content Calendar screen through `next/dynamic`.
- Found that Analytics, Connections, and Content Library had previously been parked in the Dashboard module while the main component still rendered them as direct local functions.
- Repaired those screen boundaries by lazy-loading Analytics, Connections, and Content Library from the Dashboard module as named exports.
- Replaced the Content Library preview dependency on the old monolith `PlatformPreview` with a compact local archive preview.
- Added local Dashboard-module helpers for Analytics reports, Content Library post details, and media preview so those lazy screens do not depend on hidden functions from `components/social-command-center.tsx`.
- The main command-center component remains roughly 18.7k lines, and Content Calendar is now roughly 865 lines in its own screen module.

Reason:

- Content Calendar was the next safest screen split after Source Inbox.
- The screen wiring repair is important because clicking Analytics, Connections, or Content Library could otherwise try to reference functions that no longer exist in the main component after the prior extractions.
- This keeps the Phase 5 split moving without changing user-facing behavior or data models.

### Analytics screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/dashboard.tsx`
- `components/social-command-center/analytics.tsx`

Progress:

- Moved the Analytics UI, Performance Insights, Weekly Review, Weekly Performance Reports, Posted Content list, and Analytics-only helper cards into `components/social-command-center/analytics.tsx`.
- Swapped the main command-center component to lazy-load Analytics directly through `next/dynamic`.
- Removed the old Analytics implementation from the Dashboard module.
- Kept shared performance math in `lib/performance-metrics.ts`, `lib/performance-insights.ts`, and `lib/weekly-performance-reports.ts`.
- The Dashboard module is now roughly 3.9k lines, and Analytics is roughly 742 lines in its own screen module.

Reason:

- Analytics was the next largest self-contained operational screen after Content Calendar.
- This reduces Dashboard’s responsibility back toward Dashboard/Connections/Content Library bucket code while continuing to chip down the monolith safely.
- A lightweight TypeScript parser check passed for Dashboard, Analytics, and Content Calendar after the split.

### Content Library screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/dashboard.tsx`
- `components/social-command-center/content-library.tsx`

Progress:

- Moved the Content Library archive UI, top-performing panel, filters, details drawer, compact preview behavior, post detail helpers, and library item builder into `components/social-command-center/content-library.tsx`.
- Swapped the main command-center component to lazy-load Content Library directly through `next/dynamic`.
- Removed the Content Library implementation from the Dashboard module while leaving Dashboard-owned stat helpers in place.
- The Dashboard module is now roughly 2.9k lines, and Content Library is roughly 1.1k lines in its own screen module.

Reason:

- Content Library was the next largest self-contained screen still parked in the Dashboard module.
- This keeps the Dashboard bundle focused on command-center overview, Connections, and remaining setup/status components.
- A lightweight TypeScript parser check passed for Dashboard, Content Library, Analytics, and Content Calendar after the split.

### Profiles screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/profiles.tsx`

Progress:

- Moved Profiles, profile cards, profile details, Voice Sources, Learned Voice, Learned Patterns, Approved Examples, avatar handling, website/source analysis controls, and profile-specific helper logic into `components/social-command-center/profiles.tsx`.
- Swapped the main command-center component to lazy-load Profiles directly through `next/dynamic`.
- Kept the legacy standalone Voice Sources screen in the main component for now because it is a separate older screen path and still shares generation helpers.
- The main command-center component is now roughly 16.6k lines, and Profiles is roughly 2.7k lines in its own screen module.

Reason:

- Profiles was the next large self-contained Intelligence/Setup screen after Content Library.
- This reduces the main component’s responsibility and isolates a large profile/voice-source workflow that has its own state, forms, and server calls.
- A lightweight TypeScript parser check passed for Profiles, the main component, Dashboard, and Content Library after the split.

### Connections screen extraction

Files:

- `components/social-command-center.tsx`
- `components/social-command-center/dashboard.tsx`
- `components/social-command-center/connections.tsx`

Progress:

- Moved the Connections roadmap page, connection cards, current/future workflow cards, Instagram sandbox setup panel, server-side token status display, OAuth skeleton link, identity check, dry-run check, and sandbox config form into `components/social-command-center/connections.tsx`.
- Swapped the main command-center component to lazy-load Connections directly through `next/dynamic`.
- Removed the stale standalone Inspiration Patterns page block that remained in the Dashboard module after Inspiration/Reference patterns were merged into Profiles.
- The Dashboard module is now roughly 1.8k lines, and Connections is roughly 760 lines in its own screen module.

Reason:

- Connections was the final standalone setup screen still lazy-loaded from the Dashboard module.
- This keeps Dashboard focused on the command-center overview and leaves Instagram sandbox setup isolated from the main dashboard bundle.
- A lightweight TypeScript parser check passed for Connections, Dashboard, and the main component after the split.

### Unified Intake product direction

Recommendation:

- Consolidate Source Inbox, Capture Queue, and Bulk Import under one sidebar item called `Intake`.
- Keep the destinations unchanged: Company Knowledge, Profile Voice Source, Opportunity Inbox, Media Library, Create Post, and Manual Review.
- Keep Opportunity Inbox separate because it has a different job: Source/Intake feeds the brain, Opportunity Inbox captures things Conduit may act on.
- Do this as a UI/IA consolidation first, not a data-model migration.

Suggested sidebar shape:

- Operate: Dashboard, Intake, Opportunity Inbox, Create Post, Review Drafts, Ready to Post, Content Calendar, Analytics, Content Library.
- Intelligence / Setup: Profiles, Company Knowledge, Brand Voice Rules, Connections.

## Route checks attempted

The local dev server was not stable during this pass.

Observed behavior before root-loading hardening:

- `npm run dev` printed the npm script header, then stalled before Next bound to `localhost:3000`.
- Running Next directly through the local Next binary also stalled before binding.
- Running through the previous Node 20 binary also stalled before binding.
- Moving the generated `.next` cache aside did not resolve the startup stall.
- `npm run lint` started `next lint`, then stalled without diagnostics and was stopped.
- `tsc --noEmit` also ran without output for over a minute and was stopped.

Updated finding:

- Next can reach its ready state, but the root app graph is very slow to compile.
- While the root app graph is compiling, other route checks can time out with no bytes received.
- A generated dev server page bundle was observed at roughly 6 MB before dynamic root loading.
- Moving the command center behind a client-only dynamic wrapper should reduce root server-render pressure, but full route verification still needs another clean dev-server pass.
- Enabling optimized package imports for `lucide-react` is in place, but did not resolve the startup delay by itself.
- After extracting planning/performance helpers, `npx tsc --noEmit --pretty false` and targeted ESLint on touched files both ran quietly for roughly a minute and were stopped. They did not report errors, but they also did not complete.
- After the helper extractions, a fresh `npm run dev` attempt with the prior Node 20 binary printed the npm script header but did not bind to `localhost:3000` after roughly a minute. The process was stopped cleanly.
- Stale `.next.phase5-*` generated cache folders were moved out of the workspace into `/tmp` so TypeScript and lint do not scan old generated build output.
- After moving those stale caches, `npx tsc --noEmit --pretty false` was retried. It still ran silently for roughly 90 seconds and was stopped, so the tooling/performance blocker remains.
- After the Dashboard extraction, `git diff --check` on the touched Dashboard files passed.
- After the Dashboard extraction, `npm run lint` started `next lint` and ran silently for roughly 90 seconds before being stopped.
- After the Dashboard extraction, normal `npm run build` started `next build` and ran silently for roughly 90 seconds before being stopped.
- After the Dashboard extraction, `NEXT_PRIVATE_BUILD_WORKER=1 npm run build` also ran silently for roughly 90 seconds before being stopped.
- After the Media Library extraction, `git diff --check` on the touched Media Library files passed.
- After the Source Inbox extraction, `git diff --check` on the touched Source Inbox files passed.
- After the Content Calendar extraction and screen wiring repair, `git diff --check` on the touched Calendar/Dashboard files passed.
- A targeted ESLint run against `components/social-command-center/source-inbox.tsx` and `components/social-command-center.tsx` started without diagnostics but stalled silently and was stopped.
- A single-file TypeScript check against `components/social-command-center/source-inbox.tsx` also stalled silently and was stopped.
- A normal `npm run lint` retry after the Source Inbox extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run lint` retry after the Content Calendar extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Content Calendar extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- A lightweight TypeScript parser check using `typescript.transpileModule` passed for `dashboard.tsx`, `analytics.tsx`, and `content-calendar.tsx` after the Analytics extraction.
- A normal `npm run lint` retry after the Analytics extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Analytics extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- After the Content Library extraction, `git diff --check` on the touched Content Library/Dashboard files passed.
- A lightweight TypeScript parser check using `typescript.transpileModule` passed for `dashboard.tsx`, `content-library.tsx`, `analytics.tsx`, and `content-calendar.tsx` after the Content Library extraction.
- A normal `npm run lint` retry after the Content Library extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Content Library extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- After the Profiles extraction, `git diff --check` on the touched Profiles/main files passed.
- A lightweight TypeScript parser check using `typescript.transpileModule` passed for `profiles.tsx`, `social-command-center.tsx`, `dashboard.tsx`, and `content-library.tsx` after the Profiles extraction.
- A normal `npm run lint` retry after the Profiles extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Profiles extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- After the Connections extraction, `git diff --check` on the touched Connections/Dashboard/main files passed.
- A lightweight TypeScript parser check using `typescript.transpileModule` passed for `connections.tsx`, `dashboard.tsx`, and `social-command-center.tsx` after the Connections extraction.
- A normal `npm run lint` retry after the Connections extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Connections extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Removed the unreachable legacy standalone Voice Sources screen, its stale local `voiceSources` state, and unused source-analysis helper functions. The modern Profiles / Voice Sources workflow remains intact.
- Extracted Brand Voice Rules and Feedback Memory into `components/social-command-center/brand-voice-rules.tsx`. The parent command center still owns Supabase/local persistence and passes a save wrapper into the screen.
- Extracted Repurpose into `components/social-command-center/repurpose.tsx`. The parent command center now lazy-loads it and passes the post-copy formatter plus generic-intent checker as callbacks.
- After the Voice Sources cleanup, Brand Voice Rules extraction, and Repurpose extraction, `git diff --check` on the touched files passed.
- A lightweight TypeScript parser check using `typescript.transpileModule` passed for `social-command-center.tsx`, `brand-voice-rules.tsx`, and `repurpose.tsx`.
- Removed duplicated analytics/report helper components from `social-command-center.tsx` now that Analytics owns those views in its extracted module.
- After removing the duplicate analytics helpers, `git diff --check` still passed and the lightweight parser check still passed for `social-command-center.tsx`, `brand-voice-rules.tsx`, and `repurpose.tsx`.
- A normal `npm run lint` retry after the Brand Voice / Repurpose extraction and duplicate-helper cleanup reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Brand Voice / Repurpose extraction and duplicate-helper cleanup reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted the shared review workflow helpers, review panel, and review status badge into `components/social-command-center/review-workflow.tsx`.
- After the review workflow extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `review-workflow.tsx`, `brand-voice-rules.tsx`, and `repurpose.tsx`.
- A normal `npm run lint` retry after the review workflow extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the review workflow extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted the Review Queue card presentation and item type into `components/social-command-center/review-queue-card.tsx`.
- After the Review Queue card extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `review-queue-card.tsx`, `review-workflow.tsx`, `brand-voice-rules.tsx`, and `repurpose.tsx`.
- A normal `npm run lint` retry after the Review Queue card extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Review Queue card extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted Ready queue execution constants/helpers into `components/social-command-center/queue-execution-utils.ts` and manager review link/feedback helpers into `components/social-command-center/manager-review-utils.ts`.
- After the queue utility extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `queue-execution-utils.ts`, `manager-review-utils.ts`, `review-queue-card.tsx`, and `review-workflow.tsx`.
- A normal `npm run lint` retry after the queue utility extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the queue utility extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted the Post Readiness panel presentation into `components/social-command-center/post-readiness-panel.tsx`. The readiness scoring logic remains in `social-command-center.tsx` for now because it still depends on campaign, claim, and brand-safety helpers.
- After the Post Readiness panel extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `post-readiness-panel.tsx`, `queue-execution-utils.ts`, `manager-review-utils.ts`, `review-queue-card.tsx`, and `review-workflow.tsx`.
- A normal `npm run lint` retry after the Post Readiness panel extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Post Readiness panel extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted platform-native post previews into `components/social-command-center/platform-preview.tsx`, including LinkedIn, X, Instagram, TikTok, avatar, and media preview presentation helpers. The main component now passes the existing clean post-copy formatter and detail extractor into the preview module.
- After the Platform Preview extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `platform-preview.tsx`, `post-readiness-panel.tsx`, `queue-execution-utils.ts`, `manager-review-utils.ts`, `review-queue-card.tsx`, and `review-workflow.tsx`.
- A normal `npm run lint` retry after the Platform Preview extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Platform Preview extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Extracted the Brand Safety / Claim Check panel presentation and AI-check fetch wrapper into `components/social-command-center/brand-safety-panel.tsx`. The parent command center still owns fallback safety logic and builds the same Company Knowledge / Claim Library request context before passing it to the panel.
- After the Brand Safety panel extraction, `git diff --check` passed and the lightweight parser check passed for `social-command-center.tsx`, `brand-safety-panel.tsx`, `platform-preview.tsx`, `post-readiness-panel.tsx`, `queue-execution-utils.ts`, `manager-review-utils.ts`, `review-queue-card.tsx`, and `review-workflow.tsx`.
- A normal `npm run lint` retry after the Brand Safety panel extraction reached `next lint`, then stalled silently for roughly 60 seconds and was stopped.
- A normal `npm run build` retry after the Brand Safety panel extraction reached `next build`, then stalled silently for roughly 60 seconds and was stopped.
- Repaired the bad extraction fallout that removed core local helpers and screens from `components/social-command-center.tsx`.
- Restored compact `Company Knowledge` and `Create Post` screen implementations so the app can render those core workflows while Phase 5 extraction continues.
- Restored queue/review helper adapters used by Review Drafts and Ready to Post: supporting fields, readiness wrapper, safety wrapper, Brand Safety request body, and brief completion detection.
- Confirmed the restored queue still exposes the Phase 5 cleanup actions: Archived items have a Delete action, archived items can be restored to Active, and manager feedback can be resolved from queue cards.
- Removed the experimental `optimizePackageImports` Next config to reduce startup risk while the app is in a large-client-module cleanup phase.
- Ran a parser pass across all `app`, `components`, and `lib` TypeScript/TSX files: `parser ok 72 files`.
- Ran `git diff --check`: passed.
- Retried `npm run dev` and `npm run build` outside the sandbox. Next still stalls before the ready/build diagnostics stage, even with a temporary minimal home page, which indicates the current blocker is local Next startup/tooling rather than the main app component alone.
- Removed obvious import-only remnants left behind by extracted screens in `components/social-command-center.tsx`.
- Re-ran the all-source parser pass after import cleanup: `parser ok 72 files`.
- Re-ran `git diff --check` after import cleanup: passed.
- Moved the shared `BriefItem` and `QueueFilter` UI helpers into `components/social-command-center/common-ui.tsx`.
- Replaced duplicate local `BriefItem` / `QueueFilter` implementations in Media Library, Brand Voice Rules, Content Calendar, Content Library, and the main command center.
- Re-ran the all-source parser pass after the shared helper cleanup: `parser ok 72 files`.
- Ran a focused whitespace check on the touched helper/screen files after the cleanup: passed.
- Extracted shared clean post-copy parsing and user-facing post-copy fallback behavior into `lib/post-content.ts`.
- Replaced duplicate post-content helpers in the main command center, Analytics, Content Library, and Media Library so previews and archives use one copy-cleaning path.
- Re-ran the all-source parser pass after the post-content extraction: `parser ok 73 files`.
- Ran a focused whitespace check on the touched post-content files after the extraction: passed.
- Reused the shared queue execution platform URLs and datetime-local helper in Content Calendar instead of maintaining a second copy.
- Re-ran the all-source parser pass after the Content Calendar queue utility cleanup: `parser ok 73 files`.
- Ran a focused whitespace check on the touched calendar/queue utility files after the cleanup: passed.
- Centralized shared stat display components (`InsightStat` and `Metric`) in `components/social-command-center/common-ui.tsx`.
- Replaced duplicate stat components in Dashboard, Analytics, Content Calendar, and Content Library.
- Re-ran the all-source parser pass after the shared stat cleanup: `parser ok 73 files`.
- Ran a focused whitespace check on the touched stat/screen files after the cleanup: passed.
- Extracted Feedback Memory preference inference and summary aggregation into `lib/feedback-memory.ts`.
- Re-ran the all-source parser pass after the Feedback Memory extraction: `parser ok 74 files`.
- Ran a focused whitespace check on the touched Feedback Memory files after the extraction: passed.
- Extracted local browser storage read/write helpers into `lib/local-storage.ts` and reused them from the main command center and Analytics.
- Re-ran the all-source parser pass after the local-storage helper extraction: `parser ok 75 files`.
- Ran a focused whitespace check on the touched local-storage files after the extraction: passed.
- Extracted shared source/profile platform inference helpers into `lib/source-platforms.ts`.
- Removed dead local platform inference helpers from the main command center and reused the shared profile-source inference from Profiles and Source Inbox.
- Re-ran the all-source parser pass after the source-platform helper extraction: `parser ok 76 files`.
- Ran a focused whitespace check on the touched source-platform files after the extraction: passed.
- Added the shared `looksLikeUrl` helper to `lib/source-platforms.ts` and reused it from the main command center and Profiles.
- Re-ran the all-source parser pass after the URL-helper cleanup: `parser ok 76 files`.
- Ran a focused whitespace check on the touched URL-helper files after the cleanup: passed.
- Extracted shared text helpers (`splitTags`, `uniqueStrings`, and `truncateText`) into `lib/text-utils.ts`.
- Reused the shared text helpers from the main command center, Content Library, and Source Inbox.
- Fixed a real Source Inbox runtime risk where `truncateText` was referenced without a local definition/import.
- Re-ran the all-source parser pass after the text helper extraction: `parser ok 77 files`.
- Ran a focused whitespace check on the touched text-helper files after the extraction: passed.
- Retried a bounded TypeScript semantic check with `npx tsc --noEmit --pretty false --incremental false --skipLibCheck`; it stalled for 30 seconds with no diagnostics and was stopped cleanly.
- Extracted Company Knowledge / source display, transcript category, sync status, and readiness helpers into `lib/library-source-utils.ts`.
- Reused those helpers from the main command center and removed their duplicate local definitions.
- Re-ran the all-source parser pass after the library source helper extraction: `parser ok 78 files`.
- Ran a focused whitespace check on the touched library-source files after the extraction: passed.
- Extended `lib/source-platforms.ts` with shared profile/source URL utilities and stricter social URL detection.
- Removed duplicate profile/source URL helpers from the main command center so source URL behavior has one implementation path.
- Re-ran the all-source parser pass after the profile/source URL helper extraction: `parser ok 78 files`.
- Ran a focused whitespace check on the touched source-platform files after the extraction: passed.
- Extracted active generic raw idea / intent checks into `lib/content-quality.ts` while preserving the existing Create Post placeholder checks.
- Removed dead generic-language warning and vague media note helper code from the main command center.
- Left Media Library's intentionally looser setup-panel intent check local to avoid changing button enablement behavior.
- Re-ran the all-source parser pass after the content-quality extraction: `parser ok 79 files`.
- Ran a focused whitespace check on the touched content-quality files after the extraction: passed.
- Centralized browser file helpers (`mediaTypeFromFile` and `readFileAsDataUrl`) in `lib/media-utils.ts`.
- Reused those helpers from the main command center, Media Library, and Source Inbox.
- Fixed a real Source Inbox runtime risk where `mediaTypeFromFile` was called without a local definition/import.
- Re-ran the all-source parser pass after the media utility cleanup: `parser ok 79 files`.
- Ran a focused whitespace check on the touched media utility files after the cleanup: passed.
- Extracted shared Profile Voice Source status/readiness helpers into `lib/profile-source-utils.ts`.
- Reused those helpers from both the main command center and the Profiles screen.
- Removed duplicated social-source detection, learning-basis labels, source next-step labels, source type defaults, and profile source readiness/status helpers from both UI files.
- Re-ran the all-source parser pass after the profile-source utility extraction: `parser ok 80 files`.
- Ran a focused whitespace check on the touched profile-source files after the extraction: passed.
- Extracted shared Profile Voice learned-material summary helpers into `lib/profile-voice-analysis.ts`.
- Reused those helpers from both the main command center and the Profiles screen so learned voice confidence, basis labels, and source/example counts have one implementation.
- Removed duplicated voice-analysis summary helpers from both UI files.
- Full all-source parser rerun hit a filesystem `ETIMEDOUT` while reading source files twice, with no TypeScript diagnostics emitted.
- Ran a focused parser pass on the touched profile voice files instead: `parser ok 4 touched files`.
- Retried the all-source parser after the transient filesystem read recovered: `parser ok 81 files`.
- Ran a focused whitespace check on the touched profile voice files after the extraction: passed.
- Extended `lib/profile-voice-analysis.ts` with learned pattern helpers and profile personality summary generation.
- Removed duplicated learned pattern / personality summary helpers from the main command center and Profiles screen.
- Cleaned stale profile voice imports and an unused Profiles-only `countWords` helper after the extraction.
- Re-ran the all-source parser pass after the learned-pattern helper extraction: `parser ok 81 files`.
- Ran a focused whitespace check on the touched learned-pattern files after the extraction: passed.
- Retried `npm run dev` after the helper extractions. Next printed the local URL and stayed at `Starting...` for 60 seconds without reaching ready.
- During the stalled startup, `lsof` showed a Node process listening on port 3000, but both `curl http://localhost:3000` and `curl http://127.0.0.1:3000` failed to connect.
- Stopped the dev server cleanly with Ctrl-C. The runtime blocker remains Next startup/listener readiness, not a parser-level source error.
- Moved shared profile classification/default-account helpers (`isInspirationProfile`, `isInternalVoiceProfile`, `findDefaultPostingAccount`) into `lib/profile-source-utils.ts`.
- Preserved the existing main-file behavior for internal profile classification and default Conduit/company account fallback.
- Removed local duplicates from the main command center and Profiles screen.
- Re-ran the all-source parser pass after the profile classification helper extraction: `parser ok 81 files`.
- Ran a focused whitespace check on the touched profile classification files after the extraction: passed.
- Moved the incomplete `.next` cache aside after repeated local missing-chunk errors. The stale cache only contained `.next/package.json` and `.next/routes-manifest.json`.
- Confirmed `npm run dev` can reach `Ready` after the cache cleanup, but first route compilation is slow and can make localhost appear unavailable while `/` is compiling.
- Temporarily isolated `app/page.tsx` to a one-line server component and temporarily removed `app/globals.css`; even the minimal route required a slow compile, which exonerated the command-center component graph as the direct startup blocker.
- Restored the real `app/page.tsx` and `app/globals.css` after isolation.
- Found and fixed a production build warning: `components/social-command-center/repurpose.tsx` imported `contentAngles` from `@/lib/mock-data`, but `lib/mock-data.ts` did not export it.
- Added `contentAngles` to `lib/mock-data.ts` and reused that shared export from the main command center instead of keeping a duplicate local constant.
- Re-ran the all-source parser pass after the `contentAngles` fix: `parser ok 81 files`.
- Re-ran `git diff --check` after the `contentAngles` fix: passed.
- Investigated `npm run lint` hanging. Direct `npx eslint app/page.tsx` also hung.
- `env 'DEBUG=eslint:*' npx eslint app/page.tsx --debug` stalled immediately after loading `eslint-plugin-react`.
- Direct imports of `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, `eslint-plugin-import`, and `@typescript-eslint/parser` also hung under the local Node runtime.
- Confirmed local Node is `v24.14.0`; `eslint-config-next` also throws a Rushstack ESLint patch compatibility error when loaded directly under this runtime.
- Retried `npm run build` after the `contentAngles` fix. Build progressed to production compile, then failed with filesystem read timeouts while reading `app/globals.css` and normal `node_modules/next/dist/client/*.js` files.
- A direct file-read stress check then showed `node_modules/next/dist/client/add-locale.js` taking over 16 minutes and returning empty content before another Next file appeared missing.
- Ran `npm install`; it completed successfully and reported the install up to date.
- Retried direct file reads after `npm install`; the same Next files read successfully but remained unusually slow, around one second per tiny file.
- Retried `npm run build` again; it stayed silent in optimized production build for several minutes and was stopped cleanly.
- Retried `env NEXT_PRIVATE_BUILD_WORKER=1 npm run build` to reduce filesystem pressure; it also stayed silent in optimized production build for several minutes and was stopped cleanly.

## Current known blocker

The app source has the Phase 5 workflow fixes, extraction repairs, import-warning fix, and parser-clean source verification in place. Local verification is now blocked by the local Node/dependency/filesystem environment rather than a known app syntax error:

- `npm run dev` reaches `Ready`, but first route compilation is slow.
- `npm run lint` hangs because the local Node 24 runtime stalls while loading ESLint plugins and `eslint-config-next` is not cleanly compatible with the current runtime.
- `npm run build` is blocked by intermittent filesystem read timeouts inside `node_modules/next` and very slow reads of tiny Next package files.

Recommended next debugging target:

1. Refresh or replace the local Node/npm toolchain with an LTS runtime supported by Next 14, preferably Node 20 or Node 22.
2. If Node cannot be changed immediately, reinstall dependencies from a fresh `node_modules` backup/restore cycle and rerun the direct file-read stress check.
3. Re-run route checks once the first route compile completes:
   - `/`
   - `/api/status`
   - `/capture?url=...&title=...&text=...`
   - `/manager-review/[valid-token]`
   - `/api/manager-review/[valid-token]`
4. Re-run `npm run lint`.
5. Re-run `npm run build`.

## Product QA items ready for browser verification

Once the dev server is stable, verify:

- Dashboard tabs and recommended next action.
- Sidebar scroll into Intelligence section.
- Clear demo data location on Dashboard top demo banner and System tab.
- Source Inbox capture queue route and delete/archive behavior.
- Opportunity reply approval to Ready to Reply.
- Ready to Post / Archived Delete action.
- Manager review link display and feedback submission.
- Resolve feedback removes manager feedback from active alerts.
- Content Calendar list/calendar/suggested sections.
- Analytics overview and posted content metrics panels.

## Phase 5 status

Code-level Phase 5 work is complete; final environment-level verification is still blocked.

The remaining work before calling Phase 5 fully closed is to stabilize the local Node/dependency/filesystem environment enough for lint, production build, and browser route QA to complete successfully.

## Final verification update - 2026-07-08

After the local workspace continued to show intermittent Next cache and dependency read issues, a clean verification copy was created at `/tmp/conduit-phase5-verify-src-0708` from the current source, excluding `.git`, `.next`, `node_modules`, and `tsconfig.tsbuildinfo`.

Final source fixes completed before verification:

- Fixed shared `contentAngles` export/import usage.
- Fixed Dashboard, Content Calendar, Profiles, Source Inbox, FieldLabel, Review Link Share Panel, and main command-center TypeScript regressions introduced during the Phase 5 extraction work.
- Fixed stale `brandVoice.summary` references.
- Fixed manual draft creation payload shape.
- Fixed invalid button variant usage.
- Fixed post readiness scoring adapter usage for queue items.
- Fixed platform preview adapter status/score/campaign shape.
- Centralized duplicated Source Inbox history/classification types in `lib/types.ts`.
- Confirmed the real workspace source parser pass succeeds: `parser ok 81 files`.

Clean verifier results:

- `npm run lint` passed.
- `npm run build` passed.
- Remaining warning only: `components/social-command-center.tsx` uses one raw `<img>` at line 6268, which triggers the existing Next `@next/next/no-img-element` warning.

Phase 5 is closed from the source and production-build standpoint. The only remaining caveat is local environment reliability in the original Documents workspace: if localhost shows stale chunk errors, hanging workspace checks, or missing Next chunks, clear/rebuild `.next` or run from a clean dependency install. The synced clean verifier confirms the current source builds successfully.
