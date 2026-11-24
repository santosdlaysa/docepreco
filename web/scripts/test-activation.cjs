const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ts = require('typescript');
const file = path.resolve(__dirname, '../src/pages/ActivationPage.tsx');
const req = createRequire(file);
const state = [], dependencies = [], cleanups = [];
let cursor = 0, effects = [], calls = [], opened = [], prepared = [], pending = [];
const hooks = {
  useState(value) { const index = cursor++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; },
  useEffect(effect, deps) { const index = cursor++; const previous = dependencies[index]; if (!previous || deps.some((x,i) => previous[i] !== x)) effects.push(() => { cleanups[index]?.(); cleanups[index] = effect(); }); dependencies[index] = deps; },
};
const api = { getActivationReport(params) { calls.push(params); return new Promise((resolve, reject) => pending.push({resolve,reject})); } };
const mod = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText,
  { module: mod, exports: mod.exports, require: id => id === 'react' ? hooks : id === '../lib/api' ? {api} : req(id), console });
function nodes(node) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
function render() { cursor = 0; effects = []; const tree = nodes(mod.exports.ActivationPage({onOpenUser: id => opened.push(id), onNotifyUser: user => prepared.push(user.id)})); effects.forEach(run => run()); return tree; }
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : String(node ?? '');
function button(tree, label) { return tree.find(node => node.type === 'button' && text(node) === label); }
const flush = () => new Promise(resolve => setImmediate(resolve));
const data = { days: 30, page: 1, limit: 20, totalAccounts: 25, withIngredients: 3, withRecipes: 2, withSales: 4, withoutRecipes: 23, total: 23, users: [{id:'one', companyName:'Exemplo', email:'test@example.invalid',createdAt:'2026-11-01', lastSeenAt:null,ingredientCount:0,planTier:'free',isActive:false}] };
(async () => {
  let tree = render();
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {days:30,page:1,limit:20,search:''});
  assert.ok(tree.some(node => node.props?.role === 'status'));
  pending.shift().resolve(data); await flush(); tree = render();
  assert.match(text(tree), /Inativa/); assert.match(text(tree), /Sem registro/);
  assert.match(text(tree), /etapas independentes/);
  button(tree,'Abrir usuário').props.onClick(); assert.deepEqual(opened,['one']);
  assert.equal(button(tree,'Preparar ajuda').props.disabled,true); button(tree,'Preparar ajuda').props.onClick(); assert.equal(prepared.length,0);
  assert.equal(button(tree,'Anterior').props.disabled,true);
  button(tree,'Próxima').props.onClick(); render(); assert.equal(calls.at(-1).page,2);
  pending.shift().resolve({...data,page:2, users:[{...data.users[0], isActive:true}]}); await flush(); tree = render();
  assert.equal(button(tree,'Preparar ajuda').props.disabled,false); button(tree,'Preparar ajuda').props.onClick(); assert.deepEqual(prepared,['one']);
  assert.equal(button(tree,'Próxima').props.disabled,true);
  tree.find(node => node.type === 'input').props.onChange({target:{value:'padaria'}}); tree=render();
  tree.find(node => node.type === 'form').props.onSubmit({preventDefault(){}}); render();
  assert.equal(calls.at(-1).search,'padaria'); assert.equal(calls.at(-1).page,1);
  // A period change while the search request is pending must ignore the stale response.
  tree=render(); tree.find(node => node.type === 'select').props.onChange({target:{value:'7'}}); render();
  assert.equal(calls.at(-1).days,7);
  const stale=pending.shift(), fresh=pending.shift();
  fresh.resolve({...data,days:7,totalAccounts:0,total:0,users:[],withIngredients:0,withRecipes:0,withSales:0,withoutRecipes:0}); await flush();
  stale.resolve(data); await flush(); tree=render();
  assert.match(text(tree),/Nenhuma conta/); assert.ok(!text(tree).includes('test@example.invalid'));
  button(tree,'Limpar busca').props.onClick(); render(); pending.shift().reject(new Error('internal sensitive error')); await flush(); tree=render();
  assert.ok(tree.some(node => node.props?.role === 'alert')); assert.ok(!text(tree).includes('internal sensitive'));
  button(tree,'Tentar novamente').props.onClick(); render(); assert.equal(pending.length,1);
  assert.equal(mod.exports.activationPercentage(0,0),'—'); assert.equal(mod.exports.activationPercentage(1,4),'25,0%');
  console.log('PASS ActivationPage: loading, inactive account, independent metrics, open user, paging, search reset, cohort change, stale response, empty state, generic error, retry and percentages. Mocked API, no production access.');
})().catch(error => { console.error(error); process.exitCode=1; });

