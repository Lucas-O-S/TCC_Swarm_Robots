#!/usr/bin/env node
// frota.mjs — dispara um comando para TODA a frota de uma vez.
//
// Busca a lista de robôs em `GET /robots` e faz o `PUT` correspondente em
// cada `address` em paralelo. Sem dependências: usa o fetch nativo do Node 18+.
//
// Uso rápido:
//   node frota.mjs list
//   node frota.mjs move-raw --left_x 100 --left_y 0 --right_x 0 --right_y 0
//   node frota.mjs frente --speed 100        # anda pra frente (atalho)
//   node frota.mjs tras   --speed 100        # anda pra tras
//   node frota.mjs girar  --speed 100        # gira no proprio eixo
//   node frota.mjs stop
//
// IMPORTANTE (tracao diferencial): o move-raw usa left_y = roda ESQUERDA e
// right_y = roda DIREITA. left_x/right_x sao IGNORADOS (igual ao DotBot real).
// Entao "--left_x 100" nao move nada; use --left_y/--right_y (ou os atalhos).
//   node frota.mjs rgb --red 255 --green 0 --blue 0
//   node frota.mjs mode --mode 1
//   node frota.mjs waypoints --threshold 100 --points "1000,2000;1500,300"
//   node frota.mjs move-raw --body '{"left_x":100,"left_y":0,"right_x":0,"right_y":0}'
//
// Filtros/flags globais:
//   --only <a1,a2,...>   só esses addresses
//   --status <n>         só robôs com esse status (ex.: 1 = ativo)
//   --include-deleted    inclui robôs com deletedAt != null (padrão: exclui)
//   --dry-run            mostra o que faria, sem enviar
//   --concurrency <n>    nº de requisições simultâneas (padrão 16)
//
// Ambiente:
//   API_URL   base da API (padrão http://localhost:3000)
//   TOKEN     Bearer token (se AUTH_ACTIVATED=true no backend)

import { readFileSync } from 'node:fs';

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const TOKEN = process.env.TOKEN ?? '';

// ---------------------------------------------------------------------------
// Parse de argumentos: primeiro token = comando; resto = --flag valor.
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const command = argv[0];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true; // flag booleana
    } else {
      flags[key] = next;
      i++;
    }
  }
}

const CONCURRENCY = Number(flags.concurrency ?? 16);
const DRY = Boolean(flags['dry-run']);

