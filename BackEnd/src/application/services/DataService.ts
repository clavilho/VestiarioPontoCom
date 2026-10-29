import type { Document, Filter } from "mongodb";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import { ClubRoles } from "../../domain/ClubRoles.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { ServiceBase, envelope, makeId, nowIso, plain } from "./ServiceBase.js";

const allowedCollections = new Set(["clubs", "club_memberships", "profiles", "players", "staff_members", "events", "attendance", "measurement_types", "player_measurements", "membership_fees", "financial_transactions", "audit_logs", "recurrence_series"]);
type Request = { table?: string; operation?: string; filters?: Record<string, unknown>; values?: unknown; returning?: boolean; single?: boolean; limit?: number; order?: { field: string; ascending: boolean } };

export class DataService extends ServiceBase {
  constructor(repository: DocumentRepository) { super(repository); }

  async execute(request: Request, token?: string) {
    const userId = await this.requireUser(token);
    const table = request.table;
    if (!table || !allowedCollections.has(table)) throw new DomainError("Coleção inválida.");
    const filters = request.filters ?? {};
    if (Object.values(filters).some(value => value !== null && typeof value === "object")) throw new DomainError("Filtro inválido.");
    const memberships = await this.repository.find("club_memberships", { user_id: userId });
    const readRoles = ["audit_logs", "club_memberships"].includes(table) ? ClubRoles.administrators : ["financial_transactions", "membership_fees"].includes(table) ? ClubRoles.finance : ClubRoles.all;
    const clubIds = memberships.filter(item => readRoles.includes(item.role)).map(item => String(item.club_id));
    const filter: Document = { ...filters };
    if (table === "clubs") {
      if (typeof filter.id === "string" && !clubIds.includes(filter.id)) throw new DomainError("Acesso negado.");
      if (!("id" in filter)) filter.id = { $in: clubIds };
    } else if (table === "profiles") filter.id = userId;
    else if (table === "club_memberships") {
      if (typeof filter.club_id === "string" && !clubIds.includes(filter.club_id)) throw new DomainError("Acesso negado.");
      if (!("club_id" in filter)) filter.user_id = userId;
    } else {
      if (typeof filter.club_id === "string") {
        if (!clubIds.includes(filter.club_id)) throw new DomainError("Acesso negado.");
      } else filter.club_id = { $in: clubIds };
    }

    if (request.operation === "insert") return this.insert(table, request, userId);
    if (request.operation === "update") return this.update(table, filter, request, userId);
    if (request.operation === "delete") return this.delete(table, filter, userId);
    const rows = await this.repository.find(table, filter as Filter<Document>, { limit: Math.max(1, Math.min(request.limit ?? 1000, 1000)), ...(request.order ? { sort: { [request.order.field]: request.order.ascending ? 1 : -1 } } : {}) });
    const mapped = rows.map(plain);
    return envelope(request.single ? mapped[0] ?? null : mapped);
  }

  private async insert(table: string, request: Request, userId: string) {
    if (["clubs", "profiles", "club_memberships"].includes(table)) throw new DomainError("Use a operação apropriada para criar esses registros.");
    const values = Array.isArray(request.values) ? request.values : request.values ? [request.values] : [];
    const createdAt = nowIso();
    const documents: Document[] = values.map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new DomainError("Valor inválido.");
      return { ...(value as Document), id: (value as Document).id ?? makeId(), created_at: (value as Document).created_at ?? createdAt, updated_at: createdAt, version: 1 };
    });
    for (const document of documents) if (typeof document.club_id !== "string" || !await this.canWrite(document.club_id, userId, table)) throw new DomainError("Acesso negado.");
    await this.repository.insertMany(table, documents);
    const data = !request.returning ? null : request.single ? plain(documents[0] ?? null) : plain(documents);
    return envelope(data);
  }

  private async update(table: string, filter: Document, request: Request, userId: string) {
    const current = await this.repository.findOne(table, filter as Filter<Document>);
    if (!current) return envelope([]);
    const clubId = current.club_id ?? (table === "clubs" ? current.id : null);
    if (typeof clubId === "string" && !await this.canWrite(clubId, userId, table)) throw new DomainError("Acesso negado.");
    if (table === "profiles" && current.id !== userId) throw new DomainError("Acesso negado.");
    const changes = request.values && typeof request.values === "object" && !Array.isArray(request.values) ? { ...(request.values as Document) } : {};
    delete changes.id; delete changes.club_id; delete changes.version;
    changes.updated_at = nowIso();
    await this.repository.updateOne(table, filter as Filter<Document>, { $set: changes, $inc: { version: 1 } });
    const updated = await this.repository.findOne(table, filter as Filter<Document>);
    const data = request.returning ? request.single ? plain(updated) : updated ? [plain(updated)] : [] : [];
    return envelope(data);
  }

  private async delete(table: string, filter: Document, userId: string) {
    if (["clubs", "profiles"].includes(table)) throw new DomainError("Exclusão não disponível para essa coleção.");
    const current = await this.repository.findOne(table, filter as Filter<Document>);
    if (typeof current?.club_id === "string" && !await this.canWrite(current.club_id, userId, table)) throw new DomainError("Acesso negado.");
    await this.repository.deleteOne(table, filter as Filter<Document>);
    return envelope(null);
  }
}
