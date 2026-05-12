# Frontend Setup

Este diretório contém os dois frontends do projeto:

- `web`: React.js com Vite
- `mobile`: React Native com Expo

## Estrutura base criada

### Web (`Frontend/web/src`)

- `components/common`: componentes reutilizáveis de UI
- `components/layout`: containers/layouts de página
- `screens`: ecras/páginas principais
- `services`: chamadas a API e lógica de dados

### Mobile (`Frontend/mobile/src`)

- `components/common`: componentes reutilizáveis de UI
- `components/layout`: wrappers de ecrã
- `screens`: ecras da app
- `services`: chamadas a API e lógica de dados
- `theme`: tokens visuais (cores)

## Requisitos

- Node.js 20+
- npm 10+

## Rodar o frontend web (React.js)

```bash
cd Frontend/web
npm install
npm run dev
```

Por padrão, o Vite abre em `http://localhost:5173`.

API base (opcional):

- criar `Frontend/web/.env` com `VITE_API_BASE_URL=http://localhost:8000`

## Rodar o frontend mobile (React Native)

```bash
cd Frontend/mobile
npm install
npm start
```

Depois, no menu do Expo:

- `a` para Android
- `i` para iOS (macOS)
- `w` para Web

Também podes usar diretamente:

```bash
npm run android
npm run ios
npm run web
```

API base (opcional):

- criar `Frontend/mobile/.env` com `EXPO_PUBLIC_API_BASE_URL=http://localhost:8000`

Realtime WebSocket (tracking):

- usar `Frontend/mobile/.env.example` como base
- definir `EXPO_PUBLIC_REVERB_*`
- definir `EXPO_PUBLIC_TRACKING_ORDER_ID` com UUID real de encomenda
- em ambiente local, podes usar `EXPO_PUBLIC_DEV_BROADCAST_USER_ID` para auth de canais privados
