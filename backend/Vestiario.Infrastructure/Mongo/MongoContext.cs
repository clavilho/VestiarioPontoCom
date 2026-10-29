using MongoDB.Bson;
using MongoDB.Driver;

namespace Vestiario.Infrastructure.Mongo;

public sealed class MongoContext(string connectionString, string databaseName)
{
    public IMongoDatabase Database { get; } = new MongoClient(connectionString).GetDatabase(databaseName);

    public async Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        await CreateUniqueIndex("users", "email", cancellationToken);
        await CreateUniqueIndex("sessions", "token", cancellationToken);
        var memberships = Database.GetCollection<BsonDocument>("club_memberships");
        await memberships.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(Builders<BsonDocument>.IndexKeys.Ascending("club_id").Ascending("user_id"), new CreateIndexOptions { Unique = true }), cancellationToken: cancellationToken);
        var fees = Database.GetCollection<BsonDocument>("membership_fees");
        await fees.Indexes.CreateOneAsync(new CreateIndexModel<BsonDocument>(Builders<BsonDocument>.IndexKeys.Ascending("club_id").Ascending("player_id").Ascending("competence"), new CreateIndexOptions { Unique = true }), cancellationToken: cancellationToken);
        var clubScopedCollections = new[]
        {
            "players", "staff_members", "events", "attendance", "measurement_types",
            "player_measurements", "financial_transactions", "audit_logs"
        };
        await Task.WhenAll(clubScopedCollections.Select(collection =>
            Database.GetCollection<BsonDocument>(collection).Indexes.CreateOneAsync(
                new CreateIndexModel<BsonDocument>(Builders<BsonDocument>.IndexKeys.Ascending("club_id")),
                cancellationToken: cancellationToken)));
    }

    private async Task CreateUniqueIndex(string collectionName, string field, CancellationToken cancellationToken)
    {
        await Database.GetCollection<BsonDocument>(collectionName).Indexes.CreateOneAsync(
            new CreateIndexModel<BsonDocument>(Builders<BsonDocument>.IndexKeys.Ascending(field), new CreateIndexOptions { Unique = true }),
            cancellationToken: cancellationToken);
    }
}
