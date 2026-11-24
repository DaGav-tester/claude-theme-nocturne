import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit, ThemeSetArgs, ThemeStyle } from 'claude-code'

import type { Limit, Usage } from '../types'
import { makeColors } from './make-colors.js'

// ── 1. THEME ────────────────────────────────────────────────────────────────
// Deep charcoal, made for dark mode only.
const { theme, problems } = makeColors({
  label: 'Nocturne',
  only: 'dark',
  roles: { accent: '#8ea6c8', danger: '#d0605a', success: '#6fa77a', warning: '#c99a4a', pro: '#a58fc9' },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#121316',
        'surface-1': '#17181c',
        'surface-2': '#1b1d21',
        'surface-3': '#202227',
        'text-primary': '#eceef2',
        'text-secondary': '#c3c7cf',
        'text-muted': '#9aa0aa',
      },
    },
  },
})

// Subtle borders and near solid fills, so words stay readable over the glass.
const BORDER = '#2e3138'
const STYLE: ThemeStyle = {
  UserMessage: { backgroundColor: '#1c1e23', borderColor: BORDER, borderWidth: 1, radius: 10, padding: 12 },
  AssistantMessage: { backgroundColor: '#16171bf2', borderColor: BORDER, borderWidth: 1, radius: 10, padding: 12 },
  ToolUse: { backgroundColor: '#1a1c20f0', borderColor: BORDER, borderWidth: 1, radius: 6, paddingX: 8 },
}

const LOOK: ThemeSetArgs = {
  backdrop: { scene: 'nocturne', glass: { blur: 28, tint: '#16171b', opacity: 0.55 } },
  colors: theme,
  overrideColorScheme: 'dark',
  style: STYLE,
}

// ── State ───────────────────────────────────────────────────────────────────
const usageAtom = atom({ plugin: 'nocturne', key: 'usage' } as const, null)
const showSideAtom = atom({ plugin: 'nocturne', key: 'showSide' } as const, true)
const showRowAtom = atom({ plugin: 'nocturne', key: 'showRow' } as const, true)

// Only figures the engine reports: the live context window, and the
// rate-limit windows from the last API response. No estimates.
function snapshot(context: SessionContextUsage, limits: SessionRateLimit[], now: number): Usage {
  return {
    ctx: context.percent ?? null,
    limits: limits.map(l => ({ kind: l.kind, pct: l.percentUsed, resetsAt: l.resetsAt ?? null })),
    now,
  }
}

async function refresh($: EngineInterface) {
  const u = await $.session.usage()
  const snap = snapshot(u.context, u.rateLimits, await $.clock.now())
  await update($, usageAtom, () => snap)
}

const ROWS: { kind: string; label: string }[] = [
  { kind: 'five_hour', label: 'USAGE' },
  { kind: 'seven_day', label: 'WEEK' },
]

function countdown(iso: string | null, now: number) {
  if (iso === null) return null
  const ms = Date.parse(iso) - now
  if (!Number.isFinite(ms)) return null
  if (ms <= 0) return 'resetting'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)

  return d > 0 ? `${d}d ${h}h` : `${h}h ${m % 60}m`
}

// ── 3. USAGE: the row under the chat (every surface) ───────────────────────
function bar(pct: number, cells = 6) {
  const filled = Math.max(0, Math.min(cells, Math.round((pct / 100) * cells)))

  return '▓'.repeat(filled) + '░'.repeat(cells - filled)
}

function bandLine(u: Usage | null) {
  const ctx = u?.ctx ?? null
  const parts = [ctx === null ? `CTX ${bar(0)} --` : `CTX ${bar(ctx)} ${ctx}%`]
  const limits = u?.limits ?? []

  for (const row of ROWS) {
    const l = limits.find(x => x.kind === row.kind)
    if (l === undefined) {
      if (row.kind === 'five_hour') parts.push('USAGE n/a')
      continue
    }
    const left = countdown(l.resetsAt, u?.now ?? 0)
    const tail = left === null ? '' : left === 'resetting' ? ' · resetting' : ` · resets in ${left}`
    parts.push(`${row.label} ${bar(l.pct)} ${l.pct}%${tail}`)
  }

  return parts.join('  │  ')
}

