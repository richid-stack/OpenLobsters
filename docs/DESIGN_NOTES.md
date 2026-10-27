# Design notes

Decisions and proposals about how OpenLobs should look and behave. Things marked **Proposal** are not built yet.

## Principles (built)

- Flat. No cards, no border lines in the chat. Content sits on the page; soft fills (never outlines) carry badges and chips.
- Show the work, quietly. Every tool step says what it did, why, and where it ran, in plain rows.
- Ask before changing anything. Approvals stop the run until the person answers.
- One source of truth. Steps live in the message. Anything above the message box only summarises them and points back to them.
- Test what a person would experience, not just what exists. Check hit-testing, focus and visibility, not only that an element is in the page.

## Built: the area above the message box

One quiet status line, and a tray of steps behind it.

- **The line** says what is happening, built from real events. While working it also shows how many steps so far. It is a full-width, 44px-high tap target with a chevron, so it looks pressable.
- **The tray** opens above the line as one soft-filled sheet joined to it (no outlines). It lists the actions taken: icon, plain words, what it worked on, a check when done, a pulsing dot when running, a "Verified" badge on a passed check. It slides up; reduced-motion users get no animation.
- **Steps are anchors.** Tapping a step closes the tray, scrolls the chat to that step (centred, or from its top if it is tall) and tints it briefly. Focus moves to the step for keyboard and screen-reader users.
- **Approval is the exception.** The line turns warning-coloured, says "Review", and tapping it jumps straight to the approval instead of opening a list. The tray, if open, still shows the waiting step and lets you jump to it.
- **Putting it away:** drag the handle down (a short drag springs back), press Escape, use the close button, or send a message. Escape returns focus to the status line.
- **After the run** it collapses to "Worked with 4 tools" and opens the same tray.
- **A "back to the latest" button** appears when the person has scrolled up, attached just above the message box so it can never hide behind it.

Decisions made while building, and why:

- **The tray lists actions only, not reasoning.** Reasoning already has its own collapsed row right above the answer. Counting it as a step made every plain reply look like it had something to open.
- **The count shows only while the run is live.** Afterwards the line already says "Worked with 4 tools"; repeating the number was noise.
- **The waiting line wraps to two lines** instead of cutting off the action it names.
- **No sideways scrolling anywhere.** The old chip row is gone.
- **The library's own scroll-to-bottom button was replaced.** It was positioned as a percentage of the screen and hid behind the message box. The first automated check only measured its position, so it passed while the button was effectively invisible. The check now tests what a finger would actually hit.

- **Errors and notes share the same line.** The line above the message box has one owner at a time. An error comes first (with "Try again", "Models" and a dismiss button as plain text buttons, announced as an alert). The "this model cannot use tools" note comes next, but only while nothing is running or waiting, so it never talks over live work. Otherwise the normal status line shows. There is never a second block. The rule is a tested pure function (`noticeFor` in `src/lib/status.ts`) and a 14-check browser suite (`tests/browser/notices.py`).

## Built: the approval card

It names the action in a sentence, says in a line what will be made (file name, sheets, rows), says plainly where it goes ("saved to your account, nothing is sent anywhere else, you can delete it later"), and offers Allow once, Always allow and Deny as plain buttons. It never describes a different place than the real one: an earlier version said "inside the folder you approved" for a file saved on the server.

## Proposal: accounts screen

Show only the sign-in methods that are switched on. Put the one most likely wanted first. Email stays available but is visually secondary when social sign-in exists.

## Open questions

- Whether the chat list should be searchable and pinnable before it has many items.
- Whether "Always allow" should survive a reload (today it lasts one page session).
