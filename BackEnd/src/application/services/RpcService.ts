import type { Document, Filter } from "mongodb";
import type { DocumentRepository } from "../ports/DocumentRepository.js";
import { ClubRoles, includesRole } from "../../domain/ClubRoles.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { ServiceBase, envelope, makeId, nowIso } from "./ServiceBase.js";

type RpcRequest = { name: string; args?: Record<string, unknown> };
const text = (args: Record<string, unknown>, key: string, fallback = "") =>
  args[key] == null ? fallback : String(args[key]);
const number = (args: Record<string, unknown>, key: string) =>
  Number(args[key] ?? 0);

export class RpcService extends ServiceBase {
  constructor(repository: DocumentRepository) {
    super(repository);
  }

  async execute(request: RpcRequest, token?: string) {
    const userId = await this.requireUser(token);
    const args = request.args ?? {};
    const name = request.name;
    let clubId = text(args, "_club");
    if (name === "create_club")
      return envelope(
        await this.createClub(text(args, "_name", "Meu clube"), userId),
      );
    if (
      ["restore_event", "delete_series_scope", "update_series_scope"].includes(
        name,
      )
    ) {
      const event = await this.repository.findOne("events", {
        id: text(args, "_event"),
      });
      clubId = String(event?.club_id ?? clubId);
    }
    if (name === "pay_fee") {
      const fee = await this.repository.findOne("membership_fees", {
        id: text(args, "_fee"),
      });
      clubId = String(fee?.club_id ?? clubId);
    }
    const role = await this.getRole(clubId, userId);
    if (!role) throw new DomainError("Acesso negado.");
    if (
      [
        "save_cash_entry",
        "set_cash_paid",
        "pay_fee",
        "generate_monthly_fees",
      ].includes(name) &&
      !includesRole(role, ClubRoles.finance)
    )
      throw new DomainError("Acesso negado.");
    if (
      [
        "generate_series_events",
        "update_series_scope",
        "delete_series_scope",
        "restore_event",
      ].includes(name) &&
      !includesRole(role, ClubRoles.sports)
    )
      throw new DomainError("Acesso negado.");
    switch (name) {
      case "is_club_member":
        return envelope(true);
      case "save_cash_entry":
        return envelope(await this.saveCashEntry(clubId, userId, args));
      case "set_cash_paid":
        return envelope(await this.setCashPaid(clubId, args));
      case "pay_fee":
        return envelope(await this.payFee(clubId, userId, args));
      case "generate_monthly_fees":
        return envelope(
          await this.generateFees(clubId, text(args, "_competence")),
        );
      case "generate_series_events":
        return envelope(
          await this.generateSeries(clubId, text(args, "_series")),
        );
      case "restore_event":
        return envelope(
          await this.updateEvent(
            clubId,
            text(args, "_event"),
            true,
            text(args, "_reason"),
          ),
        );
      case "delete_series_scope":
        return envelope(
          await this.updateEvent(
            clubId,
            text(args, "_event"),
            false,
            text(args, "_reason"),
          ),
        );
      case "update_series_scope":
        return envelope(await this.updateSeriesScope(clubId, args));
      case "add_member_by_email":
        return envelope(
          await this.addMember(
            clubId,
            role,
            text(args, "_email"),
            text(args, "_role"),
          ),
        );
      default:
        throw new DomainError(`Operação não suportada: ${name}`);
    }
  }

  private async createClub(name: string, userId: string) {
    const id = makeId();
    const now = nowIso();
    await this.repository.insertOne("clubs", {
      id,
      name,
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      default_monthly_fee: 0,
      fee_due_day: 10,
      created_at: now,
      updated_at: now,
      version: 1,
    });
    await this.repository.insertOne("club_memberships", {
      id: makeId(),
      club_id: id,
      user_id: userId,
      role: "owner",
      created_at: now,
    });
    return id;
  }

  private async saveCashEntry(
    clubId: string,
    userId: string,
    args: Record<string, unknown>,
  ) {
    const description = text(args, "_description");
    const amount = number(args, "_amount");
    if (!description.trim() || amount <= 0)
      throw new DomainError("Descrição e valor positivo são obrigatórios.");
    const now = nowIso();
    await this.repository.insertOne("financial_transactions", {
      id: makeId(),
      club_id: clubId,
      description,
      kind: text(args, "_kind"),
      category: text(args, "_category"),
      amount,
      due_date: text(args, "_date"),
      status: text(args, "_status"),
      method: text(args, "_method"),
      created_by: userId,
      created_at: now,
      updated_at: now,
      version: 1,
    });
    return true;
  }

