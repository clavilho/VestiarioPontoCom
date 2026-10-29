using System.Text.Json;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;

namespace Vestiario.Infrastructure.Mongo;

internal static class BsonMapping
{
    public static BsonDocument Filter(IReadOnlyDictionary<string, JsonElement>? values)
    {
        var result = new BsonDocument();
        if (values is null) return result;
        foreach (var (key, value) in values)
        {
            if (value.ValueKind is JsonValueKind.Object or JsonValueKind.Array) throw new Vestiario.Domain.DomainException("Filtro inválido.");
            result[key] = ToBson(value);
        }
        return result;
    }

    public static BsonValue ToBson(JsonElement value) => value.ValueKind switch
    {
        JsonValueKind.String => new BsonString(value.GetString() ?? ""),
        JsonValueKind.Number when value.TryGetInt64(out var integer) => new BsonInt64(integer),
        JsonValueKind.Number => new BsonDouble(value.GetDouble()),
        JsonValueKind.True => BsonBoolean.True,
        JsonValueKind.False => BsonBoolean.False,
        JsonValueKind.Null => BsonNull.Value,
        _ => throw new Vestiario.Domain.DomainException("Valor inválido.")
    };

    public static BsonDocument Document(JsonElement? value) => value is { ValueKind: JsonValueKind.Object } json
        ? BsonSerializer.Deserialize<BsonDocument>(json.GetRawText()) : new BsonDocument();

    public static IEnumerable<BsonDocument> Documents(JsonElement? value)
    {
        if (value is not { } json) return [];
        if (json.ValueKind == JsonValueKind.Array) return json.EnumerateArray().Select(x => BsonSerializer.Deserialize<BsonDocument>(x.GetRawText())).ToArray();
        return [BsonSerializer.Deserialize<BsonDocument>(json.GetRawText())];
    }

    public static object? Nullable(BsonDocument? document) => document is null ? null : Plain(document);
    public static object Plain(BsonDocument document) => document.Where(x => x.Name != "_id").ToDictionary(x => x.Name, x => PlainValue(x.Value));
    private static object? PlainValue(BsonValue value) => value.BsonType switch
    {
        BsonType.Null => null,
        BsonType.Document => Plain(value.AsBsonDocument),
        BsonType.Array => value.AsBsonArray.Select(PlainValue).ToArray(),
        BsonType.String => value.AsString,
        BsonType.Boolean => value.AsBoolean,
        BsonType.Int32 => value.AsInt32,
        BsonType.Int64 => value.AsInt64,
        BsonType.Double => value.AsDouble,
        BsonType.Decimal128 => (double)Decimal128.ToDecimal(value.AsDecimal128),
        BsonType.DateTime => value.AsBsonDateTime.ToUniversalTime().ToString("O"),
        _ => value.ToString()
    };
}
