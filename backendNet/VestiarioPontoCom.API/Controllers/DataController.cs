using Microsoft.AspNetCore.Mvc;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using VestiarioPontoCom.API.Http;

namespace VestiarioPontoCom.API.Controllers;

[Route("api/data")]
public sealed class DataController(IDataService dataService) : ApiControllerBase
{
    [HttpPost]
    public Task<IActionResult> Post([FromBody] DataRequest request)
    {
        return ExecuteAsync(() => dataService.ExecuteAsync(request, BearerToken));
    }
}