function headers() {
  const h = { 'Content-Type': 'application/json', accept: '*/*' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

function usageAndExit() {
  console.log(`frota.mjs — comanda toda a frota de uma vez (API: ${API_URL})

comandos:
  list                              lista os robôs (address, nome, status, bateria)
  move-raw   --left_x --left_y --right_x --right_y   joystick p/ todos
                                    (left_y=roda esq, right_y=roda dir; x ignorado)
  frente     --speed N             anda pra frente (left_y=right_y=N)
  tras       --speed N             anda pra tras
  girar      --speed N             gira no proprio eixo
  stop                              move-raw com tudo em 0 (para a frota)
  rgb        --red --green --blue   cor do LED p/ todos (0..255)
  mode       --mode                 control-mode p/ todos (0=Manual, 1=Auto)
  waypoints  --threshold --points "x,y;x,y;..."   rota (igual) p/ todos
  quadrados  --size --gap --threshold [--cols --x0 --y0]   quadradinho por robô,
                                    cada um na SUA célula (não se batem)
  assign     --taskId <uuid>        atribui uma task (orchestrator) p/ todos
  <rota>     --body '<json>'        rota crua: ex. move-raw --body '{...}'
  <rota>     --file <arquivo.json>  corpo lido de um arquivo: ex. waypoints --file rota.json

flags: --only a1,a2  --status N  --include-deleted  --dry-run  --concurrency N
env:   API_URL (${API_URL})  TOKEN (${TOKEN ? 'definido' : 'vazio'})`);
  process.exit(command ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Busca a frota.
// ---------------------------------------------------------------------------
async function fetchFleet() {
  const res = await fetch(`${API_URL}/robots`, { headers: headers() });
  if (!res.ok) throw new Error(`GET /robots falhou: HTTP ${res.status} ${res.statusText}`);
  const json = await res.json();
  const list = Array.isArray(json) ? json : (json.data ?? []);
  let robots = list;
  if (!flags['include-deleted']) robots = robots.filter((r) => r.deletedAt == null);
  if (flags.only) {
    const set = new Set(String(flags.only).split(',').map((s) => s.trim().toLowerCase()));
    robots = robots.filter((r) => set.has(String(r.address).toLowerCase()));
  }
  if (flags.status !== undefined) {
    robots = robots.filter((r) => Number(r.status) === Number(flags.status));
  }
  return robots;
}

// ---------------------------------------------------------------------------
// Monta (rota, body) a partir do comando.
// ---------------------------------------------------------------------------
function int(v, name) {
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`${name} deve ser inteiro (recebido: ${v})`);
  return n;
}

function buildRequest() {
  // corpo vindo de arquivo .json tem prioridade (ex.: --file rota.json)
  if (flags.file) {
    return { route: command, body: JSON.parse(readFileSync(String(flags.file), 'utf-8')) };
  }
  // body cru (JSON inline) vem em seguida
  if (flags.body) {
    const route = command;
    return { route, body: JSON.parse(flags.body) };
  }
  switch (command) {
    case 'move-raw':
      return {
        route: 'move-raw',
        body: {
          left_x: int(flags.left_x ?? 0, 'left_x'),
          left_y: int(flags.left_y ?? 0, 'left_y'),
          right_x: int(flags.right_x ?? 0, 'right_x'),
          right_y: int(flags.right_y ?? 0, 'right_y'),
        },
      };
    case 'stop':
      return { route: 'move-raw', body: { left_x: 0, left_y: 0, right_x: 0, right_y: 0 } };
    case 'frente':
    case 'forward': {
      const s = int(flags.speed ?? 100, 'speed');
      return { route: 'move-raw', body: { left_x: 0, left_y: s, right_x: 0, right_y: s } };
    }
    case 'tras':
    case 'back': {
      const s = int(flags.speed ?? 100, 'speed');
      return { route: 'move-raw', body: { left_x: 0, left_y: -s, right_x: 0, right_y: -s } };
    }
    case 'girar':
    case 'spin': {
      const s = int(flags.speed ?? 100, 'speed');
      return { route: 'move-raw', body: { left_x: 0, left_y: -s, right_x: 0, right_y: s } };
    }
    case 'rgb':
    case 'rgb-led':
      return {
        route: 'rgb-led',
        body: {
          red: int(flags.red ?? 0, 'red'),
          green: int(flags.green ?? 0, 'green'),
          blue: int(flags.blue ?? 0, 'blue'),
        },
      };
    case 'mode':
    case 'control-mode':
      return { route: 'control-mode', body: { mode: int(flags.mode ?? 0, 'mode') } };
    case 'waypoints': {
      const pts = String(flags.points ?? '')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
          const [x, y] = pair.split(',').map((n) => int(n, 'ponto'));
          return { x, y };
        });
      if (pts.length === 0) throw new Error('waypoints exige --points "x,y;x,y;..."');
      return {
        route: 'waypoints',
        body: { threshold: int(flags.threshold ?? 100, 'threshold'), waypoints: pts },
      };
    }
    case 'quadrado':
    case 'quadrados':
    case 'squares': {
      // Cada robô anda um quadradinho na SUA célula de uma grade, pra não se
      // baterem. Corpo de waypoints diferente por robô (via perRobot).
      const size = int(flags.size ?? 300, 'size');        // lado do quadrado (mm)
      const gap = int(flags.gap ?? 200, 'gap');            // folga entre células (mm)
      const threshold = int(flags.threshold ?? 50, 'threshold');
      const spacing = size + gap;                          // passo da grade
      const x0 = int(flags.x0 ?? spacing, 'x0');           // origem da grade
      const y0 = int(flags.y0 ?? spacing, 'y0');
      const half = Math.round(size / 2);
      return {
        route: 'waypoints',
        meta: { size, gap, spacing, threshold, x0, y0 },
        perRobot: (_robot, i, total) => {
          const cols = flags.cols ? int(flags.cols, 'cols') : Math.ceil(Math.sqrt(total));
          const col = i % cols;
          const row = Math.floor(i / cols);
          const cx = x0 + col * spacing;
          const cy = y0 + row * spacing;
          const sq = [
            { x: cx - half, y: cy - half },
            { x: cx + half, y: cy - half },
            { x: cx + half, y: cy + half },
            { x: cx - half, y: cy + half },
            { x: cx - half, y: cy - half }, // fecha o quadrado
          ].map((p) => ({ x: Math.max(0, p.x), y: Math.max(0, p.y) }));
          return { threshold, waypoints: sq };
        },
      };
    }
    case 'assign':
      if (!flags.taskId) throw new Error('assign exige --taskId <uuid>');
      return { route: 'assign', body: { taskId: String(flags.taskId) }, orchestrator: true };
    default:
      return null;
  }
}

function urlFor(address, req) {
  if (req.orchestrator) return `${API_URL}/orchestrator/robots/${address}/assign`;
  return `${API_URL}/robots/${address}/${req.route}`;
}

// ---------------------------------------------------------------------------
// Envia em paralelo com limite de concorrência.
// ---------------------------------------------------------------------------
async function sendAll(robots, req) {
  const results = [];
  let idx = 0;
  async function worker() {
    while (idx < robots.length) {
      const i = idx++;
      const r = robots[i];
      const url = urlFor(r.address, req);
      const body = req.perRobot ? req.perRobot(r, i, robots.length) : req.body;
      if (DRY) {
        results.push({ address: r.address, ok: true, status: 'dry-run', url, body });
        continue;
      }
      try {
        const res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
        results.push({ address: r.address, ok: res.ok, status: res.status });
      } catch (e) {
        results.push({ address: r.address, ok: false, status: 'ERRO', error: String(e.message ?? e) });
      }
    }
  }
  const n = Math.max(1, Math.min(CONCURRENCY, robots.length));
  await Promise.all(Array.from({ length: n }, worker));
  return results;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
(async () => {
  if (!command || flags.help || flags.h) usageAndExit();

  const robots = await fetchFleet();
  if (robots.length === 0) {
    console.log('Nenhum robô encontrado (verifique API_URL, filtros e se o backend está no ar).');
    process.exit(1);
  }

  if (command === 'list') {
    console.log(`${robots.length} robô(s) em ${API_URL}/robots:\n`);
    for (const r of robots) {
      console.log(
        `  ${r.address}  ${String(r.name ?? '').padEnd(28)} status=${r.status} bat=${r.battery} mode=${r.mode}`,
      );
    }
    process.exit(0);
  }

  const req = buildRequest();
  if (!req) usageAndExit();

  console.log(
    `${DRY ? '[DRY-RUN] ' : ''}Enviando "${command}" -> ${robots.length} robô(s)  (${API_URL})`,
  );
  if (req.perRobot) {
    if (req.meta) console.log(`grade: ${JSON.stringify(req.meta)} (corpo diferente por robô)`);
    console.log(`ex. robô[0]: ${JSON.stringify(req.perRobot(robots[0], 0, robots.length))}\n`);
  } else {
    console.log(`body: ${JSON.stringify(req.body)}\n`);
  }

  const t0 = Date.now();
  const results = await sendAll(robots, req);
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;

  for (const r of results.filter((x) => !x.ok)) {
    console.log(`  FALHA ${r.address}  status=${r.status}${r.error ? '  ' + r.error : ''}`);
  }
  console.log(
    `\nConcluído em ${Date.now() - t0} ms — ${ok} ok, ${fail} falha(s) de ${results.length}.`,
  );
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('Erro:', e.message ?? e);
  process.exit(1);
});
