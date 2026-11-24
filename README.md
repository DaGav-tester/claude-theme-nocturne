# Nocturne

A dark theme mod for Claude Code. It gives the desktop and mobile apps a deep charcoal look with frosted, semi-transparent panels, a faded bat silhouette watermark on the left of the background, and live usage bars.

## What it shows

* **Usage row above the chat** (every surface, terminal included):
  `CTX ▓▓▓▓░░ 62%  │  USAGE ▓▓░░░░ 41% · resets in 2h 13m  │  WEEK ▓░░░░░ 18% · resets in 4d 3h`
* **Usage bars in the background** on the left, under the watermark (desktop and mobile apps).

All figures come from Claude Code itself: the context window fill, and the plan limits (rolling 5 hour and weekly) reported with each response. Nothing is estimated. Plan usage shows `n/a` where no limit is reported, such as on an API key account.

## Install

At the prompt of a terminal session:

```
/plugin install nocturne --marketplace DaGav-tester/claude-theme-nocturne
```

From a shell:

```bash
claude plugin install nocturne --marketplace DaGav-tester/claude-theme-nocturne
```

In the desktop app: click + next to the prompt box, then Plugins, Add marketplace with `DaGav-tester/claude-theme-nocturne`, then Add plugin.

## Commands

```
/nocturne                  list the commands
/nocturne look on | off    charcoal theme, glass and watermark
/nocturne row on | off     usage bars above the chat
/nocturne side on | off    usage bars in the background
```

The row and side switches are remembered across sessions.

## Uninstall

Run `/plugin`, choose `nocturne`, then Disable or Uninstall.
