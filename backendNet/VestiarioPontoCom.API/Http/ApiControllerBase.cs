using Microsoft.AspNetCore.Mvc;
using Vestiario.Domain;

namespace VestiarioPontoCom.API.Http;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected string? BearerToken
    {
        get
        {
            var header = Request.Headers.Authorization.ToString();
            return header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
                ? header[7..]
                : null;
        }
    }

    protected async Task<IActionResult> ExecuteAsync(Func<Task<object?>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (Exception exception)
        {
            var message = exception is DomainException
                ? exception.Message
                : "Falha ao processar a solicitação.";

            return BadRequest(new
            {
                data = (object?)null,
                error = new { message }
            });
        }
    }
}
