import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { ServiceBase, envelope, makeId, nowIso } from "./ServiceBase.js";

type AuthRequest = {
  action?: string;
  email?: string;
  password?: string;
  fullName?: string;
  token?: string;
};

export class AuthService extends ServiceBase {
  constructor(
    repository: DocumentRepository,
    private readonly googleClientId?: string,
  ) {
    super(repository);
  }

  async execute(request: AuthRequest, bearerToken?: string) {
    const action = (request.action ?? "").toLowerCase();
    const email = request.email?.trim().toLowerCase() ?? "";
    if (action === "signup") {
      if (!email || (request.password?.length ?? 0) < 8)
        throw new DomainError(
          "Informe um e-mail e uma senha com pelo menos 8 caracteres.",
        );
      if (await this.repository.exists("users", { email }))
        throw new DomainError("Já existe uma conta com este e-mail.");
      const id = makeId();
      const fullName = request.fullName ?? "";
      const createdAt = nowIso();
      await this.repository.insertOne("users", {
        id,
        email,
        full_name: fullName,
        password_hash: this.hashPassword(request.password!),
        created_at: createdAt,
      });
      await this.repository.insertOne("profiles", {
        id,
        full_name: fullName,
        language: "pt-BR",
        created_at: createdAt,
      });
      const token = await this.createSession(id);
      return envelope({
        user: this.userDto(id, email, fullName),
        session: { access_token: token },
      });
    }
    if (action === "signin") {
      const user = await this.repository.findOne("users", { email });
      if (
        !user ||
        !this.verifyPassword(
          request.password ?? "",
          String(user.password_hash ?? ""),
        )
      )
        throw new DomainError("E-mail ou senha incorretos.");
      const token = await this.createSession(String(user.id));
      return envelope({
        user: this.userDto(
          String(user.id),
          email,
          String(user.full_name ?? ""),
        ),
        session: { access_token: token },
      });
    }

    const token = bearerToken ?? request.token;
    const session = await this.findSession(token);
    const current = session
      ? await this.repository.findOne("users", { id: String(session.user_id) })
      : null;
    if (action === "signout") {
      if (token) await this.repository.deleteOne("sessions", { token });
      return envelope({ user: null, session: null });
    }
    if (action === "reset")
      throw new DomainError(
        "Recuperação por e-mail precisa de SMTP configurado.",
      );
    if (action === "user")
      return envelope({
        user: current
          ? this.userDto(
              String(current.id),
              String(current.email),
              String(current.full_name ?? ""),
            )
          : null,
      });
    if (action === "session")
      return envelope({
        session: current
          ? {
              access_token: token,
              user: { id: String(current.id), email: String(current.email) },
            }
          : null,
      });
    if (action === "updatepassword") {
      if (!current) throw new DomainError("Sessão expirada.");
      if ((request.password?.length ?? 0) < 8)
        throw new DomainError("A senha precisa ter pelo menos 8 caracteres.");
      await this.repository.updateOne(
        "users",
        { id: String(current.id) },
        { $set: { password_hash: this.hashPassword(request.password!) } },
      );
      return envelope({
        user: this.userDto(
          String(current.id),
          String(current.email),
          String(current.full_name ?? ""),
        ),
      });
    }
    throw new DomainError("Ação de autenticação desconhecida.");
  }

  async signInWithGoogle(credential: string) {
    if (!this.googleClientId)
      throw new DomainError(
        "O login Google ainda não foi configurado no backend.",
      );
    if (!credential)
      throw new DomainError("O Google não retornou uma credencial válida.");
    let payload;
    try {
      const ticket = await new OAuth2Client(this.googleClientId).verifyIdToken({
        idToken: credential,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new DomainError(
        "Não foi possível validar sua conta Google. Tente novamente.",
      );
    }
    if (!payload?.email_verified || !payload.email || !payload.sub)
      throw new DomainError("A conta Google precisa ter um e-mail verificado.");
    const email = payload.email.trim().toLowerCase();
    let user = await this.repository.findOne("users", {
      google_subject: payload.sub,
    });
    if (!user) {
      user = await this.repository.findOne("users", { email });
      if (!user) {
        const id = makeId();
        const fullName = payload.name ?? email;
        const createdAt = nowIso();
        user = {
          id,
          email,
          full_name: fullName,
          google_subject: payload.sub,
          created_at: createdAt,
        };
        await this.repository.insertOne("users", user);
        await this.repository.insertOne("profiles", {
          id,
          full_name: fullName,
          language: "pt-BR",
          created_at: createdAt,
        });
      } else {
        if (user.google_subject && user.google_subject !== payload.sub)
          throw new DomainError(
            "Este e-mail já está associado a outra conta Google.",
          );
        await this.repository.updateOne(
          "users",
          { id: user.id },
          { $set: { google_subject: payload.sub } },
        );
        user.google_subject = payload.sub;
      }
    }
    const token = await this.createSession(String(user.id));
    return envelope({
      user: this.userDto(
        String(user.id),
        String(user.email),
        String(user.full_name ?? ""),
      ),
      session: { access_token: token },
    });
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString("base64url");
    await this.repository.insertOne("sessions", {
      token,
      user_id: userId,
      expires_at: new Date(Date.now() + 30 * 86400_000),
    });
    return token;
  }

  private userDto(id: string, email: string, fullName: string) {
    return { id, email, user_metadata: { full_name: fullName } };
  }
  private hashPassword(password: string) {
    const salt = randomBytes(16);
    const hash = pbkdf2Sync(password, salt, 150_000, 32, "sha256");
    return `${salt.toString("base64")}.${hash.toString("base64")}`;
  }
  private verifyPassword(password: string, stored: string) {
    try {
      const [saltText, hashText] = stored.split(".");
      if (!saltText || !hashText) return false;
      const expected = Buffer.from(hashText, "base64");
      const actual = pbkdf2Sync(
        password,
        Buffer.from(saltText, "base64"),
        150_000,
        32,
        "sha256",
      );
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    } catch {
      return false;
    }
  }
}
