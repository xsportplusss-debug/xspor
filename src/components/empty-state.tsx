import { Inbox } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon = Inbox,
  title = "Henüz kayıt yok",
  desc = "Yeni kayıt ekleyin veya içe aktarın.",
  action,
}: {
  icon?: any;
  title?: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="glass border-dashed">
      <CardContent className="grid place-items-center gap-3 p-10 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <div className="text-base font-semibold">{title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}
