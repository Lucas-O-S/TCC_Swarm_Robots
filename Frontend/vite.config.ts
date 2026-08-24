import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
//
// `nodePolyfills` entra só por causa do cliente `mqtt` (usado na tela de
// Simulação, ver src/simulator/link/MqttFleetLink.ts): a lib foi escrita
// pensando em Node e ainda depende internamente de globals como `process`/
// `global` em alguns caminhos de código, mesmo quando falamos só WebSocket
// no navegador. Nosso próprio código não usa `Buffer` (ver protocol/base64.ts).
export default defineConfig({
  plugins: [react(), nodePolyfills()],
})
