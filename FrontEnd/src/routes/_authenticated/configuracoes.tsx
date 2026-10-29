import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "@/frontend/settings";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => pageHead("Configurações"),
  component: Page,
});
function Page() {
  return <Settings />;
}
