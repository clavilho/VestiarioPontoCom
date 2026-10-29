import { createFileRoute } from "@tanstack/react-router";
import { Cash } from "@/frontend/cash";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/caixa")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: string | undefined; status?: string | undefined; month?: string | undefined } => ({
    tab: typeof s["tab"] === "string" ? s["tab"] : undefined,
    status: typeof s["status"] === "string" ? s["status"] : undefined,
    month: typeof s["month"] === "string" ? s["month"] : undefined,
  }),
  head: () => pageHead("Caixa"),
  component: Page,
});
function Page() {
  return <Cash search={Route.useSearch()} />;
}
