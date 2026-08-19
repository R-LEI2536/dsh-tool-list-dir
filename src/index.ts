/**
 * list_directory tool: read-only directory listing.
 * @module dsh-tool-list-dir
 */

import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-fs'

export const name = 'tool-list-dir'
export const inject = ['tools', 'fs']

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
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `${value.path}\n${value.entries.map((entry) => (
          `${entry.name}\t[${entry.type}]${entry.size === undefined ? '' : ` ${entry.size} B`}`
        )).join('\n')}`,
      }],
    },
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const cwd = exec.agent?.session.header.cwd
      const target = await ctx.fs.resolve(
        args.path,
        cwd === undefined ? { signal: exec.signal } : { cwd, signal: exec.signal },
      )
      const entries = await ctx.fs.listDir(target, exec.signal)
      return {
        path: target.displayPath,
        entries: entries.map((entry) => ({
          name: entry.name,
          type: entry.type,
          ...entry.size === undefined ? {} : { size: entry.size },
        })),
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
