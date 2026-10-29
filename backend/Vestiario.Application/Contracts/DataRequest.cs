using System.Text.Json;
namespace Vestiario.Application.Contracts;
public sealed record DataRequest(string Kind = "query", string? Table = null, string? Operation = null, Dictionary<string, JsonElement>? Filters = null, JsonElement? Values = null, SortRequest? Order = null, int? Limit = null, bool Single = false, bool Returning = false, string? Name = null, Dictionary<string, JsonElement>? Args = null);
