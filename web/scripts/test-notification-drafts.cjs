const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const ts = require('typescript');
const page = path.resolve(__dirname, '../src/pages/NotificationsPage.tsx');
const req = createRequire(page);
const source = fs.readFileSync(page, 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText;
function makeHarness() {
  const state = [], effectDeps = [], cleanups = [];
  let cursor = 0, effects = [], nextTimer = 0;
  const timers = new Map();
  const users = Array.from({length: 101}, (_, i) => ({id:`00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,companyName:`Loja ${i+1}`,email:`loja${i+1}@example.test`}));
  const calls = {create:[],send:0,search:[],errors:[],consumed:0};
  let resolver;
  const api = {
    listNotifications: async () => [],
    getPlanConfig: async () => ({premiumPrice:10,masterPrice:20}),
    listUsers: async params => {
      calls.search.push(params);
      if(params.search === 'erro') throw new Error('Network');
      if(params.search === 'vazio') return {users:[]};
      if(params.search === 'lento') return new Promise(resolve => {resolver=resolve;});
      return {users: params.search === 'cem' ? users : users.slice(0,2)};
    },
    createNotification: async data => { calls.create.push(data); },
    sendNotification: async () => { calls.send++; },
  };
  const hooks = {
    useState(initial) {const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next;}];},
    useEffect(effect,deps) {const i=cursor++;if(!effectDeps[i] || deps.some((v,j)=>v!==effectDeps[i][j])){effects.push(()=>{cleanups[i]?.();cleanups[i]=effect();});}effectDeps[i]=deps;},
  };
  const mod={exports:{}};
  const components={TableSkeleton:()=>null,ConfirmModal:()=>null,ModalOverlay:()=>null};
  vm.runInNewContext(output,{module:mod,exports:mod.exports,console,
    setTimeout(fn){const id=++nextTimer;timers.set(id,fn);return id;}, clearTimeout(id){timers.delete(id);},
    require:id=>id==='react'?hooks:id==='../lib/api'?{api}:id==='../components'?components:req(id),
  });
  function nodes(n){if(!n||typeof n!=='object')return [];if(Array.isArray(n))return n.flatMap(nodes);return [n,...nodes(n.props?.children)];}
  const defaults={toast:{success(){},error(m){calls.errors.push(m);}},onDraftConsumed(){calls.consumed++;}};
  return {calls,users,
    render(props={}){cursor=0;effects=[];const result=nodes(mod.exports.NotificationsPage({...defaults,...props}));effects.forEach(f=>f());return result;},
    async timers(){const current=[...timers.values()];timers.clear();await Promise.all(current.map(fn=>fn()));},
    resolveSlow(){resolver({users:[users[99]]});},
    cleanup(){cleanups.forEach(fn=>fn?.());},
  };
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const target=nodes=>nodes.find(n=>n.type==='select'&&n.props['aria-label']==='Alvo da notificação');
const search=nodes=>nodes.find(n=>n.props?.id==='notification-recipient-search');
const resultChecks=nodes=>nodes.filter(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.className==='mt-1 rounded');
const submit=nodes=>nodes.find(n=>n.type==='button'&&['Enviar agora','Agendar','Salvando…'].includes(n.props.children));
(async()=>{
  const h=makeHarness();
  const draft={title:'Teste de modelo',body:'Texto para revisão.',target:'expired',eligibility:'Pagamento conferido',requiresIndividualTargeting:true};
  h.render({initialDraft:draft});let nodes=h.render({initialDraft:null});
  assert.equal(h.calls.consumed,1);assert.equal(target(nodes).props.value,'individual');
  assert.equal(target(nodes).props.children.find(n=>n.props.value==='all').props.disabled,true);
  assert.ok(nodes.some(n=>n.type==='input'&&n.props.value===draft.title));assert.ok(nodes.some(n=>n.type==='textarea'&&n.props.value===draft.body));
  assert.ok(nodes.some(n=>n.type==='p'&&n.props.children===draft.eligibility));
  assert.equal(submit(nodes).props.disabled,true);await submit(nodes).props.onClick();assert.equal(h.calls.create.length,0);
  search(nodes).props.onChange({target:{value:'ab'}});nodes=h.render();await h.timers();assert.equal(h.calls.search.length,0);
  search(nodes).props.onChange({target:{value:' loja '}});nodes=h.render();assert.equal(h.calls.search.length,0);nodes=h.render();assert.ok(nodes.some(n=>n.props?.role==='status'&&n.props.children==='Buscando usuários…'));
  await h.timers();nodes=h.render();assert.equal(h.calls.search[0].search,'loja');assert.equal(h.calls.search[0].limit,20);
  resultChecks(nodes)[0].props.onChange();nodes=h.render();assert.equal(submit(nodes).props.disabled,false);
  search(nodes).props.onChange({target:{value:'vazio'}});h.render();await h.timers();nodes=h.render();assert.ok(nodes.some(n=>n.props?.role==='status'&&n.props.children==='Nenhum usuário encontrado para esta busca.'));
  assert.ok(nodes.some(n=>n.props?.['aria-label']===`Remover ${h.users[0].email}`));
  search(nodes).props.onChange({target:{value:'erro'}});h.render();await h.timers();nodes=h.render();assert.ok(nodes.some(n=>n.props?.role==='alert'));
  search(nodes).props.onChange({target:{value:'lento'}});h.render();const pending=h.timers();await flush();nodes=h.render();search(nodes).props.onChange({target:{value:'loja'}});h.render();await h.timers();h.resolveSlow();await pending;nodes=h.render();assert.equal(resultChecks(nodes).length,2);assert.ok(!nodes.some(n=>n.type==='span'&&String(n.props.children).includes(h.users[99].email)));
  const schedule=nodes.find(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.className==='rounded');schedule.props.onChange({target:{checked:true}});nodes=h.render();assert.equal(submit(nodes).props.disabled,true);await submit(nodes).props.onClick();assert.equal(h.calls.create.length,0);
  nodes.find(n=>n.type==='input'&&n.props.type==='datetime-local').props.onChange({target:{value:'2099-01-01T12:00'}});nodes=h.render();await submit(nodes).props.onClick();assert.equal(h.calls.create.length,1);
  assert.deepEqual(Array.from(h.calls.create[0].recipientUserIds),[h.users[0].id]);assert.equal(h.calls.create[0].target,'individual');assert.ok(h.calls.create[0].scheduledAt.startsWith('2099-01-01'));
  nodes=h.render();assert.ok(!search(nodes));
  const optional={...draft,requiresIndividualTargeting:false,target:'individual'};h.render({initialDraft:optional});nodes=h.render();search(nodes).props.onChange({target:{value:'loja'}});h.render();await h.timers();nodes=h.render();resultChecks(nodes)[0].props.onChange();nodes=h.render();
  nodes.find(n=>n.props?.['aria-label']===`Remover ${h.users[0].email}`).props.onClick();nodes=h.render();assert.equal(submit(nodes).props.disabled,true);resultChecks(nodes)[0].props.onChange();nodes=h.render();
  target(nodes).props.onChange({target:{value:'all'}});nodes=h.render();assert.ok(!search(nodes));await submit(nodes).props.onClick();assert.equal(h.calls.create[1].target,'all');assert.equal(h.calls.create[1].recipientUserIds,undefined);
  h.render({initialDraft:{...optional}});nodes=h.render();assert.equal(submit(nodes).props.disabled,true);search(nodes).props.onChange({target:{value:'cem'}});h.render();await h.timers();nodes=h.render();
  for(let i=0;i<100;i++){resultChecks(nodes)[i].props.onChange();nodes=h.render();}assert.equal(resultChecks(nodes)[100].props.disabled,true);resultChecks(nodes)[100].props.onChange();nodes=h.render();assert.equal(nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Remover ')).length,100);
  nodes.find(n=>n.type==='button'&&n.props.children==='Cancelar').props.onClick();nodes=h.render();assert.ok(!search(nodes));assert.equal(h.calls.create.length,2);assert.equal(h.calls.send,0);h.cleanup();
  const activation = makeHarness();
  const active = { ...activation.users[0], isActive: true };
  const inactive = { ...activation.users[1], isActive: false };
  activation.render({initialDraft:{...draft,target:'all',requiresIndividualTargeting:false,recipients:[active,active,inactive]}});
  nodes=activation.render();
  assert.equal(target(nodes).props.value,'individual');
  assert.equal(nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Remover ')).length,1);
  assert.ok(nodes.some(n=>n.props?.['aria-label']===`Remover ${active.email}`));
  assert.ok(!nodes.some(n=>n.props?.['aria-label']===`Remover ${inactive.email}`));
  assert.equal(submit(nodes).props.disabled,false);
  assert.equal(target(nodes).props.children.find(n=>n.props.value==='all').props.disabled,true);
  nodes.find(n=>n.type==='button'&&n.props.children==='Cancelar').props.onClick();
  assert.ok(!search(activation.render()));
  assert.equal(activation.calls.create.length,0);assert.equal(activation.calls.send,0);assert.equal(activation.calls.search.length,0);
  activation.render({initialDraft:{...draft,recipients:activation.users.map(user=>({...user,isActive:true}))}});nodes=activation.render();
  assert.equal(nodes.filter(n=>n.type==='button'&&n.props['aria-label']?.startsWith('Remover ')).length,100);
  activation.render({initialDraft:{...draft,recipients:[inactive]}});nodes=activation.render();
  assert.equal(submit(nodes).props.disabled,true);assert.equal(target(nodes).props.value,'individual');activation.cleanup();
  console.log('PASS: activation draft preselects active users only, deduplicates, forces individual, caps100; empty active selection blocked; cancel never creates/sends/searches.');
  console.log('PASS: required draft forces individual; consume/prefill; min3/debounce/loading/errors/empty/stale-response protection; multi-select persists search, remove/cap100; scheduled payload stores IDs; group payload omits IDs; blank schedule blocked; cancel creates/sends nothing.');
  console.log('All API/timer interactions were mocked. No live user search, creation, scheduling or sending occurred.');
})().catch(error=>{console.error(error);process.exitCode=1;});
