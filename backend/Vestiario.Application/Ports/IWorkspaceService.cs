namespace Vestiario.Application.Ports;
public interface IWorkspaceService
{
    Task<object?> GetWorkspaceAsync(string? bearerToken);
    Task<object?> GetClubAsync(string clubId, string? bearerToken);
}
