export type Limit = { kind: string; pct: number; resetsAt: string | null }
export type Usage = { ctx: number | null; limits: Limit[]; now: number }

declare module 'claude-code' {
  interface PluginState {
    nocturne: { usage: Usage | null; showSide: boolean; showRow: boolean }
  }
}
