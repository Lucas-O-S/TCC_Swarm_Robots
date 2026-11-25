import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

/**
 * Teste de carga da API (RNF01 e risco R05 do plano de testes).
 *
 * Usuários virtuais simultâneos repetem três rotas que não dependem da borda:
 * login, listagem de tasks e status do robô. No fim, o resumo mostra o tempo
 * de resposta (média, p95 e máximo) de cada rota e a taxa de erro, e grava os
 * números em test/carga/resultado.json para o relatório.
 *
 * Como rodar: ver test/README.md (seção "Teste de carga").
 */

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USUARIO = { username: 'carga', password: 'senha123' };
const ROBO = 'AA00000000000001';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** Tempo de resposta (ms) de cada rota, separado para o relatório. */
const tempos = {
    login: new Trend('tempo_login', true),
    tasks: new Trend('tempo_tasks', true),
    status: new Trend('tempo_status', true),
};
/** Quantidade de requisições de cada rota. */
const contagem = {
    login: new Counter('req_login'),
    tasks: new Counter('req_tasks'),
    status: new Counter('req_status'),
};
const erros = new Rate('taxa_erro');

export const options = {
    scenarios: {
        carga: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '15s', target: 20 }, // sobe até 20 usuários
                { duration: '30s', target: 20 }, // mantém 20 usuários
                { duration: '15s', target: 0 },  // desce
            ],
        },
    },
    thresholds: {
        taxa_erro: ['rate<0.01'],
    },
};

/** Cria o usuário de carga (se ainda não existir) e algumas tasks para a listagem. */
export function setup() {
    http.post(`${BASE_URL}/auth/register`, JSON.stringify(USUARIO), { headers: JSON_HEADERS });

    const login = http.post(`${BASE_URL}/auth/login`, JSON.stringify(USUARIO), { headers: JSON_HEADERS });
    const token = login.json('dataUnit.access_token');

    if (!token) {
        throw new Error(`Login do usuário de carga falhou (status ${login.status}). O backend está rodando em ${BASE_URL}?`);
    }

    const auth = { headers: { ...JSON_HEADERS, Authorization: `Bearer ${token}` } };
    for (let i = 1; i <= 10; i++) {
        http.post(`${BASE_URL}/tasks`, JSON.stringify({ name: `Task de carga ${i}` }), auth);
    }

    return { token };
}

function registrar(rota, res, esperado) {
    tempos[rota].add(res.timings.duration);
    contagem[rota].add(1);

    const ok = check(res, { [`${rota} responde ${esperado}`]: (r) => r.status === esperado });
    erros.add(!ok);
}

export default function (dados) {
    const auth = { headers: { ...JSON_HEADERS, Authorization: `Bearer ${dados.token}` } };

    registrar('login', http.post(`${BASE_URL}/auth/login`, JSON.stringify(USUARIO), { headers: JSON_HEADERS }), 201);
    registrar('tasks', http.get(`${BASE_URL}/tasks`, auth), 200);
    registrar('status', http.get(`${BASE_URL}/robots/${ROBO}/status`), 200);

    sleep(1);
}

/** Resumo em tabela no terminal e os números completos em test/carga/resultado.json. */
export function handleSummary(data) {
    const m = data.metrics;
    const ms = (v) => `${v.toFixed(1)} ms`;
    const linha = (rota) => {
        const t = m[`tempo_${rota}`].values;
        const n = m[`req_${rota}`].values.count;
        return `${rota.padEnd(8)} ${String(n).padStart(8)} ${ms(t.avg).padStart(10)} ${ms(t['p(95)']).padStart(10)} ${ms(t.max).padStart(10)}`;
    };
    const total = ['login', 'tasks', 'status'].reduce((soma, rota) => soma + m[`req_${rota}`].values.count, 0);
    const segundos = data.state.testRunDurationMs / 1000;

    const resumo = [
        '',
        'Rota       Requis.      Média        p95     Máximo',
        linha('login'),
        linha('tasks'),
        linha('status'),
        '',
        `Requisições: ${total} (${(total / segundos).toFixed(1)} por segundo)`,
        `Taxa de erro: ${(m.taxa_erro.values.rate * 100).toFixed(2)}%`,
        `Usuários simultâneos (máx.): ${m.vus_max.values.max}`,
        '',
    ].join('\n');

    return {
        stdout: resumo,
        'test/carga/resultado.json': JSON.stringify(data, null, 2),
    };
}