  private async setCashPaid(clubId: string, args: Record<string, unknown>) {
    const now = new Date();
    const result = await this.repository.updateOne(
      "financial_transactions",
      {
        id: text(args, "_id"),
        club_id: clubId,
        version: Math.trunc(number(args, "_version")),
        status: "pending",
        fee_id: { $exists: false },
      },
      {
        $set: {
          status: "paid",
          paid_at: now.toISOString().slice(0, 10),
          updated_at: now.toISOString(),
        },
        $inc: { version: 1 },
      },
    );
    return result.modifiedCount === 1;
  }

  private async updateEvent(
    clubId: string,
    id: string,
    restore: boolean,
    reason: string,
  ) {
    const update = restore
      ? {
          $set: { deleted_at: null, delete_reason: null },
          $inc: { version: 1 },
        }
      : {
          $set: { deleted_at: nowIso(), delete_reason: reason },
          $inc: { version: 1 },
        };
    await this.repository.updateOne("events", { id, club_id: clubId }, update);
    return true;
  }

  private async updateSeriesScope(
    clubId: string,
    args: Record<string, unknown>,
  ) {
    await this.repository.updateOne(
      "events",
      { id: text(args, "_event"), club_id: clubId },
      {
        $set: {
          title: text(args, "_title"),
          location: text(args, "_location"),
          type: text(args, "_type"),
        },
        $inc: { version: 1 },
      },
    );
    return true;
  }

  private async addMember(
    clubId: string,
    role: string,
    email: string,
    newRole: string,
  ) {
    if (!includesRole(role, ClubRoles.administrators))
      throw new DomainError("Acesso negado.");
    if (!ClubRoles.all.includes(newRole as never) || newRole === "owner")
      throw new DomainError("Papel de membro inválido.");
    const user = await this.repository.findOne("users", {
      email: email.trim().toLowerCase(),
    });
    if (!user) throw new DomainError("Este e-mail ainda não tem uma conta.");
    await this.repository.replaceOne(
      "club_memberships",
      { club_id: clubId, user_id: user.id },
      {
        id: makeId(),
        club_id: clubId,
        user_id: user.id,
        role: newRole,
        created_at: nowIso(),
      },
      true,
    );
    return true;
  }

