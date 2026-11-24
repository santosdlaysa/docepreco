const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');
const page = path.join(root, 'src/pages/AgentMaterialsPage.tsx');
const localRequire = createRequire(page);
const dataPath = path.join(root, 'src/data/agentMaterials.ts');
const dataSource = fs.readFileSync(dataPath, 'utf8');
const dataModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(dataSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
  exports: dataModule.exports, module: dataModule, require: createRequire(dataPath),
});
const { agentMaterials } = dataModule.exports;
const source = fs.readFileSync(page, 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(output, { exports: mod.exports, module: mod, require: id => id === '../data/agentMaterials' ? { agentMaterials } : localRequire(id) });
const { filterAgentMaterials, AgentMaterialsPage } = mod.exports;
assert.equal(agentMaterials.length, 74);
assert.equal(new Set(agentMaterials.map(item => item.id)).size, 74);
assert.ok(agentMaterials.every(item => item.title.trim() && item.text.trim()));
assert.equal(agentMaterials.filter(item => item.caption?.trim()).length, 7);
assert.ok(agentMaterials.filter(item => item.caption).every(item => !item.caption.includes('Visual:') && !item.caption.includes('Objetivo:')));
assert.equal(new Set(agentMaterials.map(item => item.category)).size, 9);
const generatedImageCount = Object.keys(reqGeneratedImages()).length;
assert.equal(generatedImageCount, 7);
assert.equal(agentMaterials.filter(item => item.imageUrl).length, 7 + generatedImageCount);
function reqGeneratedImages() { return JSON.parse(fs.readFileSync(path.join(root, 'src/data/agentGeneratedImages.json'), 'utf8').replace(/^\uFEFF/, '')); }
for (const item of agentMaterials.filter(item => item.imageUrl)) {
  assert.ok(item.imageAlt?.trim());
  assert.ok(item.imageUrl.startsWith('/agent-materials/') || /^\/mobile-screen-[a-z0-9-]+\.jpg$/.test(item.imageUrl));
  const asset = fs.readFileSync(path.join(root, 'public', item.imageUrl));
  assert.ok(asset.length > 1000, `Image must not be a placeholder: ${item.imageUrl}`);
  if (item.imageUrl.endsWith('.png')) {
    assert.equal(asset.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(asset.readUInt32BE(16) >= 512 && asset.readUInt32BE(20) >= 512);
  } else {
    assert.equal(asset.subarray(0, 2).toString('hex'), 'ffd8');
    assert.equal(asset.subarray(-2).toString('hex'), 'ffd9');
  }
}
assert.equal(agentMaterials.filter(item => item.notification).length, 19);
for (const item of agentMaterials.filter(item => item.notification)) {
  assert.ok(item.notification.title.length <= 60);
  assert.ok(item.notification.body.length <= 180);
  assert.ok(item.notification.eligibility);
}
assert.equal(filterAgentMaterials(agentMaterials, '   ', '').length, 74);
assert.equal(filterAgentMaterials(agentMaterials, 'ATENDIMENTO', 'Atendimento').length, 10);
assert.deepEqual(Array.from(filterAgentMaterials(agentMaterials, 'ATENDIMENTO', ''), item => item.id), Array.from(filterAgentMaterials(agentMaterials, 'atendimento', ''), item => item.id));
assert.equal(filterAgentMaterials(agentMaterials, 'cobrancas', 'Cobranças').length, 5);
assert.equal(filterAgentMaterials(agentMaterials, 'termo inexistente xyz', '').length, 0);
assert.equal(filterAgentMaterials(agentMaterials, 'boas-vindas', 'Suporte').length, 0);
assert.equal(filterAgentMaterials(agentMaterials, '', 'Conteúdo').length, 14);
const html = renderToStaticMarkup(React.createElement(AgentMaterialsPage));
assert.equal((html.match(/<article /g) || []).length, 74);
assert.ok(html.includes('Materiais do time'));
assert.ok(html.includes('agent-material-search'));
assert.ok(html.includes('agent-material-area'));
assert.ok(html.includes('aria-live="polite"'));
assert.equal((html.match(/<img /g) || []).length, 7 + generatedImageCount);
assert.ok(html.includes('Categorias de materiais'));
assert.ok(!source.includes('dangerouslySetInnerHTML'));
const admin = fs.readFileSync(path.join(root, 'src/admin/AdminApp.tsx'), 'utf8');
assert.ok(admin.includes("id: 'agent-materials'"));
assert.ok(admin.includes("page === 'agent-materials' && <AgentMaterialsPage onPrepareNotification="));
console.log('PASS: catalog, accent/case/combined filters, empty results, SSR 74 cards, accessibility labels and admin integration.');
console.log('SSR checks completed; component handler interaction checks follow below.');

// Component interaction tests with deterministic React hook state and mocked DOM refs.
// This runs the actual component handlers. It does not emulate browser permissions/layout.
function makeHarness(clipboard) {
  const state = [];
  let cursor = 0;
  let pendingEffects = [];
  const textarea = { focusCalls: 0, selectCalls: 0, focus() { this.focusCalls++; }, select() { this.selectCalls++; } };
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }];
    },
    useRef(initial) { const index = cursor++; if (!(index in state)) state[index] = { current: initial }; return state[index]; },
    useMemo(factory) { return factory(); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!state[index] || deps.some((value, i) => value !== state[index][i])) pendingEffects.push(effect);
      state[index] = deps;
    },
  };
  const componentModule = { exports: {} };
  vm.runInNewContext(output, {
    exports: componentModule.exports, module: componentModule,
    navigator: { clipboard },
    require: id => id === 'react' ? hooks : id === '../data/agentMaterials' ? { agentMaterials } : localRequire(id),
  });
  function elements(node) {
    if (node == null || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children)];
  }
  return {
    textarea,
    render(props) {
      cursor = 0;
      pendingEffects = [];
      const tree = componentModule.exports.AgentMaterialsPage(props);
      const nodes = elements(tree);
      for (const node of nodes) if (node.type === 'textarea' && node.ref) node.ref.current = textarea;
      for (const effect of pendingEffects) effect();
      return nodes;
    },
  };
}
function copyButton(nodes) { return nodes.find(node => node.type === 'button' && node.props['aria-label']?.startsWith('Copiar texto')); }
const flushPromises = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  let written;
  let release;
  const clipboard = makeHarness({ writeText(text) { written = text; return new Promise(resolve => { release = resolve; }); } });
  let nodes = clipboard.render();
  const trigger = { focus() {} };
  copyButton(nodes).props.onClick({ currentTarget: trigger });
  nodes = clipboard.render();
  assert.ok(nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Copiar texto')).every(node => node.props.disabled));
  assert.equal(written, agentMaterials[0].text);
  release();
  await flushPromises();
  nodes = clipboard.render();
  assert.ok(nodes.some(node => node.props?.role === 'status' && typeof node.props.children === 'string' && node.props.children.includes('copiado')));
  assert.ok(!nodes.some(node => node.type === 'textarea'));
  assert.ok(!copyButton(nodes).props.disabled);

  for (const api of [undefined, { writeText() { return Promise.reject(new Error('Permission denied')); } }]) {
    const fallback = makeHarness(api);
    let focusRestored = false;
    nodes = fallback.render();
    copyButton(nodes).props.onClick({ currentTarget: { focus() { focusRestored = true; } } });
    await flushPromises();
    nodes = fallback.render();
    const textarea = nodes.find(node => node.type === 'textarea');
    assert.equal(textarea.props.value, agentMaterials[0].text);
    assert.equal(textarea.props.readOnly, true);
    assert.equal(textarea.props['aria-describedby'], 'manual-copy-instructions');
    assert.ok(nodes.some(node => node.props?.role === 'alert'));
    assert.equal(fallback.textarea.focusCalls, 1);
    assert.equal(fallback.textarea.selectCalls, 1);
    textarea.props.onFocus({ currentTarget: fallback.textarea });
    assert.equal(fallback.textarea.selectCalls, 2);
    assert.ok(!nodes.some(node => node.props?.role === 'status' && String(node.props.children).includes('copiado')));
    nodes.find(node => node.props?.['aria-label'] === 'Fechar cópia manual').props.onClick();
    assert.equal(focusRestored, true);
    assert.ok(!fallback.render().some(node => node.type === 'textarea'));
  }
  const filters = makeHarness(undefined);
  nodes = filters.render();
  nodes.find(node => node.props?.id === 'agent-material-search').props.onChange({ target: { value: 'inexistente xyz' } });
  nodes = filters.render();
  assert.equal(nodes.filter(node => node.type === 'article').length, 0);
  nodes.find(node => node.type === 'button' && node.props.children === 'Limpar filtros').props.onClick();
  assert.equal(filters.render().filter(node => node.type === 'article').length, 74);
  assert.ok(agentMaterials.every(item => filterAgentMaterials(agentMaterials, item.title, item.area).some(found => found.id === item.id)));
  const categories = makeHarness(undefined);
  let copiedCaption;
  const captions = makeHarness({ writeText(text) { copiedCaption = text; return Promise.resolve(); } });
  const captionNodes = captions.render();
  captionNodes.find(node => node.type === 'button' && node.props.children === 'Copiar legenda').props.onClick({ currentTarget: { focus() {} } });
  await flushPromises();
  assert.equal(copiedCaption, agentMaterials.find(item => item.caption).caption);
  let prepared;
  const props = { onPrepareNotification(draft) { prepared = draft; } };
  nodes = categories.render(props);
  const notificationChip = nodes.find(node => node.type === 'button' && node.key === 'Notificações');
  assert.ok(notificationChip);
  notificationChip.props.onClick();
  nodes = categories.render(props);
  assert.equal(nodes.filter(node => node.type === 'article').length, 19);
  const prepareButton = nodes.find(node => node.type === 'button' && node.props.children === 'Preparar notificação');
  prepareButton.props.onClick();
  const firstNotification = agentMaterials.find(item => item.notification).notification;
  assert.equal(prepared.title, firstNotification.title);
  assert.equal(prepared.body, firstNotification.body);
  assert.equal(prepared.target, firstNotification.target);
  assert.equal(prepared.eligibility, firstNotification.eligibility);
  console.log('PASS: 9 categories, 14 image previews, 7 captions, 19 notification drafts, category selection and prepare callback.');
  console.log('PASS: actual component handlers for pending/successful clipboard, denied/missing API, textarea focus/selection, accessible fallback, focus restoration, empty/reset filters and all 74 titles.');
  console.log('Limits: hook/ref harness and SSR; no browser layout, native clipboard permissions, assistive technology or production was exercised.');
})().catch(error => { console.error(error); process.exitCode = 1; });
