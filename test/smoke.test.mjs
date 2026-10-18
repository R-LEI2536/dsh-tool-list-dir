/**
 * Smoke test for the built plugin (`lib/`, produced by `pnpm run build`; `pretest`
 * guarantees freshness). Zero dependencies: node:test + node:assert, driven through
 * a fake cordis context, so it never touches a real filesystem, session, or host.
 *
 * It pins the two things this release is about: the model-facing tool contract must
 * not move, and a relative path must resolve against the session's CURRENT directory
 * (`ctx.workingDirectory.ensure()`), not the original `session.header.cwd`.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import * as plugin from '../lib/index.js'

const GUIDANCE = 'guidance'
const MAX_ENTRIES = 100

/** Build the fake context, mount the plugin, and expose the recorded calls. */
function setup({ entries = [], ensureResult = '/work/current', config = {} } = {}) {
  const seen = { ensure: [], resolve: [], listDir: [], sections: [], tools: [] }
  const agent = { session: { header: { cwd: '/original/project' } } }
  const signal = new AbortController().signal
  const ctx = {
    systemPrompt: { section: section => seen.sections.push(section) },
    tools: { register: tool => seen.tools.push(tool) },
    workingDirectory: {
      ensure: async (ensuredAgent, ensuredSignal) => {
        seen.ensure.push([ensuredAgent, ensuredSignal])
        return ensureResult
      },
    },
    fs: {
      resolve: async (path, opts) => {
        seen.resolve.push([path, opts])
        return { displayPath: path, targetKey: path }
      },
      listDir: async (target, listSignal) => {
        seen.listDir.push([target, listSignal])
        return entries
      },
    },
  }
  plugin.apply(ctx, { order: 1350, guidance: GUIDANCE, maxEntries: MAX_ENTRIES, ...config })
  assert.equal(seen.tools.length, 1, 'apply must register exactly one tool')
  return { seen, agent, signal, tool: seen.tools[0] }
}

/** Render one tool result to the single text the harness would send to the model. */
function render(tool, args, value) {
  return tool.output.render(args, value).map(part => part.text).join('\n')
}

/** Execute a call with the harness-owned signal. */
function call(tool, args, signal, exec = {}) {
  return tool.execute(args, { signal, ...exec })
}

test('manifest declares the working-directory service', () => {
  assert.deepEqual(plugin.inject, ['tools', 'fs', 'systemPrompt', 'workingDirectory'])
  assert.equal(plugin.name, 'tool-list-dir')
})

test('registers the unchanged list_directory tool contract', () => {
  const { seen, tool } = setup()

  assert.equal(tool.name, 'list_directory')
  assert.deepEqual(Object.keys(tool.parameters.properties).sort(), ['ignore', 'path'])
  assert.deepEqual(seen.sections, [{ name: 'tool:list_directory', order: 1350, text: GUIDANCE }])
  assert.deepEqual(tool.presentCall({ path: 'src' }), {
    card: 'generic',
    title: 'List src',
    kind: 'read',
    locations: [{ path: 'src' }],
  })
})

test('Config defaults stay at order 1350 / maxEntries 100', () => {
  const resolved = plugin.Config({})
  assert.equal(resolved.order, 1350)
  assert.equal(resolved.maxEntries, MAX_ENTRIES)
  assert.equal(typeof resolved.guidance, 'string')
  assert.ok(resolved.guidance.length > 0)
})

test('an agent call resolves against the session working directory', async () => {
  const { seen, agent, signal, tool } = setup({ entries: [{ name: 'a.txt', type: 'file', size: 3 }] })

  const value = await call(tool, { path: 'src' }, signal, { agent })

  assert.equal(seen.ensure.length, 1)
  assert.equal(seen.ensure[0][0], agent)
  assert.equal(seen.ensure[0][1], signal)
  assert.deepEqual(seen.resolve, [['src', { cwd: '/work/current', signal }]])
  assert.deepEqual(seen.listDir, [[{ displayPath: 'src', targetKey: 'src' }, signal]])
  assert.deepEqual(value.entries, [{ name: 'a.txt', type: 'file', size: 3 }])
})

test('a non-agent call leaves the directory to the filesystem backend', async () => {
  const { seen, signal, tool } = setup()

  await call(tool, { path: 'src' }, signal)

  assert.equal(seen.ensure.length, 0)
  assert.deepEqual(seen.resolve, [['src', { signal }]])
})

test('sorts before truncating, directories first', async () => {
  const entries = [
    { name: 'b.txt', type: 'file', size: 1 },
    { name: 'zdir', type: 'directory' },
    { name: 'a.txt', type: 'file', size: 1 },
    { name: 'adir', type: 'directory' },
  ]
  const { signal, tool } = setup({ entries, config: { maxEntries: 2 } })

  const args = { path: 'p' }
  const value = await call(tool, args, signal)

  assert.deepEqual(value.entries.map(entry => entry.name), ['adir', 'zdir'])
  assert.deepEqual(value.stats, { total: 4, files: 2, directories: 2, others: 0 })
  assert.deepEqual(value.truncated, { shown: 2, total: 4, remaining: 2 })

  const text = render(tool, args, value)
  assert.match(text, /^Listed 4 items in p:/m)
  assert.match(text, /\[2 items truncated, showing first 2 of 4 total\]/)
  assert.match(text, /Total: 4 items \(2 directories, 2 files\)/)
})

test('ignore patterns filter items and report the hidden count', async () => {
  const entries = [
    { name: 'a.ts', type: 'file', size: 1 },
    { name: 'a.log', type: 'file', size: 1 },
    { name: 'a.tmp', type: 'file', size: 1 },
  ]
  const { signal, tool } = setup({ entries })

  const args = { path: 'p', ignore: ['*.log', '*.tmp'] }
  const value = await call(tool, args, signal)

  assert.deepEqual(value.entries.map(entry => entry.name), ['a.ts'])
  assert.deepEqual(value.stats, { total: 1, files: 1, directories: 0, others: 0 })
  assert.equal(value.ignored, 2)
  assert.match(render(tool, args, value), /\[2 items hidden by ignore patterns\]/)
})

test('a fully filtered listing never reads as an empty directory', async () => {
  const { signal, tool } = setup({ entries: [{ name: 'only.tmp', type: 'file', size: 1 }] })

  const args = { path: 'p', ignore: ['*.tmp'] }
  const value = await call(tool, args, signal)

  assert.equal(value.stats.total, 0)
  assert.equal(value.ignored, 1)
  assert.equal(
    render(tool, args, value),
    'Directory p is not empty. The ignore patterns hid 1 item.',
  )
})

test('empty and single-item listings agree with their counts', async () => {
  const empty = setup({ entries: [] })
  const emptyArgs = { path: 'p' }
  const emptyValue = await call(empty.tool, emptyArgs, empty.signal)
  assert.equal(render(empty.tool, emptyArgs, emptyValue), 'Directory p is empty.')

  const single = setup({ entries: [{ name: 'src', type: 'directory' }] })
  const singleArgs = { path: 'p' }
  const singleValue = await call(single.tool, singleArgs, single.signal)
  assert.match(render(single.tool, singleArgs, singleValue), /Total: 1 item \(1 directory, 0 files\)$/)
})
