# Nielsen's 10 usability heuristics in My Path

Each heuristic maps to concrete, testable behaviour. Use this as a checklist when reviewing UI
changes.

| # | Heuristic | How My Path applies it | Where |
| --- | --- | --- | --- |
| 1 | **Visibility of system status** | Live "Writing drafts: n of m" progress bar; counters for flagged, needs review, approved, routed and dismissed; status badges on every student; toasts after each action; live word count and reading level while editing; page titles change on navigation. | `RunProgress`, `Counters`, `StatusBadge`, `Toasts`, `DraftMeter`, `usePageTitle` |
| 2 | **Match between system and the real world** | Coach language ("Needs review", "Route to Bursar", "Days to drop"); plain-language barrier names and descriptions; field names shown with human labels next to the raw values; Spanish drafts for students who prefer Spanish. | `catalog.py`, `FIELD_LABELS`, `LanguageToggle` |
| 3 | **User control and freedom** | **Undo** on every approve, route and dismiss toast; **Reopen** on any decided student; **Restore original draft**; Cancel on every dialog; Escape closes dialogs; "Clear filters". | `useDecision`, `DecisionBar`, `DraftEditor`, `Dialog` |
| 4 | **Consistency and standards** | The same actions in the same order on every student; one badge style per status; native HTML controls; one colour meaning per state (red = urgent, green = done); a consistent `Icon + text` pattern. | `DecisionBar`, `Badges`, `app.css` tokens |
| 5 | **Error prevention** | CSV columns checked **before** upload; Run is disabled until the file is valid; dismissing needs a reason; approve is disabled over the word limit or without a coach name; a confirm dialog appears before a redraft replaces edits; version checks stop two coaches overwriting each other. | `checkCsv`, `DismissDialog`, `canApprove`, optimistic locking |
| 6 | **Recognition rather than recall** | The explanation sits next to the exact source fields; barrier chips on each card; suggested route preselected; filters are visible drop-downs; the coach name is remembered on the device; the student's preferred language is shown. | `WhyFlagged`, `RouteDialog`, `CoachNameField` |
| 7 | **Flexibility and efficiency of use** | `j`/`k` keyboard shortcuts; **Approve and next**; filters saved in the URL so views can be bookmarked or shared; drag-and-drop or file picker; one-tap language and length redrafts. | `useQueueNavigation`, `useQueueFilters`, `FilePicker` |
| 8 | **Aesthetic and minimalist design** | One primary action per screen; history and options collapsed in `<details>`; the queue shows only what is needed to triage; generous whitespace with a restrained palette. | `ActionHistory`, upload "Options" |
| 9 | **Help users recognise, diagnose and recover from errors** | Errors in plain words with a next step; every CSV problem listed with its row number at once; "Load the latest version" on conflicts; "Try again" on load failures; network errors say what to check. | `ErrorState`, `ApiError`, `DecisionFeedback` |
| 10 | **Help and documentation** | A Help page covering how it works, each barrier, statuses, shortcuts and privacy; inline hints (sample CSV, required columns, "Days to drop are counted from this date"); a shortcut tip on devices with a keyboard. | `HelpPage`, `UploadPage` |

## Review checklist for UI changes

- [ ] Is progress or state visible within 1 second of any action?
- [ ] Can the user undo or cancel it?
- [ ] Does it use words coaches use, not system words?
- [ ] Does it look and behave like the rest of the app?
- [ ] Is a mistake prevented before it happens?
- [ ] Is the needed information on screen instead of remembered?
- [ ] Is there a faster path for frequent users?
- [ ] Can anything be removed?
- [ ] Do errors say what happened and what to do next?
- [ ] Is it documented on the Help page if it is not obvious?
