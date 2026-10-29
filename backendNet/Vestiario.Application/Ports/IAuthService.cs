using Vestiario.Application.Contracts;

namespace Vestiario.Application.Ports;

public interface IAuthService
{
    Task<object?> ExecuteAsync(AuthRequest request, string? bearerToken);
    Task<object?> SignInWithGoogleAsync(GoogleAuthRequest request);
}
