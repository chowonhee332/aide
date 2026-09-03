#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (file) => fs.readFileSync(file, 'utf8')
const home = read('src/app/page.tsx')
const studio = read('src/components/StudioView.tsx')
const studioRoute = read('src/components/StudioRouteView.tsx')
const playgroundRoute = read('src/components/PlaygroundRouteView.tsx')

assert.match(home, /router\.push\('\/studio\/new'\)/, 'new generations must use /studio/new')
assert.match(home, /router\.push\('\/playground'\)/, 'Playground entry must use the router')
assert.doesNotMatch(home, /studioTrigger|builderOpen/, 'home must not switch Studio or Playground locally')
assert.match(studioRoute, /loadHistory\(\)/, 'history routes must verify local history')
assert.match(studioRoute, /저장된 작업을 찾을 수 없습니다/, 'missing history needs recovery UI')
assert.match(studio, /onBoardSaved\?\.\(newId\)/, 'first saved board must notify the route')
assert.match(studioRoute, /router\.replace\(`\/studio\/\$\{encodeURIComponent\(historyId\)\}`\)/, 'first saved board must replace /studio/new')
assert.match(studio, /new URL\(`\/studio\/\$\{encodeURIComponent\(currentBoardHistoryId\)\}`/, 'shared link must use the canonical history route')
assert.match(studio, /이 브라우저에만 저장된 링크입니다/, 'local-only permalink warning is required')
assert.match(playgroundRoute, /<BuilderView/, '/playground must render BuilderView')

console.log('Phase 0 route contract verified.')
