import { createFileRoute } from "@tanstack/react-router";
import { Squad } from "@/frontend/squad";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/plantel")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { q?: string | undefined; tab?: string | undefined; status?: string | undefined } => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    tab: typeof s["tab"] === "string" ? s["tab"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
  }),
  head: () => pageHead("Plantel"),
  component: Page,
});
function Page() {
  return <Squad search={Route.useSearch()} />;
}
