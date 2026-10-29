import { Router } from "express";
import type { AuthController } from "../controllers/AuthController.js";
import type { DataController } from "../controllers/DataController.js";
import type { RpcController } from "../controllers/RpcController.js";
import type { WorkspaceController } from "../controllers/WorkspaceController.js";

export function createApiRoutes(controllers: { auth: AuthController; data: DataController; rpc: RpcController; workspace: WorkspaceController }) {
  const routes = Router();
  routes.get("/health", (_request, response) => response.json({ status: "ok" }));
  routes.post("/auth", controllers.auth.post);
  routes.post("/auth/google", controllers.auth.google);
  routes.get("/clubs/:clubId", controllers.workspace.getClub);
  routes.get("/workspace", controllers.workspace.get);
  routes.post("/data", controllers.data.post);
  routes.post("/rpc", controllers.rpc.post);
  return routes;
}
