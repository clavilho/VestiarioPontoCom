## Application architecture
- Keep presentation and visual components in `src/frontend/`.
- The browser calls the Node.js + TypeScript API through `/api`; do not add database access to frontend modules.
- Keep the backend in `BackEnd/`, separated into Domain, Application, Infrastructure, and Presentation layers.
- Keep HTTP route definitions in controllers under `BackEnd/src/presentation`; controllers call application services and never access MongoDB directly.
- Define application ports and use cases under `BackEnd/src/application`; keep domain rules in `BackEnd/src/domain`.
- Implement persistence ports under `BackEnd/src/infrastructure`; keep MongoDB driver usage and connection configuration there.
- Enforce club membership and role permissions on the server; client-side controls are presentation only.
- Preserve the existing frontend route paths and visual design unless the user requests changes.
