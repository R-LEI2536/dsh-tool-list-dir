/**
 * list_directory tool: read-only directory listing.
 * @module dsh-tool-list-dir
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-fs'

export const name = 'tool-list-dir'
export const inject = ['tools', 'fs']

// Constants
const MAX_ENTRIES = 100
const TYPE_ORDER: Record<string, number> = { directory: 0, file: 1, other: 2 }

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'list_directory',
    description: 'List a directory: every entry with type and byte size. Read-only — use this instead of `ls` in the shell when browsing.',
    parameters: {
      path: { 
        type: 'string', 
        required: true, 
        description: 'Directory path to list, resolved against the session working directory.' 
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
        },
      },
      render: (_args, value) => {
        // Sort entries: directories first, then files, then others; alphabetically within each group
        const sorted = [...value.entries].sort((a, b) => {
          const typeDiff = TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
          return typeDiff !== 0 ? typeDiff : a.name.localeCompare(b.name)
        })
        
        // Format entries with aligned columns
        const lines = sorted.map(entry => {
          const typeLabel = entry.type === 'directory' ? 'DIR ' : 
                           entry.type === 'file' ? 'FILE' : 'OTHR'
          const sizeInfo = entry.size !== undefined ? 
                          `${entry.size.toString().padStart(8)} B` : ' '.repeat(10)
          const nameSuffix = entry.type === 'directory' ? '/' : ''
          return `${typeLabel}  ${sizeInfo}  ${entry.name}${nameSuffix}`
        })
        
        // Build output
        const parts: string[] = [
          `Listed ${value.stats.total} items in ${value.path}:`,
          '─'.repeat(50),
          ...lines,
          '─'.repeat(50),
        ]
        
        // Truncation notice
        if (value.truncated) {
          parts.push(
            `[${value.truncated.remaining} items truncated, showing first ${value.truncated.shown} of ${value.truncated.total} total]`,
            ''
          )
        }
        
        // Statistics summary
        parts.push(
          `Total: ${value.stats.total} entries ` +
          `(${value.stats.directories} directories, ${value.stats.files} files)` +
          (value.stats.others ? `, ${value.stats.others} others` : '')
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
      
      // Calculate statistics based on full list
      const stats = {
        total: entries.length,
        files: entries.filter(e => e.type === 'file').length,
        directories: entries.filter(e => e.type === 'directory').length,
        others: entries.filter(e => e.type === 'other').length,
      }
      
      // Truncate if needed
      if (entries.length > MAX_ENTRIES) {
        const shown = entries.slice(0, MAX_ENTRIES)
        return {
          path: target.displayPath,
          entries: shown.map(entry => ({
            name: entry.name,
            type: entry.type,
            ...(entry.size !== undefined && { size: entry.size }),
          })),
          stats,
          truncated: {
            shown: MAX_ENTRIES,
            total: entries.length,
            remaining: entries.length - MAX_ENTRIES,
          },
        }
      }
      
      // Return full list
      return {
        path: target.displayPath,
        entries: entries.map(entry => ({
          name: entry.name,
          type: entry.type,
          ...(entry.size !== undefined && { size: entry.size }),
        })),
        stats,
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
