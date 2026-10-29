using System.Text.Json;
namespace Vestiario.Application.Contracts;
public sealed record RpcRequest(string Name, JsonElement Args);
