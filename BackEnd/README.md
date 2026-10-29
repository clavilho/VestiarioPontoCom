# BackEnd

API do Vestiario em Node.js, Express e TypeScript, organizada em camadas:

- `src/domain`: regras e erros de domínio.
- `src/application/ports`: interfaces de saída usadas pelos serviços.
- `src/application/services`: casos de uso de autenticação, dados, workspace e RPC.
- `src/infrastructure`: adaptador MongoDB e composição das dependências.
- `src/presentation`: controllers, rotas HTTP e documentação Swagger.

## Executar localmente

```powershell
npm install
npm run dev
```

Copie `.env.example` para `.env` e configure `MONGODB_URI`. A API inicia em `http://localhost:3001`, com documentação em `/swagger` e verificação em `/api/health`.

## Rotas

- `GET /api/health`
- `POST /api/auth`
- `POST /api/auth/google`
- `GET /api/workspace`
- `GET /api/clubs/:clubId`
- `POST /api/data`
- `POST /api/rpc`

Configure `CORS_ALLOWED_ORIGINS` com as origens do frontend separadas por vírgula. Para produção, configure também `MONGODB_URI`, `MONGODB_DATABASE` e `GOOGLE_CLIENT_ID` no host da API. Não use variáveis secretas no frontend.

## Deploy no Vercel

Crie um projeto ligado ao mesmo repositório do frontend e use `BackEnd` como Root Directory. O Vercel detecta o servidor Express em `src/server.ts`. Configure as variáveis acima no projeto da API e defina `VITE_API_URL` no projeto `FrontEnd` com a URL pública da API, sem adicionar `/api` ao final.
