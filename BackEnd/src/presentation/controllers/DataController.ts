import type { Request, Response } from "express";
import type { DataService } from "../../application/services/DataService.js";
import { DomainError } from "../../domain/errors/DomainError.js";

export class DataController {
  constructor(private readonly service: DataService) {}
  post = async (request: Request, response: Response) => {
    try {
      const auth = request.header("authorization") ?? "";
      const token = auth.toLowerCase().startsWith("bearer ")
        ? auth.slice(7)
        : undefined;
      response.json(await this.service.execute(request.body ?? {}, token));
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
