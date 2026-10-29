# FrontEnd

Frontend React do VestiarioPontoCom. O navegador chama a API ASP.NET Core pelos endpoints `/api`; a conexão MongoDB permanece no backend.

## Requisitos

- Node.js e npm
- .NET SDK 8
- MongoDB local ou MongoDB Atlas

## Executar localmente

Na pasta `FrontEnd`, instale as dependências:

```powershell
npm install
```

Inicie a API em um terminal:

```powershell
npm run dev:api
```

Inicie o frontend em outro terminal:

```powershell
npm run dev
```

Abra `http://localhost:5173`. Durante o desenvolvimento, o Vite encaminha `/api` para `https://localhost:7288`.

## Configuração

A API usa `MONGODB_URI` e opcionalmente `MONGODB_DATABASE`; sem essas variáveis, conecta a `mongodb://127.0.0.1:27017` e usa o banco `vestiario`.

Em produção, defina `VITE_API_URL` com a origem pública da API. Para login Google, configure `VITE_GOOGLE_CLIENT_ID` no frontend e `GOOGLE_CLIENT_ID` na API. A recuperação de senha por e-mail depende de SMTP configurado no backend.

Use `.env.example` como referência. Não coloque credenciais do MongoDB no frontend.
