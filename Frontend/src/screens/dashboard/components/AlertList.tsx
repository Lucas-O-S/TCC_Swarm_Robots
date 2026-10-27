// Componente órfão: nada em src/ importa `AlertList` — `DashboardScreen.tsx`
// usa `ConnectionList`/`ConnectionLog` no lugar dele hoje. O arquivo
// original importava um tipo `Alert` que não existe mais em `../types.ts`,
// o que quebrava `tsc -b` (todo `src/` é type-checked, mesmo arquivo que
// ninguém importa — ver `tsconfig.app.json`, `"include": ["src"]`).
// Substituído por este stub vazio só pra não quebrar o build. Seguro
// apagar este arquivo (e a pasta toda, se `RobotList.tsx`/`SwarmMap.tsx`/
// `useSwarmMap.ts` também não forem mais usados).
export {};
