# Redundancy Reduction Audit

Date: 2026-07-08

## Decision

The app had three related intake concepts competing for attention:

- Source Inbox
- Capture Queue
- Bulk Import / Past Content Import

These are now presented as one user-facing area: **Intake**.

## What Changed

- Sidebar and page header now show `Intake` instead of `Source Inbox`.
- Intake is organized into four modes:
  - `Classify Source`
  - `Browser Captures`
  - `Import Past Content`
  - `History`
- Command bar actions route directly into the relevant Intake mode.
- Browser captures open the `Browser Captures` mode automatically.
- Dashboard copy points users to Intake instead of treating captures as a separate product area.
- README now describes Intake as the front door for source triage, browser captures, and past-content import.

## Workflow Consolidation Update

Opportunity records still have their own workflow and data, but Opportunities no longer compete for permanent sidebar space:

- `Intake` is the visible front door for source triage, browser capture, imports, and new opportunities.
- `Opportunities` remains available from Intake, Dashboard recommendations, and Quick actions.
- `Repurpose` remains available from Content Library and Quick actions instead of appearing as a separate navigation destination.
- Internal screen keys and data models remain unchanged to avoid persistence and routing risk.

This keeps the conceptual distinction while making the daily workflow easier to scan.

The primary navigation is now:

- Dashboard
- Intake
- Create Post
- Review
- Publish Queue
- Content Calendar
- Content Library
- Analytics

Supporting setup is grouped under Knowledge & Assets and Settings.

## What Was Not Changed

- Internal screen keys still use `Source Inbox` where changing them would create unnecessary routing or persistence risk.
- Data models were not changed.
- Capture, import, triage, routing, and history behavior were preserved.

## Verification

- Touched-file parser check passed.
- `git diff --check` passed.
- Clean verifier `npm run lint` passed.
- Clean verifier `npm run build` passed.

Known remaining warning:

- One existing Next warning for a raw `<img>` in `components/social-command-center.tsx`.
