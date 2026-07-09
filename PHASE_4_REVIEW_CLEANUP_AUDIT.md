# Phase 4 Review and Cleanup Audit

Date: 2026-07-06

## Scope

Phase 4 focused on review and cleanup safety:

1. Manager review links
2. Manager feedback resolution
3. Archived queue cleanup
4. Delete behavior for archived/test records
5. Local dev stability while testing review links

## What Was Verified

### Manager Review Link UI

The main app review-link panel now has the safeguards that were missing in earlier screenshots:

- Created links show the full URL in a read-only field.
- Active links also show the full URL as a backup.
- Copy failures show a manual-copy fallback message.
- Links can be opened directly from the app.
- Links can be disabled.

This means the user is no longer blocked if browser clipboard permissions prevent the `Copy` button from working.

### Manager Review Portal Code Path

The manager review portal has explicit UI states for:

- loading
- invalid/expired/disabled link
- no scoped content
- active review items
- completed items
- archived items

The public portal does not expose internal app screens, Company Knowledge, Profiles, Brand Voice Rules, API keys, or posting controls.

### Manager Feedback Resolution

Manager feedback can be resolved in the main app:

- Ready queue cards show `Resolve feedback` for active manager feedback.
- Resolving feedback marks the feedback status as `resolved`.
- Resolved feedback is filtered out of active manager feedback surfaces.
- The action is logged as `Manager feedback resolved`.
- In the Review Queue, accepting a manager suggested edit also resolves that manager feedback item.

### Archived Queue Cleanup

Archived items expose:

- restore
- delete

Delete confirms before removing the archived queue item.

### Completed Queue Cleanup

Completed items expose:

- Add metrics
- Hide from queue
- Archive
- Open in Content Library

`Delete test item` is intentionally limited to sandbox/demo/local-test records.

## Fixes Made During Phase 4

### Restore Archived Posted Items to Completed

Archived posted items previously showed `Restore to Active`, which could make a completed post look like it needed to be manually posted again.

Fix:

- Archived items with posted/live URL data now show `Restore to Completed`.
- Archived items without completion data still show `Restore to Active`.
- Restoring a posted post returns it to `Posted`.
- Restoring a replied reply returns it to `Replied`.
- Restoring an uncompleted item returns it to `Ready`.

This keeps the execution queue from accidentally reactivating already-published content.

## Findings

### Manager Review Links Require Supabase Persistence

External manager review links are server-backed. In local browser mode, the app can show link UI, but it cannot securely serve local-only queue content through `/manager-review/[token]`.

The share panel already warns:

> External review links require Supabase persistence. Local mode can draft link settings, but cannot securely serve shared content to managers.

If a manager review link opens empty or unavailable, the likely causes are:

- the queue item exists only in local browser storage
- the review link exists but the scoped item is not synced to Supabase
- the link expired or was disabled
- local Next dev cache/chunks are stale

### Local Next Dev Server Became Unstable

During Phase 4, `next dev` began hanging before binding to port 3000. Clearing `.next` did not fully recover it during this pass.

Observed environment:

- Node: 24.14.0
- Next: 14.2.35
- React: 18.3.1

This Node/Next pairing is a likely contributor. Next 14 is generally more reliable on an LTS Node line such as Node 20 or 22.

Because the dev server could not be kept alive, Phase 4 became a code-path and static audit after the initial checks.

## Not Verified Because Dev Server Hung

These should be retested after stabilizing the Node/Next environment:

- open a fresh manager review link end-to-end
- submit manager comment
- submit suggested edit
- approve/request changes from the manager portal
- confirm the main app refreshes feedback from Supabase
- click `Resolve feedback` in the main app and confirm it disappears
- archive a completed item and verify `Restore to Completed`
- delete an archived queue item from the UI

## Recommended Next Step

Before Phase 5, stabilize local tooling:

1. Use Node 20 or Node 22 for this project.
2. Clear `.next`.
3. Restart `npm run dev`.
4. Re-run the manager review link flow with Supabase mode active.

## Current Phase 4 Status

Review and cleanup code paths are mostly present and safer after the restore-label fix.

The biggest blocker is local dev-server instability, not an obvious missing manager-review UI state.
