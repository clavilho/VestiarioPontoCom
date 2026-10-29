using MongoDB.Bson;
using MongoDB.Driver;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using Vestiario.Domain;
using Vestiario.Infrastructure.Mongo;

namespace Vestiario.Infrastructure.Services;

public sealed class MongoDataService(MongoContext context) : MongoService(context), IDataService
{
    private static readonly HashSet<string> AllowedCollections = ["clubs", "club_memberships", "profiles", "players", "staff_members", "events", "attendance", "measurement_types", "player_measurements", "membership_fees", "financial_transactions", "audit_logs", "recurrence_series"];

    public async Task<object?> ExecuteAsync(DataRequest request, string? bearerToken)
    {
        var userId = await RequireUser(bearerToken);
        if (request.Table is null || !AllowedCollections.Contains(request.Table)) throw new DomainException("Coleção inválida.");
        var table = request.Table;
        var filter = BsonMapping.Filter(request.Filters);
        var memberships = await Collection("club_memberships").Find(Builders<BsonDocument>.Filter.Eq("user_id", userId)).ToListAsync();
        var readableRoles = table switch
        {
            "audit_logs" or "club_memberships" => ClubRoles.Administrators,
            "financial_transactions" or "membership_fees" => ClubRoles.Finance,
            _ => ClubRoles.All
        };
        var clubIds = memberships.Where(x => readableRoles.Contains(x.GetValue("role", "").AsString)).Select(x => x.GetValue("club_id", "").AsString).ToArray();

        if (table == "clubs")
        {
            if (filter.TryGetValue("id", out var requestedClub) && requestedClub.IsString && !clubIds.Contains(requestedClub.AsString)) throw new DomainException("Acesso negado.");
            if (!filter.Contains("id")) filter["id"] = new BsonDocument("$in", new BsonArray(clubIds));
        }
        else if (table == "profiles") filter["id"] = userId;
        else if (table == "club_memberships")
        {
            if (filter.TryGetValue("club_id", out var requestedClub) && requestedClub.IsString && !clubIds.Contains(requestedClub.AsString)) throw new DomainException("Acesso negado.");
            if (!filter.Contains("club_id")) filter["user_id"] = userId;
        }
        else
        {
            if (filter.TryGetValue("club_id", out var requestedClub) && requestedClub.IsString)
            {
                if (!clubIds.Contains(requestedClub.AsString)) throw new DomainException("Acesso negado.");
            }
            else filter["club_id"] = new BsonDocument("$in", new BsonArray(clubIds));
        }

        var collection = Collection(table);
        if (request.Operation == "insert") return await InsertAsync(collection, request, userId);
        if (request.Operation == "update") return await UpdateAsync(collection, table, filter, request, userId);
        if (request.Operation == "delete") return await DeleteAsync(collection, table, filter, userId);

        var find = collection.Find(filter);
        if (request.Order is not null)
        {
            var order = request.Order.Ascending ? Builders<BsonDocument>.Sort.Ascending(request.Order.Field) : Builders<BsonDocument>.Sort.Descending(request.Order.Field);
            find = find.Sort(order);
        }
        var rows = (await find.Limit(Math.Clamp(request.Limit ?? 1000, 1, 1000)).ToListAsync()).Select(BsonMapping.Plain).ToArray();
        return Envelope(request.Single ? rows.FirstOrDefault() : rows);
    }

    private async Task<object> InsertAsync(IMongoCollection<BsonDocument> collection, DataRequest request, string userId)
    {
        var table = collection.CollectionNamespace.CollectionName;
        if (table is "clubs" or "profiles" or "club_memberships") throw new DomainException("Use a operação apropriada para criar esses registros.");
        var documents = BsonMapping.Documents(request.Values).ToList();
        foreach (var document in documents)
        {
            if (!document.Contains("id")) document["id"] = Guid.NewGuid().ToString();
            if (!document.Contains("created_at")) document["created_at"] = DateTime.UtcNow.ToString("O");
            document["updated_at"] = DateTime.UtcNow.ToString("O");
            document["version"] = 1;
            var club = document.GetValue("club_id", BsonNull.Value);
            if (!club.IsString || !await CanWrite(club.AsString, userId, table)) throw new DomainException("Acesso negado.");
        }
        if (documents.Count > 0) await collection.InsertManyAsync(documents);
        object? data = !request.Returning ? null : request.Single ? BsonMapping.Nullable(documents.FirstOrDefault()) : documents.Select(BsonMapping.Plain).ToArray();
        return Envelope(data);
    }

    private async Task<object> UpdateAsync(IMongoCollection<BsonDocument> collection, string table, BsonDocument filter, DataRequest request, string userId)
    {
        var current = await collection.Find(filter).FirstOrDefaultAsync();
        if (current is null) return Envelope(Array.Empty<object>());
        var clubId = current.GetValue("club_id", table == "clubs" ? current.GetValue("id", "") : BsonNull.Value);
        if (clubId.IsString && !await CanWrite(clubId.AsString, userId, table)) throw new DomainException("Acesso negado.");
        if (table == "profiles" && current.GetValue("id", "").AsString != userId) throw new DomainException("Acesso negado.");
        var changes = BsonMapping.Document(request.Values);
        changes.Remove("id"); changes.Remove("club_id"); changes.Remove("version");
        changes["updated_at"] = DateTime.UtcNow.ToString("O");
        var updated = await collection.FindOneAndUpdateAsync(filter, new BsonDocument { ["$set"] = changes, ["$inc"] = new BsonDocument("version", 1) }, new FindOneAndUpdateOptions<BsonDocument> { ReturnDocument = ReturnDocument.After });
        object? data = request.Returning ? request.Single ? BsonMapping.Nullable(updated) : updated is null ? Array.Empty<object>() : new[] { BsonMapping.Plain(updated) } : Array.Empty<object>();
        return Envelope(data);
    }

    private async Task<object> DeleteAsync(IMongoCollection<BsonDocument> collection, string table, BsonDocument filter, string userId)
    {
        if (table is "clubs" or "profiles") throw new DomainException("Exclusão não disponível para essa coleção.");
        var current = await collection.Find(filter).FirstOrDefaultAsync();
        if (current is not null && current.TryGetValue("club_id", out var club) && club.IsString && !await CanWrite(club.AsString, userId, table)) throw new DomainException("Acesso negado.");
        await collection.DeleteOneAsync(filter);
        return Envelope(null);
    }

    private static object Envelope(object? data) => new { data, error = (object?)null };
}
