using MongoDB.Bson;
using MongoDB.Driver;
using Vestiario.Domain;
using Vestiario.Infrastructure.Mongo;

namespace Vestiario.Infrastructure.Services;

public abstract class MongoService(MongoContext context)
{
    protected IMongoDatabase Database => context.Database;
    protected IMongoCollection<BsonDocument> Collection(string name) => Database.GetCollection<BsonDocument>(name);

    protected async Task<string> RequireUser(string? token)
    {
        var session = await FindSession(token);
        if (session is null) throw new DomainException("Não autenticado ou sessão expirada.");
        return session["user_id"].AsString;
    }

    protected async Task<BsonDocument?> FindSession(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        return await Collection("sessions").Find(new BsonDocument { ["token"] = token, ["expires_at"] = new BsonDocument("$gt", DateTime.UtcNow) }).FirstOrDefaultAsync();
    }

    protected async Task<string?> GetRole(string clubId, string userId)
    {
        var member = await Collection("club_memberships").Find(new BsonDocument { ["club_id"] = clubId, ["user_id"] = userId }).FirstOrDefaultAsync();
        return member?.GetValue("role", "").AsString;
    }

    protected async Task<bool> CanWrite(string clubId, string userId, string table)
    {
        var role = await GetRole(clubId, userId);
        var accepted = table is "financial_transactions" or "membership_fees" ? ClubRoles.Finance : table is "clubs" or "club_memberships" ? ClubRoles.Administrators : ClubRoles.Sports;
        return ClubRoles.Includes(role, accepted);
    }

    protected static bool HasRole(string role, params string[] accepted) => accepted.Contains(role);
}
