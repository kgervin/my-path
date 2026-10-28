# Nielsen's 10 usability heuristics in My Path

Each heuristic maps to concrete, testable behaviour. Use this as a checklist when reviewing UI
changes, and re-run the evaluation below after any redesign.

| # | Heuristic | How My Path applies it | Where |
| --- | --- | --- | --- |
| 1 | **Visibility of system status** | Counter strip (Flagged, Pending review, Approved, Routed, Dismissed) and a heading that states the work left ("24 students need review"), both updated after every decision; "Writing drafts: n of m" while a run processes; a live "Showing n of m" line; the Filter button reads "Filter (on)" when a filter applies; status badges and toasts; a live word count and reading level while editing; page titles change on navigation. | `Counters`, `QueueHead`, `RunProgress`, `StatusBadge`, `Toasts`, `DraftMeter`, `usePageTitle` |
| 2 | **Match between system and the real world** | Coach language ("Needs review", "Days left", "Route"); explanations in everyday words with dates like "Oct 30", not raw field names; human labels beside each source value; drafts in the student's preferred language. | `templates.explanation`, `catalog.py`, `FIELD_LABELS`, `LanguageToggle` |
| 3 | **User control and freedom** | **Undo** in every decision toast; **Reopen** on any decided student; **Restore original draft**; Cancel on every dialog; Escape closes dialogs and returns focus; "Clear filters". | `useDecision`, `DecisionBar`, `DraftEditor`, `Dialog` |
| 4 | **Consistency and standards** | The same actions in the same order on every student; one badge style per status; native HTML controls; one colour meaning per state (red = urgent, green = done); `Icon + text` everywhere; small radii throughout, pills only for chips and badges. | `DecisionBar`, `Badges`, `app.css` tokens |
| 5 | **Error prevention** | CSV columns checked **before** upload, with the missing ones marked in the column guide; Run stays disabled until the file is valid; a coach name is required before any decision; dismissing needs a reason; approve is blocked over the word limit; a confirm dialog before a redraft replaces edits; version checks stop two coaches overwriting each other. | `checkCsv`, `ColumnGuide`, `DismissDialog`, `canApprove`, optimistic locking |
| 6 | **Recognition rather than recall** | Each barrier card shows its suggested fix and only the source fields that triggered it; barrier chips on every student; the suggested route preselected; the coach name remembered on the device; the column guide lists each column's format and an example. | `StudentHeader`, `DetectedBarriers`, `RouteDialog`, `CoachNameField`, `ColumnGuide` |
| 7 | **Flexibility and efficiency of use** | `j`/`k` keyboard shortcuts; **Approve and next**; filters kept in the URL so views can be bookmarked or shared; drag-and-drop or file picker; one-tap language and length redrafts. | `useQueueNavigation`, `useQueueFilters`, `FilePicker` |
| 8 | **Aesthetic and minimalist design** | One primary action per screen; a minimal home page (hero, how it works, upload card); the counters collapse to one compact row on phones so the list starts on the first screen; each count appears once; filters and the column guide stay collapsed until needed. | `UploadPage`, `Counters` (phone rule), `QueueFilters` |
| 9 | **Help users recognise, diagnose and recover from errors** | Errors in plain words with a next step; every CSV problem listed with its row number at once; the column guide opens on missing columns; a missing session says so and links to the queue and the upload page instead of offering a retry that can't work; "Load the latest version" on conflicts; "Try again" on load failures. | `ErrorState`, `NotFoundState`, `ColumnCheck`, `DecisionFeedback` |
| 10 | **Help and documentation** | A Help page covering how it works, each barrier (rendered from the live rules), statuses, shortcuts and privacy; inline hints on the upload card; the column guide; a shortcut tip on devices with a keyboard. | `HelpPage`, `UploadPage` |

## Evaluation: 2026-10-16

A walkthrough of the current design on desktop and a phone (375 px): upload with a bad file and
the trial file, review, approve and undo, dismiss, filters, a missing link and an unknown page.
Severity uses Nielsen's 0–4 scale (0 = not a problem, 4 = catastrophe).

| Heuristic | Finding | Severity | Fix |
| --- | --- | --- | --- |
| 9 | A missing session showed "No run with id …" and a **Try again** that could never work, with no way forward. | 3 | `NotFoundState`: plain message, links to the queue and upload, no retry, page title "Not found". |
| 10 | Testers whose file was wrong learned which columns were missing, but not what values to put in them. | 2 | Column format and example for every column, served by `/meta` from `COLUMN_GUIDE`; the guide opens and marks missing columns. |
| 8 | On phones the counter tiles filled the first screen; the count was also shown twice. | 2 | One compact counter row below 48rem; the duplicate "N shown" removed. |
| 2 | Explanations used raw field names and ISO dates ("$464.00 (balance_usd) … 2026-10-18"). | 1 | Everyday wording and "Oct 30"-style dates; source fields stay beside each finding. |
| 4 | A flex gap split the file check into "bad.csv : 1 student." | 1 | The text sits in one element. |
| 10 | This document described the pre-redesign UI. | 1 | Rewritten for the current design. |

All six fixes shipped together. No severity-4 problems were found.

## Review checklist for UI changes

- [ ] Is progress or state visible within 1 second of any action?
- [ ] Can the user undo or cancel it?
- [ ] Does it use words coaches use, not system words or field names?
- [ ] Does it look and behave like the rest of the app?
- [ ] Is a mistake prevented before it happens?
- [ ] Is the needed information on screen instead of remembered?
- [ ] Is there a faster path for frequent users?
- [ ] Can anything be removed? Is anything shown twice?
- [ ] Do errors say what happened and offer a way forward that works?
- [ ] Is it documented on the Help page if it is not obvious?
