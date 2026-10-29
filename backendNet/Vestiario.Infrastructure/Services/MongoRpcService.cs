using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Driver;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using Vestiario.Domain;
using Vestiario.Infrastructure.Mongo;

namespace Vestiario.Infrastructure.Services;

public sealed class MongoRpcService(MongoContext context) : MongoService(context), IRpcService
{
    public async Task<object?> ExecuteAsync(RpcRequest request, string? bearerToken)
    {
        var userId = await RequireUser(bearerToken);
        var args = request.Args;
        string Arg(string key, string fallback = "") => args.TryGetProperty(key, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : fallback;
        double Num(string key) => args.TryGetProperty(key, out var value) && value.TryGetDouble(out var number) ? number : 0;
        var name = request.Name;
        var clubId = Arg("_club");
        var events = Collection("events");
        var fees = Collection("membership_fees");

        if (name == "create_club") return Envelope(await CreateClub(Arg("_name", "Meu clube"), userId));
        if (name is "restore_event" or "delete_series_scope" or "update_series_scope")
        {
            var eventDocument = await events.Find(Builders<BsonDocument>.Filter.Eq("id", Arg("_event"))).FirstOrDefaultAsync();
            clubId = eventDocument?.GetValue("club_id", "").AsString ?? clubId;
        }
        if (name == "pay_fee")
        {
            var feeDocument = await fees.Find(Builders<BsonDocument>.Filter.Eq("id", Arg("_fee"))).FirstOrDefaultAsync();
            clubId = feeDocument?.GetValue("club_id", "").AsString ?? clubId;
        }

        var role = await GetRole(clubId, userId);
        if (role is null) throw new DomainException("Acesso negado.");
        if (name is "save_cash_entry" or "set_cash_paid" or "pay_fee" or "generate_monthly_fees")
            if (!HasRole(role, ClubRoles.Finance)) throw new DomainException("Acesso negado.");
        if (name is "generate_series_events" or "update_series_scope" or "delete_series_scope" or "restore_event")
            if (!HasRole(role, ClubRoles.Sports)) throw new DomainException("Acesso negado.");
        if (name == "is_club_member") return Envelope(true);
        if (name == "save_cash_entry") return Envelope(await SaveCashEntry(clubId, userId, (key, fallback) => Arg(key, fallback), Num));
        if (name == "set_cash_paid") return Envelope(await SetCashPaid(clubId, (key, fallback) => Arg(key, fallback), Num));
        if (name == "pay_fee") return Envelope(await PayFee(clubId, userId, args));
        if (name == "generate_monthly_fees") return Envelope(await GenerateFees(clubId, Arg("_competence")));
        if (name == "generate_series_events") return Envelope(await GenerateSeries(clubId, Arg("_series")));
        if (name == "restore_event") return Envelope(await UpdateEvent(events, clubId, Arg("_event"), restore: true, reason: Arg("_reason")));
        if (name == "delete_series_scope") return Envelope(await UpdateEvent(events, clubId, Arg("_event"), restore: false, reason: Arg("_reason")));
        if (name == "update_series_scope") return Envelope(await UpdateSeriesScope(events, clubId, Arg));
        if (name == "add_member_by_email") return Envelope(await AddMember(clubId, role, Arg("_email"), Arg("_role")));
        throw new DomainException($"Operação não suportada: {name}");
    }

    private async Task<string> CreateClub(string name, string userId)
    {
        var id = Guid.NewGuid().ToString(); var now = DateTime.UtcNow.ToString("O");
        await Collection("clubs").InsertOneAsync(new BsonDocument { ["id"] = id, ["name"] = name, ["currency"] = "BRL", ["timezone"] = "America/Sao_Paulo", ["default_monthly_fee"] = 0, ["fee_due_day"] = 10, ["created_at"] = now, ["updated_at"] = now, ["version"] = 1 });
        await Collection("club_memberships").InsertOneAsync(new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = id, ["user_id"] = userId, ["role"] = "owner", ["created_at"] = now });
        return id;
    }

