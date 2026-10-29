import { type Document } from "mongodb";
import { randomUUID } from "node:crypto";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import { DomainError } from "../../domain/errors/DomainError.js";

export abstract class ServiceBase {
  constructor(protected readonly repository: DocumentRepository) {}

  protected async findSession(token?: string | null) {
    if (!token) return null;
    const session = await this.repository.findOne("sessions", {
      token,
      expires_at: { $gt: new Date() },
    });
    return session;
  }

  protected async requireUser(token?: string | null) {
    const session = await this.findSession(token);
    if (!session) throw new DomainError("Não autenticado ou sessão expirada.");
    return String(session.user_id);
  }

  protected async getRole(clubId: string, userId: string) {
    const membership = await this.repository.findOne("club_memberships", {
      club_id: clubId,
      user_id: userId,
    });
    return membership ? String(membership.role) : undefined;
  }

  protected async canWrite(clubId: string, userId: string, table: string) {
    const role = await this.getRole(clubId, userId);
    const accepted = ["financial_transactions", "membership_fees"].includes(
      table,
    )
      ? ["owner", "admin", "finance"]
      : ["clubs", "club_memberships"].includes(table)
        ? ["owner", "admin"]
        : ["owner", "admin", "coach"];
    return role !== undefined && accepted.includes(role);
  }
}

export function plain(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(plain);
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const source = value as Document;
    return Object.fromEntries(
      Object.entries(source)
        .filter(([key]) => key !== "_id")
        .map(([key, item]) => [key, plain(item)]),
    );
  }
  return value;
}

export const envelope = (data: unknown) => ({ data, error: null });
export const makeId = () => randomUUID();
export const nowIso = () => new Date().toISOString();
