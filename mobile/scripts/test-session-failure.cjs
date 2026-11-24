const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function compile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}
const helper = { exports: {} };
vm.runInNewContext(compile('src/data/api/sessionFailure.ts'), { exports: helper.exports, module: helper });
const { shouldInvalidateSession } = helper.exports;
const publicRoutes = ['login', 'register', 'social', 'social/complete', 'social/nonce', 'forgot-password', 'reset-password'];
for (const route of publicRoutes) {
  for (const url of [`/auth/${route}`, `https://example.test/api/auth/${route}/?lang=pt`]) {
    assert.equal(shouldInvalidateSession(401, url, true, false), false);
  }
}
assert.equal(shouldInvalidateSession(401, '/auth/me', true, false), true);
assert.equal(shouldInvalidateSession(404, '/auth/me?full=true', true, false), true);
assert.equal(shouldInvalidateSession(404, '/recipes', true, false), false);
assert.equal(shouldInvalidateSession(401, '/admin/users', true, false), false);
assert.equal(shouldInvalidateSession(401, '/admin', true, false), false);
assert.equal(shouldInvalidateSession(401, '/recipes', true, true), false);
assert.equal(shouldInvalidateSession(401, '/recipes', false, false), false);
for (const status of [400, 403, 429, 500, 'ERR']) assert.equal(shouldInvalidateSession(status, '/recipes', true, false), false);

let rejectResponse;
let currentToken = 'session-a';
let removed = 0;
let loggedOut = 0;
const client = { interceptors: { request: { use() {} }, response: { use(_ok, error) { rejectResponse = error; } } } };
const tokenStorage = { getToken: async () => currentToken, removeToken: async () => { removed++; currentToken = null; } };
const moduleObject = { exports: {} };
vm.runInNewContext(compile('src/data/api/client.ts'), {
  exports: moduleObject.exports, module: moduleObject, process: { env: {} },
  console: { log() {}, error() {} },
  require: name => {
    if (name === 'axios') return { create: () => client };
    if (name === '../storage/tokenStorage') return { tokenStorage };
    if (name === '../demo/demoMode') return { isDemoMode: () => false };
    if (name === './sessionFailure') return helper.exports;
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
moduleObject.exports.setForceLogout(() => { loggedOut++; });
async function fail(url, token, status = 401) {
  await rejectResponse({ config: { url, _authToken: token }, response: { status, data: { error: 'Rejected' } } }).catch(() => {});
  await new Promise(resolve => setImmediate(resolve));
}
(async () => {
  await fail('/auth/social/complete', 'session-a');
  assert.equal(removed, 0);
  assert.equal(loggedOut, 0);
  currentToken = 'session-b';
  await fail('/recipes', 'session-a');
  assert.equal(removed, 0, 'stale response must preserve a new session');
  await fail('/auth/me', 'session-b');
  assert.equal(removed, 1);
  assert.equal(loggedOut, 1);
  console.log('PASS: credential failures preserve session; expired protected session logs out; stale responses, admin, demo, no-token and network/server errors covered. No network or native device used.');
})().catch(error => { console.error(error); process.exitCode = 1; });
