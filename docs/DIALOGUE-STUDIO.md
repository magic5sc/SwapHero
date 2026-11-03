# Quick dialogue studio and AI handoff

Open `dialogue-editor.html` on the existing Site. The common path is: select or
create a dialogue, choose speakers and write lines, optionally bind a location,
preview, then export `SwapHero.xlsx`. IDs and line order are automatic. Optional
creative requirements go in details notes, saved in extra Dialogue/DialogueLine
columns ignored by the runtime compiler. Existing speaker overrides, portraits,
sides and per-line backgrounds survive editing; the full seven-sheet workshop is
linked for precise visual-field changes. Default skip policy survives imports.

The studio initially reads the published workbook, supports importing a local
workbook and rewrites its content into a downloadable Excel file. It does not
silently overwrite the original file or publish it. Reads and writes are local.
Existing other worksheets, formulas, untouched cell metadata and custom columns
are retained; only dialogue sheets are rebuilt, and binding changes patch the
corresponding cells. Workbook compression/serialization is not byte-identical
preservation of all Excel features. Source workbooks and generated game data still
belong in the normal compile/test/publish workflow.

Five-sheet and seven-sheet source workbooks are supported, including unrelated
extra worksheets. The generic workshop/compiler now ignore those extra sheets
while preserving them on export. Only the paired dialogue sheets are required to
appear together. Independent drafts use `swaphero.dialogue.studio.v1`, preserving
source bytes and table changes separately from game, lab and card-editor saves.
Storage failures surface an error; exporting Excel remains the portable backup.

## AI contract

The AI modal has one required field, the writing goal, and one optional details
note. Preparing the task automatically includes current characters and available
metadata, dialogue history, current lines, all six categories of binding locations,
image paths already in the workbook, project source links and constraints. Source
links do not imply that the page has fetched the Wiki. Missing character lore or
art must remain questions, rather than invented confirmed design.

Task format: `swaphero.dialogue-task`, version 1. `requestId` and `baseRevision`
identify the selected workbook state. `responseFormat` contains a copyable example.
The downloaded text file combines instructions and the complete task JSON. Results
must use `swaphero.dialogue-result`, version 1, the same ID/revision, a `dialogues`
array and optional `questions`. Each dialogue contains ID/name/skip/notes/goal,
lines and optional bindings. Lines use runtime character IDs and the existing
left/right, image/scene/blank background schema. Binding records use exact sheet,
physical rowIndex (Excel row, starting at 2) and one of the six configured fields;
physical rows distinguish duplicate Node candidates.

Import/paste validates the whole batch on a copy. New/updated dialogue text,
visual settings, skip policy, bindings and questions are displayed before apply.
No part is applied on failure. Workbook changes invalidate old tasks/proposals.
Apply changes only the browser draft; preview/export/publication remain explicit.
Unknown characters, invented image paths, duplicate IDs, conflicting target
bindings and stale IDs/revisions are rejected. Revision hashes detect accidental
staleness, not adversarial tampering or multi-tab editing.

### Browser agent interface

When `document.modelContext` is supported, the page registers:

- `swaphero_dialogue_task`: read the user's prepared task, rejecting absent/stale
  tasks. Read-only; no automatic or inferred writing request.
- `swaphero_dialogue_stage`: validate and display `{result: ...}` for review. It
  does not apply or download. Apply uses the same visible UI action afterward.

This lets a browser agent in a supported ChatGPT/Codex session read the open task
and return candidates. It is not a webpage calling the current chat on its own.
Other browsers use copy/download task and paste/import result. Registration failure
does not disable the ordinary editor. WebMCP verification requires a live tool
discovery/call, separately from source and unit checks.

### Future standalone online generation

This release has no model endpoint, API key, automatic model call or paid usage.
A future server-side `/api/dialogue-assist` can accept the task and return exactly
the result envelope for the existing staging pipeline. On the current public Site,
such a paid endpoint needs owner authorization, request limits and server-side
secrets. Do not place API keys in browser code or reuse Codex login/session tokens.
Enable OpenAI Developers and its platform-key workflow before configuring an API
credential. Preserve the Site audience rather than exposing an unprotected paid
generation proxy. Official API auth reference:
https://developers.openai.com/api/reference/overview

## Validation

Model tests cover Excel round trips, unrelated sheets/formulas/custom columns,
five-sheet conversion, exact candidate-row bindings, protected deletion, collected
context, preview-only atomic staging, stale task detection, batch apply and invalid
character/image/binding rejection. Browser verification and actual publication
references are recorded in the Wiki; no standalone model-generation call is claimed.
