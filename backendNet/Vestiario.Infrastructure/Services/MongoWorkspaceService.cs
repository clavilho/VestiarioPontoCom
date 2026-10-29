using MongoDB.Bson;
using MongoDB.Driver;
using Vestiario.Application.Ports;
using Vestiario.Domain;
using Vestiario.Infrastructure.Mongo;

namespace Vestiario.Infrastructure.Services;

public sealed class MongoWorkspaceService(MongoContext context) : MongoService(context), IWorkspaceService
{
    public async Task<object?> GetWorkspaceAsync(string? bearerToken)
    {
        var userId = await RequireUser(bearerToken);
        var memberships = await Collection("club_memberships").Find(Builders<BsonDocument>.Filter.Eq("user_id", userId)).ToListAsync();
        var ids = memberships.Select(x => x.GetValue("club_id", "").AsString).ToArray();
        List<BsonDocument> clubs = ids.Length == 0 ? [] : await Collection("clubs").Find(Builders<BsonDocument>.Filter.In("id", ids)).Sort(Builders<BsonDocument>.Sort.Ascending("created_at")).ToListAsync();
        var profile = await Collection("profiles").Find(Builders<BsonDocument>.Filter.Eq("id", userId)).FirstOrDefaultAsync();
        return new { clubs = clubs.Select(BsonMapping.Plain), memberships = memberships.Select(BsonMapping.Plain), profile = BsonMapping.Nullable(profile) };
    }

    public async Task<object?> GetClubAsync(string clubId, string? bearerToken)
    {
        var userId = await RequireUser(bearerToken);
        var role = await GetRole(clubId, userId);
        if (role is null) throw new DomainException("Acesso negado.");
        var tableRoles = new Dictionary<string, string[]>(StringComparer.Ordinal)
        {
            ["membership_fees"] = ClubRoles.Finance,
            ["financial_transactions"] = ClubRoles.Finance,
            ["audit_logs"] = ClubRoles.Administrators,
            ["club_memberships"] = ClubRoles.Administrators
        };
        var tables = new[]
        {
            "players", "staff_members", "events", "attendance", "measurement_types",
            "player_measurements", "membership_fees", "financial_transactions",
            "audit_logs", "club_memberships"
        };
        var requests = new Dictionary<string, Task<List<BsonDocument>>>(StringComparer.Ordinal);

        foreach (var table in tables)
        {
            if (tableRoles.TryGetValue(table, out var roles) && !ClubRoles.Includes(role, roles))
            {
                requests[table] = Task.FromResult(new List<BsonDocument>());
                continue;
            }

            var query = Collection(table).Find(Builders<BsonDocument>.Filter.Eq("club_id", clubId));
            if (table is "events" or "membership_fees" or "financial_transactions" or "audit_logs")
            {
                query = query.Limit(table == "audit_logs" ? 100 : 1000);
            }
            requests[table] = query.ToListAsync();
        }

        await Task.WhenAll(requests.Values);
        var rows = requests.ToDictionary(
            pair => pair.Key,
            pair => (object)pair.Value.Result.Select(BsonMapping.Plain).ToArray(),
            StringComparer.Ordinal);

        return new
        {
            players = rows["players"],
            staff = rows["staff_members"],
            events = rows["events"],
            attendance = rows["attendance"],
            metrics = rows["measurement_types"],
            measurements = rows["player_measurements"],
            fees = rows["membership_fees"],
            transactions = rows["financial_transactions"],
            audit = rows["audit_logs"],
            members = rows["club_memberships"]
        };
    }
}
