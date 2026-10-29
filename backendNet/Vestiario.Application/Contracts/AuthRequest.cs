namespace Vestiario.Application.Contracts;
public sealed record AuthRequest(string Action, string? Email = null, string? Password = null, string? FullName = null, string? Token = null);
