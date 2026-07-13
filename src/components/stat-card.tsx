import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  trend?: number; // yüzde
  tone?: "primary" | "success" | "warning" | "info" | "destructive";
};

const toneMap: Record<NonNullable<Props["tone"]>, string> = {
  primary: "from-primary/15 to-primary/5 text-primary",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/20 to-warning/5 text-warning",
  info: "from-info/15 to-info/5 text-info",
  destructive: "from-destructive/15 to-destructive/5 text-destructive",
};

export function StatCard({ label, value, hint, icon: Icon, trend, tone = "primary" }: Props) {
  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">{label}</div>
            <div className="mt-2 truncate text-2xl font-bold tracking-tight">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br", toneMap[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof trend === "number" && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend >= 0 ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-success/10 px-1.5 py-0.5 font-medium text-success">
                <ArrowUpRight className="h-3 w-3" /> %{trend.toFixed(1)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                <ArrowDownRight className="h-3 w-3" /> %{Math.abs(trend).toFixed(1)}
              </span>
            )}
            <span className="text-muted-foreground">geçen aya göre</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
