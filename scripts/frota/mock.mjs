import { createServer } from 'node:http';
// mock do backend p/ testar frota.mjs: GET /robots + PUT /robots/:addr/:cmd
const robots = [
  { address: '0000000000000001', name: 'DotBot 01', status: 1, battery: 3, mode: 1, deletedAt: null },
  { address: 'a1b2c3d4e5f60708', name: 'DotBot-a1b2', status: 1, battery: 4.19, mode: 1, deletedAt: null },
  { address: 'eba310d5f5bd07be', name: 'DotBot-eba3', status: 1, battery: 4.19, mode: 1, deletedAt: null },
  { address: 'deadbeefdeadbeef', name: 'apagado', status: 2, battery: 4, mode: 1, deletedAt: '2026-01-01' },
];
let puts = 0;
createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/robots') {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ status: 200, message: 'ok', data: robots }));
  }
  const m = req.url.match(/^\/robots\/([0-9a-fA-F]+)\/(move-raw|rgb-led|control-mode|waypoints)$/);
  if (req.method === 'PUT' && m) {
    puts++;
    let body = '';
    req.on('data', (c) => (body += c));
    return req.on('end', () => {
      console.log(`  <- PUT ${m[1]}/${m[2]} ${body}`);
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 200 }));
    });
  }
  res.statusCode = 404;
  res.end('nope');
}).listen(3000, () => console.log('mock on :3000'));
process.on('SIGTERM', () => { console.log(`total PUTs=${puts}`); process.exit(0); });
