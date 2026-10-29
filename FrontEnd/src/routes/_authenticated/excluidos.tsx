import { createFileRoute } from "@tanstack/react-router";
import { History } from "@/frontend/history";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/excluidos")({
  head: () => pageHead("Itens excluídos"),
  component: Page,
});
function Page() {
  return <History trash />;
}
