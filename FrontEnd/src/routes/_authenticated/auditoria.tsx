import { createFileRoute } from "@tanstack/react-router";
import { History } from "@/frontend/history";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/auditoria")({
  head: () => pageHead("Auditoria"),
  component: Page,
});
function Page() {
  return <History />;
}
