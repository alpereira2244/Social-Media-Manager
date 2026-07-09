# Phase 2 Core Flow Audit

Date: 2026-07-06

## Scope

Phase 2 focused on the main operating flow:

1. Capture/source context
2. Create Post
3. Generate drafts
4. Review Drafts
5. Approve to Ready to Post
6. Ready to Post execution queue
7. Schedule/manual execution readiness

This was a mixed UI and code-path audit. The in-app browser automation became unreliable during the scheduling step, so the final scheduling check used code inspection plus a small state fix.

## What Passed

### Local App Access

- Local dev server ran at `http://127.0.0.1:3000`.
- Root app loaded.
- The sign-in screen now exposes an explicit local development fallback.
- Local mode loads the full app without overwriting Supabase records.

### Browser Capture to Create Post

- Capture query data was recovered into Source Inbox.
- Captured title, URL, selected text, and timestamp appeared in the intake flow.
- `Start Create Post` carried captured context into Create Post.

### Create Post

- Create Post opened from captured source context.
- The form correctly blocked generation when required setup was missing.
- A default Conduit profile could be created locally.
- After a profile and stronger main idea were supplied, the brief check moved to Ready.
- `Generate` completed successfully through `/api/generate`.
- Generation produced platform drafts for LinkedIn, X, and Instagram.

### Review Drafts

- Review Drafts opened after generation.
- Active brief summary showed the generated brief.
- Platform draft options rendered.
- Readiness and Brand Safety summaries rendered.
- Approving the recommended draft succeeded.
- Approved draft showed the success state and moved into Ready to Post.

### Ready to Post

- Ready to Post opened with the approved LinkedIn item.
- Active tab showed the actionable item.
- The queue card showed:
  - content type
  - platform
  - posting account
  - status
  - compact readiness
  - compact safety
  - copy/open/mark posted/schedule/archive/details actions
- Share review link controls rendered.

## Fixes Made During Phase 2

### Explicit Local Mode from Sign-In

The login screen now includes a development fallback button:

- `Use local mode for this browser`

This helps resume local testing when Supabase auth/workspace loading is unavailable or slow.

### Capture Query Fallback

Capture payloads are now recoverable from URL query params, not only session storage. This protects the browser capture workflow when a redirect or reload clears temporary storage.

### Scheduling State Fix

Ready queue scheduling now keeps status aligned with the planned date:

- setting a planned date changes the item to `Scheduled`
- clearing the planned date changes it back to `Ready`

This prevents items from staying in the wrong tab after scheduling edits.

## Findings

### Source Inbox Classification Needs Follow-Up

Clicking `Classify source` from the captured item timed out in the browser automation session. The page did not crash and no visible console error appeared, but this should be retested manually because it may have been a browser-control issue.

### Schedule Panel Needs Manual Recheck

The schedule panel opened and accepted a date/time. Browser automation timed out when clicking `Done`, but the underlying schedule state code has now been tightened. This should be manually rechecked in the UI:

1. Open Ready to Post.
2. Click `Schedule`.
3. Set a date/time.
4. Confirm the item moves from Active to Scheduled.
5. Clear the date and confirm it returns to Active.

### Browser Automation Was Unstable

The browser controller timed out on heavy interactions and eventually reset its JS kernel. Phase 2 therefore did not rely exclusively on automation screenshots.

## Not Yet Verified in Phase 2

These flows should move into Phase 3:

- Mark posted modal save and Completed tab movement
- Manual metrics update from Completed
- Content Calendar scheduled item display
- Content Library record created from the approved item
- Analytics inclusion after marking posted
- Manager review feedback loop on the queued item
- Supabase persistence for the same flow

## Current Phase 2 Status

Core path status: mostly passing.

The app can move from captured/source context through post generation, review, approval, and into the execution queue. Scheduling had a state edge case that has been fixed and needs one manual UI recheck.
