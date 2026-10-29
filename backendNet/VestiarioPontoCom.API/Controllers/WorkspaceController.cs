using Microsoft.AspNetCore.Mvc;
using Vestiario.Application.Ports;
using VestiarioPontoCom.API.Http;

namespace VestiarioPontoCom.API.Controllers;

[Route("api/workspace")]
public sealed class WorkspaceController(IWorkspaceService workspaceService) : ApiControllerBase
{
    [HttpGet]
    public Task<IActionResult> Get()
    {
        return ExecuteAsync(() => workspaceService.GetWorkspaceAsync(BearerToken));
    }
}
