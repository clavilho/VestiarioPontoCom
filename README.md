# VestiarioPontoCom

Sistema de gestão esportiva para clubes, com frontend React e API ASP.NET Core usando MongoDB.

## Estrutura

- `FrontEnd/`: interface React e cliente HTTP que consome a API.
- `backend/VestiarioPontoCom.API/`: API ASP.NET Core, controllers e Swagger.
- `backend/Vestiario.Application/`: contratos e interfaces.
- `backend/Vestiario.Domain/`: regras e conceitos de domínio.
- `backend/Vestiario.Infrastructure/`: persistência e serviços MongoDB.
- `backend/Vestiario.sln`: solução .NET.

## Requisitos

- Node.js e npm
- .NET SDK 8
- MongoDB local ou MongoDB Atlas

## Executar localmente

1. Configure `MONGODB_URI` e, opcionalmente, `MONGODB_DATABASE` no ambiente da API. Sem configuração, a API usa `mongodb://127.0.0.1:27017` e o banco `vestiario`.
2. Em um terminal, na pasta `FrontEnd`, execute `npm install` e depois `npm run dev:api`.
3. Em outro terminal, na pasta `FrontEnd`, execute `npm run dev`.
4. Abra o endereço do Vite, normalmente `http://localhost:5173`.

O Vite encaminha as chamadas `/api` para `https://localhost:7288`. O frontend pode ser publicado no Vercel, definindo `FrontEnd` como Root Directory. Como o backend .NET é uma API separada, publique-o em um host compatível com .NET e configure `VITE_API_URL` com a origem pública da API. No ambiente da API, configure `Cors__AllowedOrigins` com a origem do site Vercel. Nunca coloque a string de conexão do MongoDB no frontend.

Login Google requer `GOOGLE_CLIENT_ID` na API e `VITE_GOOGLE_CLIENT_ID` no frontend. Recuperação de senha por e-mail requer configurar SMTP na API.