// ── 2 + 3A. BACKGROUND: bat watermark and the bars on the left ─────────────
// An original bat silhouette (not a traced trademark), 10% opacity.
const BAT =
  'M100 34 L104 24 L107 35 Q114 34 121 30 Q152 17 194 21 Q179 31 177 48 Q165 41 155 51 ' +
  'Q145 43 135 57 Q125 51 115 65 Q108 62 100 78 Q92 62 85 65 Q75 51 65 57 Q55 43 45 51 ' +
  'Q35 41 23 48 Q21 31 6 21 Q48 17 79 30 Q86 34 93 35 L96 24 Z'

// A 3x5 pixel font drawn as paths: pure vector, no fonts for the app to refuse.
const GLYPHS: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001',
  '8': '111101111101111', '9': '111101111001111', A: '010101111101101', C: '111100100100111',
  D: '110101101101110', E: '111100111100111', G: '111100101101111', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', M: '101111111101101', N: '110101101101101',
  R: '110101110101101', S: '111100111001111', T: '111010010010010', U: '101101101101111',
  W: '101101101111101', X: '101101010101101', '%': '101001010100101', '/': '001001010100100',
  '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000',
}

function textPath(text: string, x: number, y: number, s: number) {
  let d = ''
  let cx = x
  for (const ch of text.toUpperCase()) {
    const g = GLYPHS[ch] ?? '000000000000000'
    for (let i = 0; i < 15; i++) {
      if (g[i] === '1') d += `M${cx + (i % 3) * s} ${y + Math.floor(i / 3) * s}h${s}v${s}h${-s}z`
    }
    cx += 4 * s
  }

  return d
}

const INK = '#e6e8ee'

function sideBars(u: Usage | null) {
  const rows: { label: string; pct: number | null; tail: string }[] = [{ label: 'CTX', pct: u?.ctx ?? null, tail: '' }]
  for (const row of ROWS) {
    const l = u?.limits.find((x: Limit) => x.kind === row.kind)
    if (l === undefined) {
      if (row.kind === 'five_hour') rows.push({ label: 'USAGE', pct: null, tail: '' })
      continue
    }
    const left = countdown(l.resetsAt, u?.now ?? 0)
    rows.push({ label: row.label, pct: l.pct, tail: left === null ? '' : left === 'resetting' ? ' · resetting' : ` · resets ${left}` })
  }

  const W = 280
  let out = ''
  rows.forEach((r, i) => {
    const y = 600 + i * 52
    const value = r.pct === null ? (r.label === 'CTX' ? '--' : 'N/A') : `${r.pct}%`
    const fill = r.pct === null ? 0 : Math.max(0, Math.min(W, (r.pct / 100) * W))
    out +=
      // Real text in the system font (option 1). The pixel font, textPath(), is kept as the fallback.
      `<text x="324" y="${y + 15}" font-family="system-ui, sans-serif" font-size="20" font-weight="600" letter-spacing="0.6" fill="${INK}" fill-opacity="0.55">${r.label}  ${value}${r.tail}</text>` +
      `<rect x="324" y="${y + 22}" width="${W}" height="8" rx="4" fill="${INK}" fill-opacity="0.12"/>` +
      (fill > 0 ? `<rect x="324" y="${y + 22}" width="${fill}" height="8" rx="4" fill="${INK}" fill-opacity="0.5"/>` : '')
  })

  return out
}

