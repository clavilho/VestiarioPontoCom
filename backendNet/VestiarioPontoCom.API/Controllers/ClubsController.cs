using Microsoft.AspNetCore.Mvc;
using Vestiario.Application.Ports;
using VestiarioPontoCom.API.Http;

namespace VestiarioPontoCom.API.Controllers;

[Route("api/clubs")]
public sealed class ClubsController(IWorkspaceService workspaceService) : ApiControllerBase
{

    [HttpGet("{clubId}")]
    public Task<IActionResult> GetById(string clubId)
    {
        return ExecuteAsync(() => workspaceService.GetClubAsync(clubId, BearerToken));
    }
}
