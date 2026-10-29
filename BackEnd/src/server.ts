import "dotenv/config";
import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { createContainer } from "./infrastructure/container.js";
import { createApiRoutes } from "./presentation/routes/apiRoutes.js";

const port = Number(process.env.PORT ?? 3001);
const origins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  process.env["Cors__AllowedOrigins"] ??
  "http://localhost:5173,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const container = await createContainer();
const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: origins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.get("/", (_request, response) =>
  response.json({ name: "Vestiario API", status: "ok", docs: "/swagger" }),
);
app.use("/api", createApiRoutes(container.controllers));
app.use(
  "/swagger",
  swaggerUi.serve,
  swaggerUi.setup({
    openapi: "3.0.3",
    info: { title: "Vestiario API", version: "1.0.0" },
    servers: [{ url: "/" }],
    paths: {
      "/api/health": {
        get: {
          summary: "Verifica o estado da API",
          responses: { "200": { description: "API disponível" } },
        },
      },
      "/api/auth": {
        post: {
          summary: "Autenticação e gestão de sessão",
          responses: {
            "200": { description: "Operação concluída" },
            "400": { description: "Erro de autenticação" },
          },
        },
      },
      "/api/auth/google": {
        post: {
          summary: "Autenticação Google",
          responses: { "200": { description: "Login realizado" } },
        },
      },
      "/api/workspace": {
        get: {
          summary: "Obtém clubes e perfil do usuário",
          responses: { "200": { description: "Workspace" } },
        },
      },
      "/api/clubs/{clubId}": {
        get: {
          summary: "Obtém os dados do clube",
          parameters: [
            {
              name: "clubId",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "Dados do clube" } },
        },
      },
      "/api/data": {
        post: {
          summary: "Consulta ou altera dados do clube",
          responses: { "200": { description: "Operação concluída" } },
        },
      },
      "/api/rpc": {
        post: {
          summary: "Executa uma operação de domínio",
          responses: { "200": { description: "Operação concluída" } },
        },
      },
    },
  }),
);

const server = app.listen(port, "0.0.0.0", () =>
  console.log(`Vestiario API ouvindo na porta ${port}`),
);
const stop = async () => {
  server.close();
  await container.repository.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