    private async Task<bool> SaveCashEntry(string clubId, string userId, Func<string, string, string> arg, Func<string, double> num)
    {
        var description = arg("_description", ""); var amount = num("_amount");
        if (string.IsNullOrWhiteSpace(description) || amount <= 0) throw new DomainException("Descrição e valor positivo são obrigatórios.");
        var now = DateTime.UtcNow.ToString("O");
        await Collection("financial_transactions").InsertOneAsync(new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = clubId, ["description"] = description, ["kind"] = arg("_kind", ""), ["category"] = arg("_category", ""), ["amount"] = amount, ["due_date"] = arg("_date", ""), ["status"] = arg("_status", ""), ["method"] = arg("_method", ""), ["created_by"] = userId, ["created_at"] = now, ["updated_at"] = now, ["version"] = 1 });
        return true;
    }

    private async Task<bool> SetCashPaid(string clubId, Func<string, string, string> arg, Func<string, double> num)
    {
        var filter = new BsonDocument { ["id"] = arg("_id", ""), ["club_id"] = clubId, ["version"] = (int)num("_version"), ["status"] = "pending", ["fee_id"] = new BsonDocument("$exists", false) };
        var update = Builders<BsonDocument>.Update.Set("status", "paid").Set("paid_at", DateTime.UtcNow.ToString("yyyy-MM-dd")).Set("updated_at", DateTime.UtcNow.ToString("O")).Inc("version", 1);
        return (await Collection("financial_transactions").UpdateOneAsync(filter, update)).ModifiedCount == 1;
    }

    private async Task<bool> UpdateEvent(IMongoCollection<BsonDocument> events, string clubId, string id, bool restore, string reason)
    {
        var update = restore
            ? Builders<BsonDocument>.Update.Set("deleted_at", BsonNull.Value).Set("delete_reason", BsonNull.Value).Inc("version", 1)
            : Builders<BsonDocument>.Update.Set("deleted_at", DateTime.UtcNow.ToString("O")).Set("delete_reason", reason).Inc("version", 1);
        await events.UpdateOneAsync(new BsonDocument { ["id"] = id, ["club_id"] = clubId }, update);
        return true;
    }

    private async Task<bool> UpdateSeriesScope(IMongoCollection<BsonDocument> events, string clubId, Func<string, string, string> arg)
    {
        var update = Builders<BsonDocument>.Update.Set("title", arg("_title", "")).Set("location", arg("_location", "")).Set("type", arg("_type", "")).Inc("version", 1);
        await events.UpdateOneAsync(new BsonDocument { ["id"] = arg("_event", ""), ["club_id"] = clubId }, update);
        return true;
    }

    private async Task<bool> AddMember(string clubId, string? role, string email, string newRole)
    {
        if (!HasRole(role ?? "", ClubRoles.Administrators)) throw new DomainException("Acesso negado.");
        if (!ClubRoles.All.Contains(newRole) || newRole == "owner") throw new DomainException("Papel de membro inválido.");
        var user = await Collection("users").Find(Builders<BsonDocument>.Filter.Eq("email", email.Trim().ToLowerInvariant())).FirstOrDefaultAsync();
        if (user is null) throw new DomainException("Este e-mail ainda não tem uma conta.");
        var membership = Collection("club_memberships");
        await membership.ReplaceOneAsync(new BsonDocument { ["club_id"] = clubId, ["user_id"] = user["id"].AsString }, new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = clubId, ["user_id"] = user["id"], ["role"] = newRole, ["created_at"] = DateTime.UtcNow.ToString("O") }, new ReplaceOptions { IsUpsert = true });
        return true;
    }

    private async Task<int> GenerateFees(string clubId, string competence)
    {
        if (!DateTime.TryParse(competence, out var date)) throw new DomainException("Competência inválida.");
        var month = new DateTime(date.Year, date.Month, 1).ToString("yyyy-MM-dd");
        var club = await Collection("clubs").Find(Builders<BsonDocument>.Filter.Eq("id", clubId)).FirstOrDefaultAsync();
        var players = await Collection("players").Find(Builders<BsonDocument>.Filter.Eq("club_id", clubId) & Builders<BsonDocument>.Filter.Eq("active", true)).ToListAsync();
        var inserted = 0;
        foreach (var player in players)
        {
            var joined = DateTime.TryParse(player.GetValue("joined_at", "").ToString(), out var joinedAt) ? joinedAt : DateTime.MinValue;
            if (joined > date.AddMonths(1).AddDays(-1)) continue;
            var baseAmount = player.GetValue("monthly_fee", 0).ToDouble();
            var scholarship = player.GetValue("scholarship", "none").AsString;
            var discount = scholarship == "full" ? baseAmount : scholarship == "partial" ? Math.Round(baseAmount * player.GetValue("discount_percent", 0).ToDouble() / 100, 2) : 0;
            var dueDay = Math.Clamp(club?.GetValue("fee_due_day", 10).ToInt32() ?? 10, 1, 28);
            var due = new DateTime(date.Year, date.Month, dueDay).ToString("yyyy-MM-dd");
            var filter = new BsonDocument { ["club_id"] = clubId, ["player_id"] = player["id"], ["competence"] = month };
            var update = new BsonDocument("$setOnInsert", new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = clubId, ["player_id"] = player["id"], ["competence"] = month, ["base_amount"] = baseAmount, ["discount_amount"] = discount, ["amount"] = Math.Max(0, baseAmount - discount), ["paid_amount"] = 0, ["due_date"] = due, ["status"] = scholarship == "full" ? "exempt" : "open", ["scholarship"] = scholarship, ["version"] = 1, ["created_at"] = DateTime.UtcNow.ToString("O") });
            var result = await Collection("membership_fees").UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            if (result.UpsertedId is not null) inserted++;
        }
        return inserted;
    }

    private async Task<int> GenerateSeries(string clubId, string seriesId)
    {
        var series = await Collection("recurrence_series").Find(new BsonDocument { ["id"] = seriesId, ["club_id"] = clubId }).FirstOrDefaultAsync();
        if (series is null) throw new DomainException("Série não encontrada.");
        if (!DateTime.TryParse(series.GetValue("start_date", "").ToString(), out var start)) return 0;
        var end = DateTime.TryParse(series.GetValue("end_date", "").ToString(), out var parsedEnd) ? parsedEnd : start;
        var weekdays = series.GetValue("weekdays", new BsonArray()).AsBsonArray.Select(x => x.ToInt32()).ToHashSet();
        var created = 0;
        for (var day = start.Date; day <= end.Date; day = day.AddDays(1))
        {
            var weekday = (int)day.DayOfWeek; weekday = weekday == 0 ? 7 : weekday;
            if (!weekdays.Contains(weekday)) continue;
            var starts = DateTime.Parse($"{day:yyyy-MM-dd}T{series.GetValue("start_time", "18:00")}").ToUniversalTime().ToString("O");
            if (await Collection("events").Find(new BsonDocument { ["series_id"] = seriesId, ["starts_at"] = starts }).AnyAsync()) continue;
            await Collection("events").InsertOneAsync(new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = clubId, ["series_id"] = seriesId, ["title"] = series.GetValue("title", ""), ["type"] = series.GetValue("type", "training"), ["location"] = series.GetValue("location", ""), ["category"] = series.GetValue("category", ""), ["description"] = series.GetValue("description", ""), ["starts_at"] = starts, ["ends_at"] = DateTime.Parse($"{day:yyyy-MM-dd}T{series.GetValue("end_time", "19:30")}").ToUniversalTime().ToString("O"), ["status"] = "scheduled", ["attendance_closed"] = false, ["version"] = 1, ["created_at"] = DateTime.UtcNow.ToString("O") });
            created++;
        }
        return created;
    }

    private async Task<bool> PayFee(string clubId, string userId, JsonElement args)
    {
        string Arg(string key) => args.TryGetProperty(key, out var value) ? value.ToString() : "";
        var fee = await Collection("membership_fees").Find(new BsonDocument { ["id"] = Arg("_fee"), ["club_id"] = clubId }).FirstOrDefaultAsync();
        if (fee is null || fee.GetValue("status", "").AsString is "paid" or "exempt" or "cancelled") throw new DomainException("Mensalidade não pode ser paga.");
        var amount = args.GetProperty("_amount").GetDouble(); var paid = fee.GetValue("paid_amount", 0).ToDouble(); var total = fee.GetValue("amount", 0).ToDouble();
        if (amount <= 0 || paid + amount > total) throw new DomainException("Valor inválido.");
        var transactions = Collection("financial_transactions"); var idempotencyKey = Arg("_idem");
        if (await transactions.Find(new BsonDocument { ["club_id"] = clubId, ["idempotency_key"] = idempotencyKey }).AnyAsync()) return true;
        var newPaid = paid + amount; var now = DateTime.UtcNow.ToString("O");
        var updateResult = await Collection("membership_fees").UpdateOneAsync(new BsonDocument { ["id"] = fee["id"], ["version"] = fee.GetValue("version", 1), ["paid_amount"] = paid, ["status"] = fee["status"] }, Builders<BsonDocument>.Update.Set("paid_amount", newPaid).Set("status", newPaid >= total ? "paid" : "partial").Set("updated_at", now).Inc("version", 1));
        if (updateResult.ModifiedCount != 1) throw new DomainException("Mensalidade alterada por outra operação. Atualize a tela e tente novamente.");
        try
        {
            var player = await Collection("players").Find(Builders<BsonDocument>.Filter.Eq("id", fee["player_id"])).FirstOrDefaultAsync();
            var competence = fee.GetValue("competence", "").AsString;
            await transactions.InsertOneAsync(new BsonDocument { ["id"] = Guid.NewGuid().ToString(), ["club_id"] = clubId, ["description"] = $"Mensalidade {competence[5..7]}/{competence[..4]} — {(player is null ? "" : player.GetValue("name", "").ToString())}", ["kind"] = "income", ["category"] = "Mensalidades", ["amount"] = amount, ["due_date"] = fee.GetValue("due_date", ""), ["paid_at"] = now[..10], ["status"] = "paid", ["method"] = Arg("_method"), ["fee_id"] = fee["id"], ["idempotency_key"] = idempotencyKey, ["created_by"] = userId, ["created_at"] = now, ["version"] = 1 });
        }
        catch
        {
            await Collection("membership_fees").UpdateOneAsync(new BsonDocument { ["id"] = fee["id"], ["version"] = fee.GetValue("version", 1).ToInt32() + 1 }, Builders<BsonDocument>.Update.Set("paid_amount", paid).Set("status", fee["status"]).Inc("version", 1));
            throw;
        }
        return true;
    }

    private static object Envelope(object? data) => new { data, error = (object?)null };
}
