## Application architecture
- Keep presentation and visual components in `src/frontend/`.
- The browser calls the ASP.NET Core API through `/api`; do not add database access to frontend modules.
- Keep the solution in `backend/Vestiario.sln` with separate Domain, Application, Infrastructure, and `VestiarioPontoCom.API` projects.
- Keep HTTP route definitions in specific API controllers; controllers call interfaces from `Vestiario.Application` and never access MongoDB directly.
- Define application contracts and ports/interfaces in `Vestiario.Application`; keep domain rules in `Vestiario.Domain`.
- Implement application ports as services in `Vestiario.Infrastructure`; keep MongoDB driver usage, BSON mapping, and connection configuration there.
- Enforce club membership and role permissions on the server; client-side controls are presentation only.
- Preserve the existing frontend route paths and visual design unless the user requests changes.
