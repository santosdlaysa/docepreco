const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ts = require('typescript');
const page = path.resolve(__dirname, '../src/pages/NotificationsPage.tsx');
const req = createRequire(page);
const state = [];
let cursor = 0;
let effects = [];
let createCalls = 0;
let sendCalls = 0;
let consumed = 0;
const hooks = {
  useState(initial) {
    const index = cursor++;
    if (!(index in state)) state[index] = initial;
    return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
  },
  useEffect(effect, deps) {
    const index = cursor++;
    if (!state[index] || deps.some((value, i) => value !== state[index][i])) effects.push(effect);
    state[index] = deps;
  },
};
const api = {
  listNotifications: async () => [],
  createNotification: async () => { createCalls++; },
  sendNotification: async () => { sendCalls++; },
};
const components = { TableSkeleton: () => null, ConfirmModal: () => null, ModalOverlay: () => null };
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(page, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
}).outputText, {
  module: mod, exports: mod.exports, console,
  require: id => id === 'react' ? hooks : id === '../lib/api' ? { api } : id === '../components' ? components : req(id),
});
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function render(props) {
  cursor = 0; effects = [];
  const result = nodes(mod.exports.NotificationsPage(props));
  effects.forEach(effect => effect());
  return result;
}
const draft = { title: 'Teste de modelo', body: 'Texto completo para revisão.', target: 'expired', eligibility: 'Somente assinaturas expiradas verificadas.' };
const consumedCallback = () => { consumed++; };
const props = { initialDraft: draft, onDraftConsumed: consumedCallback, toast: { success() {}, error() {} } };
render(props);
let result = render({ ...props, initialDraft: null });
assert.equal(consumed, 1);
assert.ok(result.some(node => node.type === 'input' && node.props.value === draft.title));
assert.ok(result.some(node => node.type === 'textarea' && node.props.value === draft.body));
assert.ok(result.some(node => node.type === 'select' && node.props.value === 'expired'));
assert.ok(result.some(node => node.type === 'p' && node.props.children === draft.eligibility));
assert.equal(createCalls, 0);
assert.equal(sendCalls, 0);
result.find(node => node.type === 'button' && node.props.children === 'Cancelar').props.onClick();
result = render({ ...props, initialDraft: null });
assert.ok(!result.some(node => node.type === 'textarea'));
assert.equal(createCalls, 0);
assert.equal(sendCalls, 0);
console.log('PASS: draft pre-fills editable title/body/target and eligibility; consume once; cancel; no create/send calls.');
