/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_MQTT_WS_URL: string;
  readonly VITE_MARI_NETWORK_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