function scene(u: Usage | null, showSide: boolean) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="g1" cx="0.18" cy="0.3" r="0.6"><stop offset="0" stop-color="#23262c"/><stop offset="1" stop-color="#121316" stop-opacity="0"/></radialGradient>
<radialGradient id="g2" cx="0.85" cy="0.85" r="0.55"><stop offset="0" stop-color="#1c1f25"/><stop offset="1" stop-color="#121316" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1600" height="1000" fill="#121316"/>
<rect width="1600" height="1000" fill="url(#g1)"/>
<rect width="1600" height="1000" fill="url(#g2)"/>
<svg x="0" y="0" width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMinYMid meet">
<g transform="translate(40 330) scale(2.6)"><path d="${BAT}" fill="${INK}" fill-opacity="0.10"/></g>
${showSide ? `<g transform="translate(324 600) scale(0.64) translate(-324 -600)">${sideBars(u)}</g>` : ''}
</svg>
</svg>`
}

const onOff = (v: boolean) => (v ? 'on' : 'off')

async function menu($: EngineInterface) {
  const row = await read($, showRowAtom)
  const side = await read($, showSideAtom)

  return [
    'Nocturne commands',
    '',
    '  /nocturne                  this list',
    '  /nocturne look on | off    charcoal theme, glass and bat watermark',
    `  /nocturne row on | off     usage bars above the chat (now ${onOff(row)})`,
    `  /nocturne side on | off    usage bars in the background (now ${onOff(side)})`,
  ].join('\n')
}

async function runCommand($: EngineInterface, args: string): Promise<string> {
  const [what, value] = args.trim().toLowerCase().split(/\s+/)
  const isOn = value === 'on'
  const isSwitch = value === 'on' || value === 'off'

  if (what === undefined || what === '') return menu($)
  if (what === 'look' && isSwitch) {
    if (isOn) await $.theme.set(LOOK)
    else await $.theme.clear()
    return `Look ${onOff(isOn)}.`
  }
  if (what === 'row' && isSwitch) {
    await update($, showRowAtom, () => isOn)
    await $.store.set('showRow', isOn)
    return `Usage bars above the chat ${onOff(isOn)}.`
  }
  if (what === 'side' && isSwitch) {
    await update($, showSideAtom, () => isOn)
    await $.store.set('showSide', isOn)
    return `Usage bars in the background ${onOff(isOn)}.`
  }
  // Short form: /nocturne on | off
  if ((what === 'on' || what === 'off') && value === undefined) return runCommand($, `look ${what}`)

  return `Not a nocturne command: ${args.trim()}\n\n${await menu($)}`
}

export const register: Register = on => {
  let tick: { cancel: () => void } | undefined

  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(l => l.startsWith("Desktop won't paint"))
    if (unpainted !== undefined) $.ui.log(unpainted)

    try {
      await $.theme.set(LOOK)
    } catch (error) {
      $.ui.log(String(error))
      await $.theme.set({ ...LOOK, style: undefined })
    }

    // Switches kept across sessions in the mod's own store.
    const savedRow = await $.store.get('showRow')
    const savedSide = await $.store.get('showSide')
    if (typeof savedRow === 'boolean') await update($, showRowAtom, () => savedRow)
    if (typeof savedSide === 'boolean') await update($, showSideAtom, () => savedSide)

    // The old status line carried the plugin's name; the band row replaces it.
    $.ui.status(undefined)
    await $.command.register({ name: 'nocturne', description: 'Nocturne theme: look, usage row, background bars', argumentHint: '[look|row|side on|off]' })
    await refresh($)
    tick?.cancel()
    // The reset countdown moves with time, not only with responses.
    tick = $.clock.every(60_000, () => void refresh($))

    return next(e)
  })

  // Pushed by the engine after each turn and whenever a limit moves a point.
  on('session.measure', async ($, e, next) => {
    const snap = snapshot(e.context, e.rateLimits, await $.clock.now())
    await update($, usageAtom, () => snap)

    return next(e)
  })

  // Under the chat, left aligned, no plugin label.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, showRowAtom))) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box>
        <Text dimColor wrap="truncate-end">{bandLine(await read($, usageAtom))}</Text>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.props.plugin !== $.plugin.name || (e.surface !== 'desktop' && e.surface !== 'mobile')) return next(e)
    const { Svg } = $.ui.resolve(e)
    const u = await read($, usageAtom)
    const showSide = await read($, showSideAtom)

    return <Svg source={scene(u, showSide)} alt="Faded bat watermark with context and plan usage bars on the left" />
  })

  on('command.run', { command: 'nocturne' }, async ($, e, next) => {
    return { text: await runCommand($, e.args), isTextDisplayOnly: true }
  })

  on('session.end', ($, e, next) => {
    tick?.cancel()

    return next(e)
  })
}
