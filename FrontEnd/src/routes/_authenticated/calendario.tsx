import { createFileRoute } from "@tanstack/react-router";
import { Calendar } from "@/frontend/calendar";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/calendario")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { date?: string | undefined; view?: string | undefined; type?: string | undefined } => ({
    date: typeof s["date"] === "string" ? s["date"] : undefined,
    view: typeof s["view"] === "string" ? s["view"] : undefined,
    type: typeof s["type"] === "string" ? s["type"] : undefined,
  }),
  head: () => pageHead("Calendário"),
  component: Page,
});
function Page() {
  return <Calendar search={Route.useSearch()} />;
}
