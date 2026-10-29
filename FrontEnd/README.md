# FrontEnd

Frontend React do VestiarioPontoCom. O navegador chama a API Node.js + TypeScript pelos endpoints `/api`; a conexão MongoDB permanece no backend.

## Requisitos

- Node.js 20 ou superior
- MongoDB local ou MongoDB Atlas

## Executar localmente

Em um terminal, na raiz do repositório, instale as dependências do backend e inicie a API:

```powershell
cd BackEnd
npm install
npm run dev
```

Em outro terminal, na raiz do repositório, instale as dependências do frontend e inicie o Vite:

```powershell
cd FrontEnd
npm install
npm run dev
```

Abra `http://localhost:5173`. Durante o desenvolvimento, o Vite encaminha `/api` para `http://localhost:3001`.

## Configuração

A API usa `MONGODB_URI` e opcionalmente `MONGODB_DATABASE`; sem essas variáveis, conecta a `mongodb://127.0.0.1:27017` e usa o banco `vestiario`. Consulte `BackEnd/.env.example`.

No Vercel, crie dois projetos ligados ao mesmo repositório: use `FrontEnd` como Root Directory do frontend e `BackEnd` como Root Directory da API. Configure `MONGODB_URI`, `MONGODB_DATABASE`, `GOOGLE_CLIENT_ID` e `CORS_ALLOWED_ORIGINS` no projeto da API. No frontend, configure `VITE_API_URL` com a origem pública da API e `VITE_GOOGLE_CLIENT_ID`. A recuperação de senha por e-mail depende de SMTP configurado no backend.

Use `BackEnd/.env.example` e `FrontEnd/.env.example` como referência. Não coloque credenciais do MongoDB no frontend.
