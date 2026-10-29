using Microsoft.AspNetCore.Mvc;
using Vestiario.Application.Contracts;
using Vestiario.Application.Ports;
using VestiarioPontoCom.API.Http;

namespace VestiarioPontoCom.API.Controllers;

[Route("api/rpc")]
public sealed class RpcController(IRpcService rpcService) : ApiControllerBase
{
    [HttpPost]
    public Task<IActionResult> Post([FromBody] RpcRequest request)
    {
        return ExecuteAsync(() => rpcService.ExecuteAsync(request, BearerToken));
    }
}
