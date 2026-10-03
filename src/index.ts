/**
 * list_directory tool: read-only directory listing.
 * @module dsh-tool-list-dir
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-system-prompt'
import z from '@deepseek-ai/schemastery'

export const name = 'tool-list-dir'
export const inject = ['tools', 'fs', 'systemPrompt']

// Constants
const MAX_ENTRIES = 100
const TYPE_ORDER: Record<string, number> = { directory: 0, file: 1, other: 2 }

/** Compile glob-like basename patterns into anchored matchers; `*` and `?` are the only wildcards. */
function compileIgnorePatterns(patterns: readonly string[]): RegExp[] {
  return patterns.map((pattern) => {
    const source = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')
    return new RegExp(`^${source}$`)
  })
}

/** Render a count with its noun in the correct number: `1 entry`, `2 entries`.
 *  Both forms are required — an English plural is not always the singular plus
 *  `s` (`entry` → `entries`), so a default would silently emit `entrys`. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

// Default guidance text
const DEFAULT_GUIDANCE = 'Use the list_directory tool — not shell commands like ls — to browse directory structures. When truncated use glob to find files by name pattern, or grep to search file contents. Use this for understanding project layouts.'

/** Plugin configuration schema. */
export interface Config {
  /** Order of the system prompt guidance section (default: 1350).
   *  1350 sits inside DSH 0.1.5's tool description band (1000-2900), between
   *  `TOOL_EDIT` (1300) and `TOOL_GLOB` (1400), so this tool's guidance renders
   *  alongside other filesystem tools without colliding with DSH-official
   *  `SECTION_ORDERS` slots. */
  order?: number
  /** Custom guidance text for the system prompt (default: standard guidance). */
  guidance?: string
  /** Maximum number of entries to return before truncation (default: 100). */
  maxEntries?: number
}

export const Config: z<Config> = z.object({
  order: z.number().default(1350),
  guidance: z.string().default(DEFAULT_GUIDANCE),
  maxEntries: z.number().min(1).max(1000).default(MAX_ENTRIES),
})

/** Resolved configuration with all defaults applied. */
type ResolvedConfig = Required<Config>

