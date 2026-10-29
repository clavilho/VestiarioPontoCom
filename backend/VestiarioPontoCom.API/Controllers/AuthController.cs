using Microsoft.AspNetCore.Mvc;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using VestiarioPontoCom.API.Http;

namespace VestiarioPontoCom.API.Controllers;

[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ApiControllerBase
{
    [HttpPost]
    public Task<IActionResult> Post([FromBody] AuthRequest request)
    {
        return ExecuteAsync(() => authService.ExecuteAsync(request, BearerToken));
    }

    [HttpPost("google")]
    public Task<IActionResult> SignInWithGoogle([FromBody] GoogleAuthRequest request)
    {
        return ExecuteAsync(() => authService.SignInWithGoogleAsync(request));
    }
}
