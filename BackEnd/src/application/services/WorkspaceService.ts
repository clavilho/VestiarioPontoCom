import type { DocumentRepository } from "../ports/DocumentRepository.js";
import { ClubRoles, includesRole } from "../../domain/ClubRoles.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { ServiceBase, plain } from "./ServiceBase.js";

export class WorkspaceService extends ServiceBase {
  constructor(repository: DocumentRepository) {
    super(repository);
  }

  async getWorkspace(token?: string) {
    const userId = await this.requireUser(token);
    const memberships = await this.repository.find("club_memberships", {
      user_id: userId,
    });
    const ids = memberships.map((item) => item.club_id);
    const clubs = ids.length
      ? await this.repository.find(
          "clubs",
          { id: { $in: ids } },
          { sort: { created_at: 1 } },
        )
      : [];
    const profile = await this.repository.findOne("profiles", { id: userId });
    return {
      clubs: plain(clubs),
      memberships: plain(memberships),
      profile: plain(profile),
    };
  }

  async getClub(clubId: string, token?: string) {
    const userId = await this.requireUser(token);
    const role = await this.getRole(clubId, userId);
    if (!role) throw new DomainError("Acesso negado.");
    const restricted: Record<string, readonly string[]> = {
      membership_fees: ClubRoles.finance,
      financial_transactions: ClubRoles.finance,
      audit_logs: ClubRoles.administrators,
      club_memberships: ClubRoles.administrators,
    };
    const tables = [
      "players",
      "staff_members",
      "events",
      "attendance",
      "measurement_types",
      "player_measurements",
      "membership_fees",
      "financial_transactions",
      "audit_logs",
      "club_memberships",
    ];
    const entries = await Promise.all(
      tables.map(async (table) => {
        if (restricted[table] && !includesRole(role, restricted[table]))
          return [table, []] as const;
        const limit = [
          "events",
          "membership_fees",
          "financial_transactions",
          "audit_logs",
        ].includes(table)
          ? table === "audit_logs"
            ? 100
            : 1000
          : undefined;
        const documents = await this.repository.find(
          table,
          { club_id: clubId },
          limit ? { limit } : {},
        );
        return [table, plain(documents)] as const;
      }),
    );
    const rows = Object.fromEntries(entries);
    return {
      players: rows.players,
      staff: rows.staff_members,
      events: rows.events,
      attendance: rows.attendance,
      metrics: rows.measurement_types,
      measurements: rows.player_measurements,
      fees: rows.membership_fees,
      transactions: rows.financial_transactions,
      audit: rows.audit_logs,
      members: rows.club_memberships,
    };
  }
}
