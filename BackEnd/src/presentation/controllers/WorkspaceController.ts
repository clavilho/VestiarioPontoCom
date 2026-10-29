import type { Request, Response } from "express";
import type { WorkspaceService } from "../../application/services/WorkspaceService.js";
import { DomainError } from "../../domain/errors/DomainError.js";

export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}
  get = async (request: Request, response: Response) => {
    try {
      const auth = request.header("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ")
        ? auth.slice(7)
        : undefined;
      response.json(await this.service.getWorkspace(token));
    } catch (error) {
      response
        .status(400)
        .json({
          data: null,
          error: {
            message:
              error instanceof DomainError
                ? error.message
                : "Falha ao processar a solicitação.",
          },
        });
    }
  };

  getClub = async (request: Request, response: Response) => {
    try {
      const auth = request.header("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ")
        ? auth.slice(7)
        : undefined;
      response.json(
        await this.service.getClub(String(request.params.clubId), token),
      );
    } catch (error) {
      response
        .status(400)
        .json({
          data: null,
          error: {
            message:
              error instanceof DomainError
                ? error.message
                : "Falha ao processar a solicitação.",
          },
        });
    }
  };
}
