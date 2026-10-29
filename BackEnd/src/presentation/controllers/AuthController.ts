import type { Request, Response } from "express";
import type { AuthService } from "../../application/services/AuthService.js";
import { DomainError } from "../../domain/errors/DomainError.js";

export class AuthController {
  constructor(private readonly service: AuthService) {}

  post = async (request: Request, response: Response) => {
    try {
      const authorization = request.header("authorization") ?? "";
      const bearer = authorization.toLowerCase().startsWith("bearer ")
        ? authorization.slice(7)
        : undefined;
      response.json(await this.service.execute(request.body ?? {}, bearer));
    } catch (error) {
      this.handleError(response, error);
    }
  };

  google = async (request: Request, response: Response) => {
    try {
      response.json(
        await this.service.signInWithGoogle(
          String(request.body?.credential ?? ""),
        ),
      );
    } catch (error) {
      this.handleError(response, error);
    }
  };

  private handleError(response: Response, error: unknown) {
    const message =
      error instanceof DomainError
        ? error.message
        : "Falha ao processar a solicitação.";
    response.status(400).json({ data: null, error: { message } });
  }
}
