import { AuthService } from "../application/services/AuthService.js";
import { DataService } from "../application/services/DataService.js";
import { RpcService } from "../application/services/RpcService.js";
import { WorkspaceService } from "../application/services/WorkspaceService.js";
import { MongoDocumentRepository } from "./mongo/MongoDocumentRepository.js";
import { AuthController } from "../presentation/controllers/AuthController.js";
import { DataController } from "../presentation/controllers/DataController.js";
import { RpcController } from "../presentation/controllers/RpcController.js";
import { WorkspaceController } from "../presentation/controllers/WorkspaceController.js";

export async function createContainer() {
  const repository = new MongoDocumentRepository(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017", process.env.MONGODB_DATABASE ?? "vestiario");
  await repository.connect();
  const auth = new AuthService(repository, process.env.GOOGLE_CLIENT_ID);
  const data = new DataService(repository);
  const rpc = new RpcService(repository);
  const workspace = new WorkspaceService(repository);
  return {
    repository,
    controllers: {
      auth: new AuthController(auth),
      data: new DataController(data),
      rpc: new RpcController(rpc),
      workspace: new WorkspaceController(workspace),
    },
  };
}
