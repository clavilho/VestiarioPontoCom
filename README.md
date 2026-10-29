# VestiarioPontoCom

Sistema de gestão esportiva para clubes, com frontend React e API Node.js + TypeScript usando MongoDB.

## Estrutura

- `FrontEnd/`: interface React e cliente HTTP que consome a API.
- `BackEnd/`: API Node.js + TypeScript, separada em Domain, Application, Infrastructure e Presentation.
- `backendNet/`: implementação .NET anterior preservada como referência durante a migração.

## Requisitos

- Node.js 20 ou superior
- npm
- MongoDB local ou MongoDB Atlas

## Executar localmente

1. Em `BackEnd`, copie `.env.example` para `.env` e configure `MONGODB_URI` e `MONGODB_DATABASE`.
2. Em um terminal, na pasta `BackEnd`, execute `npm install` e `npm run dev`.
3. Em outro terminal, na pasta `FrontEnd`, execute `npm install` e `npm run dev`.
4. Abra o endereço do Vite, normalmente `http://localhost:5173`.

O Vite encaminha as chamadas `/api` para `http://localhost:3001`. Publique frontend e API como projetos Vercel separados ligados ao mesmo repositório: defina `FrontEnd` como Root Directory do frontend e `BackEnd` como Root Directory da API. Configure `VITE_API_URL` no frontend com a origem pública da API e `CORS_ALLOWED_ORIGINS` na API com a origem do frontend. Nunca coloque a string de conexão do MongoDB no frontend.

Login Google requer `GOOGLE_CLIENT_ID` na API e `VITE_GOOGLE_CLIENT_ID` no frontend. Recuperação de senha por e-mail continua dependendo de SMTP.
