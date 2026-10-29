using Vestiario.Application.Contracts;
namespace Vestiario.Application.Ports;
public interface IDataService { Task<object?> ExecuteAsync(DataRequest request, string? bearerToken); }