  private async generateFees(clubId: string, competence: string) {
    const date = new Date(competence);
    if (!competence || Number.isNaN(date.getTime()))
      throw new DomainError("Competência inválida.");
    const month = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
    )
      .toISOString()
      .slice(0, 10);
    const club = await this.repository.findOne("clubs", { id: clubId });
    const players = await this.repository.find("players", {
      club_id: clubId,
      active: true,
    });
    let inserted = 0;
    for (const player of players) {
      const joined = player.joined_at
        ? new Date(String(player.joined_at))
        : new Date(0);
      const monthEnd = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
      );
      if (joined > monthEnd) continue;
      const baseAmount = Number(player.monthly_fee ?? 0);
      const scholarship = String(player.scholarship ?? "none");
      const discount =
        scholarship === "full"
          ? baseAmount
          : scholarship === "partial"
            ? Math.round(baseAmount * Number(player.discount_percent ?? 0)) /
              100
            : 0;
      const dueDay = Math.max(1, Math.min(Number(club?.fee_due_day ?? 10), 28));
      const dueDate = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), dueDay),
      )
        .toISOString()
        .slice(0, 10);
      const update = {
        $setOnInsert: {
          id: makeId(),
          club_id: clubId,
          player_id: player.id,
          competence: month,
          base_amount: baseAmount,
          discount_amount: discount,
          amount: Math.max(0, baseAmount - discount),
          paid_amount: 0,
          due_date: dueDate,
          status: scholarship === "full" ? "exempt" : "open",
          scholarship,
          version: 1,
          created_at: nowIso(),
        },
      };
      const result = await this.repository.updateOne(
        "membership_fees",
        { club_id: clubId, player_id: player.id, competence: month },
        update,
        true,
      );
      if (result.upsertedId) inserted++;
    }
    return inserted;
  }

  private async generateSeries(clubId: string, seriesId: string) {
    const series = await this.repository.findOne("recurrence_series", {
      id: seriesId,
      club_id: clubId,
    });
    if (!series) throw new DomainError("Série não encontrada.");
    const start = new Date(String(series.start_date ?? ""));
    if (Number.isNaN(start.getTime())) return 0;
    const end = series.end_date ? new Date(String(series.end_date)) : start;
    const weekdays = new Set(
      Array.isArray(series.weekdays) ? series.weekdays.map(Number) : [],
    );
    let created = 0;
    for (
      let day = new Date(start);
      day <= end;
      day.setUTCDate(day.getUTCDate() + 1)
    ) {
      const weekday = day.getUTCDay() || 7;
      if (!weekdays.has(weekday)) continue;
      const date = day.toISOString().slice(0, 10);
      const startTime = String(series.start_time ?? "18:00");
      const endTime = String(series.end_time ?? "19:30");
      const startsAt = new Date(`${date}T${startTime}:00Z`).toISOString();
      if (
        await this.repository.exists("events", {
          series_id: seriesId,
          starts_at: startsAt,
        })
      )
        continue;
      await this.repository.insertOne("events", {
        id: makeId(),
        club_id: clubId,
        series_id: seriesId,
        title: series.title ?? "",
        type: series.type ?? "training",
        location: series.location ?? "",
        category: series.category ?? "",
        description: series.description ?? "",
        starts_at: startsAt,
        ends_at: new Date(`${date}T${endTime}:00Z`).toISOString(),
        status: "scheduled",
        attendance_closed: false,
        version: 1,
        created_at: nowIso(),
      });
      created++;
    }
    return created;
  }

  private async payFee(
    clubId: string,
    userId: string,
    args: Record<string, unknown>,
  ) {
    const fee = await this.repository.findOne("membership_fees", {
      id: text(args, "_fee"),
      club_id: clubId,
    });
    if (!fee || ["paid", "exempt", "cancelled"].includes(String(fee.status)))
      throw new DomainError("Mensalidade não pode ser paga.");
    const amount = number(args, "_amount");
    const paid = Number(fee.paid_amount ?? 0);
    const total = Number(fee.amount ?? 0);
    if (amount <= 0 || paid + amount > total)
      throw new DomainError("Valor inválido.");
    const idempotencyKey = text(args, "_idem");
    if (
      await this.repository.exists("financial_transactions", {
        club_id: clubId,
        idempotency_key: idempotencyKey,
      })
    )
      return true;
    const nextPaid = paid + amount;
    const now = nowIso();
    const result = await this.repository.updateOne(
      "membership_fees",
      {
        id: fee.id,
        version: fee.version ?? 1,
        paid_amount: paid,
        status: fee.status,
      },
      {
        $set: {
          paid_amount: nextPaid,
          status: nextPaid >= total ? "paid" : "partial",
          updated_at: now,
        },
        $inc: { version: 1 },
      },
    );
    if (!result.modifiedCount)
      throw new DomainError(
        "Mensalidade alterada por outra operação. Atualize a tela e tente novamente.",
      );
    try {
      const player = await this.repository.findOne("players", {
        id: fee.player_id,
      });
      const competence = String(fee.competence ?? "");
      await this.repository.insertOne("financial_transactions", {
        id: makeId(),
        club_id: clubId,
        description: `Mensalidade ${competence.slice(5, 7)}/${competence.slice(0, 4)} — ${player?.name ?? ""}`,
        kind: "income",
        category: "Mensalidades",
        amount,
        due_date: fee.due_date ?? "",
        paid_at: now.slice(0, 10),
        status: "paid",
        method: text(args, "_method"),
        fee_id: fee.id,
        idempotency_key: idempotencyKey,
        created_by: userId,
        created_at: now,
        version: 1,
      });
    } catch (error) {
      await this.repository.updateOne(
        "membership_fees",
        { id: fee.id, version: Number(fee.version ?? 1) + 1 },
        {
          $set: { paid_amount: paid, status: fee.status },
          $inc: { version: 1 },
        },
      );
      throw error;
    }
    return true;
  }
}
