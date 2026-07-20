import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/bankalar")({
  beforeLoad: () => {
    throw redirect({ to: "/bankalar/hesaplar" });
  },
});
