using Vestiario.Application.Contracts;
namespace Vestiario.Application.Ports;
public interface IRpcService { Task<object?> ExecuteAsync(RpcRequest request, string? bearerToken); }
