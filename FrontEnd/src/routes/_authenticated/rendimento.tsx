import { createFileRoute } from "@tanstack/react-router";
import { Performance } from "@/frontend/performance";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/rendimento")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { tab?: string | undefined; player?: string | undefined; metric?: string | undefined } => ({
    tab: typeof s["tab"] === "string" ? s["tab"] : undefined,
    player: typeof s["player"] === "string" ? s["player"] : undefined,
    metric: typeof s["metric"] === "string" ? s["metric"] : undefined,
  }),
  head: () => pageHead("Rendimento"),
  component: Page,
});
function Page() {
  return <Performance search={Route.useSearch()} />;
}