export function apply(ctx: Context, config: Config): void {
  // Apply defaults
  const resolved = config as ResolvedConfig
  
  // Register system prompt guidance
  ctx.systemPrompt.section({
    name: 'tool:list_directory',
    order: resolved.order,
    text: resolved.guidance,
  })
  
  ctx.tools.register(defineTool({
    name: 'list_directory',
    description: 'List a directory: every entry with type and byte size. Read-only — use this instead of `ls` in the shell when browsing. Optional `ignore` glob patterns omit matching entries.',
    parameters: {
      path: { 
        type: 'string', 
        required: true, 
        description: 'Directory path to list, resolved against the session working directory.' 
      },
      ignore: {
        type: 'array',
        items: { type: 'string' },
        description: 'Glob patterns matched against entry names (basename only; `*` and `?` are the only wildcards). Matching entries are omitted from the listing.',
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          entries: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                name: { type: 'string', required: true },
                type: { type: 'string', enum: ['file', 'directory', 'other'], required: true },
                size: { type: 'number' },
              },
            },
          },
          stats: {
            type: 'object',
            additionalProperties: false,
            required: true,
            properties: {
              total: { type: 'number', required: true },
              files: { type: 'number', required: true },
              directories: { type: 'number', required: true },
              others: { type: 'number' },
            },
          },
          truncated: {
            type: 'object',
            additionalProperties: false,
            properties: {
              shown: { type: 'number', required: true },
              total: { type: 'number', required: true },
              remaining: { type: 'number', required: true },
            },
          },
          ignored: { type: 'number' },
        },
      },
      render: (_args, value) => {
        // `entries` arrives already sorted — directories first, then files, then
        // others, alphabetically within each group (see `execute`).
        const lines = value.entries.map(entry => {
          const typeLabel = entry.type === 'directory' ? 'DIR ' : 
                           entry.type === 'file' ? 'FILE' : 'OTHR'
          const sizeInfo = entry.size !== undefined ? 
                          `${entry.size.toString().padStart(8)} B` : ' '.repeat(10)
          const nameSuffix = entry.type === 'directory' ? '/' : ''
          return `${typeLabel}  ${sizeInfo}  ${entry.name}${nameSuffix}`
        })
        
        // An empty listing gets one plain sentence instead of a separator-framed
        // block with no body. `total === 0` has two distinct meanings, and the
        // filtered one must never read as "the directory is empty".
        if (value.stats.total === 0) {
          const text = value.ignored
            ? `Directory ${value.path} is not empty. The ignore patterns hid ${plural(value.ignored, 'entry', 'entries')}.`
            : `Directory ${value.path} is empty.`
          return [{ type: 'text', text }]
        }

        // Build output
        const parts: string[] = [
          `Listed ${plural(value.stats.total, 'item', 'items')} in ${value.path}:`,
          '─'.repeat(50),
          ...lines,
          '─'.repeat(50),
        ]
        
        // Truncation and filtering notices
        if (value.truncated) {
          parts.push(
            `[${plural(value.truncated.remaining, 'item', 'items')} truncated, showing first ${value.truncated.shown} of ${value.truncated.total} total]`
          )
        }
        if (value.ignored) {
          parts.push(`[${plural(value.ignored, 'entry', 'entries')} hidden by ignore patterns]`)
        }
        if (value.truncated || value.ignored) {
          parts.push('')
        }
        
        // Statistics summary
        parts.push(
          `Total: ${plural(value.stats.total, 'entry', 'entries')} ` +
          `(${plural(value.stats.directories, 'directory', 'directories')}, ${plural(value.stats.files, 'file', 'files')})` +
          (value.stats.others ? `, ${plural(value.stats.others, 'other', 'others')}` : '')
        )
        
        return [{ type: 'text', text: parts.join('\n') }]
      },
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const cwd = exec.agent?.session.header.cwd
      const target = await ctx.fs.resolve(
        args.path,
        cwd === undefined ? { signal: exec.signal } : { cwd, signal: exec.signal },
      )
      const entries = await ctx.fs.listDir(target, exec.signal)

      // Drop entries matching the caller's ignore patterns.
      const matchers = compileIgnorePatterns(args.ignore ?? [])
      const kept = matchers.length === 0
        ? entries
        : entries.filter(entry => !matchers.some(matcher => matcher.test(entry.name)))
      const ignored = entries.length - kept.length

      // Sort before truncating, so the shown subset is the directories-first head
      // of the listing rather than an arbitrary slice of backend order.
      const sorted = [...kept].sort((a, b) => {
        const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
        return typeDiff !== 0 ? typeDiff : a.name.localeCompare(b.name)
      })

      // Statistics describe the listed (post-filter) set, so `stats.total` matches
      // the number of entries actually returned.
      const stats = {
        total: sorted.length,
        files: sorted.filter(e => e.type === 'file').length,
        directories: sorted.filter(e => e.type === 'directory').length,
        others: sorted.filter(e => e.type === 'other').length,
      }

      // Truncate if needed
      const listed = sorted.slice(0, resolved.maxEntries)
      const truncated = sorted.length > resolved.maxEntries
        ? { shown: listed.length, total: sorted.length, remaining: sorted.length - listed.length }
        : undefined

      return {
        path: target.displayPath,
        entries: listed.map(entry => ({
          name: entry.name,
          type: entry.type,
          ...(entry.size !== undefined && { size: entry.size }),
        })),
        stats,
        ...(truncated !== undefined && { truncated }),
        ...(ignored > 0 && { ignored }),
      }
    },
    presentCall: (args) => ({
      card: 'generic',
      title: `List ${args.path}`,
      kind: 'read',
      locations: [{ path: args.path }],
    }),
  }))
}
