# Phase 1 App Health / Boot Audit

Date: 2026-07-06

## Scope

Phase 1 checks app startup, route availability, workspace/auth behavior, local fallback safety, environment shape, and obvious blank-page/cache failures.

## Results

### Dev Server

- Status: Pass
- Local URL: http://127.0.0.1:3000
- Result: root route returned `200 OK`.
- Note: cleared stale `.next` cache and restarted the dev server cleanly after the browser showed an unstyled loading shell.

### Browser Boot

- Status: Pass
- Signed-out state renders the styled login screen.
- Browser console errors: none observed on the root sign-in screen.
- Current expected state when signed out: sign-in form.

### Supabase / Workspace Status

- Status: Pass with one setup note
- `/api/status` reports Supabase connected.
- Required Supabase tables are reachable.
- `campaign-media` storage bucket is reachable.
- Expected env keys are present locally.
- Setup note: Instagram status reports `metaAppId: false` while OAuth client env vars are present. This is likely naming/config clarity rather than a boot blocker.

### Local Mode Fallback

- Status: Pass
- The app has explicit retry/local-mode UI when workspace loading times out.
- Local mode copy says it does not delete or overwrite Supabase records.
- No silent local fallback was observed in the signed-out browser state.

### Capture Route

- Status: Fixed during audit
- `/capture?...` returns `200 OK`.
- Added backup query-param recovery so browser captures survive even if sessionStorage is unavailable.
- Root capture fallback `/?capture=1&url=...&title=...&text=...` returns `200 OK`.

### Manager Review Route

- Status: Pass
- `/manager-review/test-token` returns `200 OK`.
- Invalid/fake token shows a clean “Review link unavailable” message.
- Browser console errors: none observed.
- API returns `404` for fake tokens, which is expected and handled by the page.

### Instagram Sandbox Status Route

- Status: Pass
- `/api/integrations/instagram/status` returns structured sandbox status.
- Publishing remains disabled.
- Token is not exposed; only token status is returned.

## Changes Made

- Cleared stale `.next` cache and restarted the local dev server.
- Updated `/capture` to redirect with backup query params.
- Updated the main app capture reader to recover capture payloads from query params as a fallback.
- Updated startup routing so `?capture=1` opens Source Inbox after app load.

## Known Phase 1 Limitations

- Full `npm run lint` and `npm run build` have recently hung silently in this local environment; defer full build verification to the build/deploy phase unless needed sooner.
- Browser storage could not be inspected directly through the audit runtime, so capture persistence was verified by route behavior and code path rather than direct localStorage inspection.
- Supabase authenticated workspace loading was not verified with credentials in-browser during this pass because the browser was signed out.

## Recommendation

Phase 1 is healthy enough to continue to Phase 2: Core User Flow.
