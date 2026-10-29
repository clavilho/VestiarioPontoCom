import { createFileRoute } from "@tanstack/react-router";
import { Home } from "@/frontend/home";
import { pageHead } from "@/frontend/meta";
export const Route = createFileRoute("/_authenticated/inicio")({
  head: () => pageHead("Início"),
  component: Page,
});
function Page() {
  return <Home />;
}
