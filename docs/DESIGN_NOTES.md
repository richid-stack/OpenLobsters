# Design notes

Decisions and proposals about how OpenLobs should look and behave. Things marked **Proposal** are not built yet.

## Principles (built)

- Flat. No cards, no border lines in the chat. Content sits on the page; soft fills (never outlines) carry badges and chips.
- Show the work, quietly. Every tool step says what it did, why, and where it ran, in plain rows.
- Ask before changing anything. Approvals stop the run until the person answers.
- One source of truth. Steps live in the message. Anything above the message box only summarises them.

## Proposal: the area above the message box

Today it holds a status line, a row of activity chips that scrolls sideways, and sometimes an error or a note. When a run has many steps the chips run off to the left, which hides them and adds clutter.

1. **One quiet line while working.** The status line stays (it is built from real events). The chip row goes away.
2. **A tray for the steps.** Tapping the status line opens a vertical list of every step so far: icon, plain words, state. Nothing scrolls sideways. It closes with a tap or by dragging down.
3. **Steps are anchors.** Tapping a step in the tray closes it and scrolls the chat to that step in the message, briefly highlighting it. This answers "when I press it, it takes me back to that place".
4. **After the run it collapses to one line** ("Worked with 4 tools") that opens the same tray.
5. **Waiting for approval is the exception.** It does not hide in the tray. The status line turns warning-coloured and tapping it jumps straight to the approval.
6. **Errors and notes** sit in the same single line, replacing it, with the recovery action as plain text buttons.
7. Motion: the tray slides up from the line; reduced-motion users get no animation.

Why: it removes horizontal scrolling, keeps the area to one line, and makes the message the single place where detail lives.

## Proposal: accounts screen

Show only the sign-in methods that are switched on. Put the one most likely wanted first. Email stays available but is visually secondary when social sign-in exists.

## Open questions

- Whether the chat list should be searchable and pinnable before it has many items.
- Whether "Always allow" should survive a reload (today it lasts one page session).
