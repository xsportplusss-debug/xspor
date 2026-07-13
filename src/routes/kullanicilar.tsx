import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { users } from "@/lib/mock-data";

export const Route = createFileRoute("/kullanicilar")({
  head: () => ({
    meta: [
      { title: "Kullanıcılar — Fintra" },
      { name: "description", content: "Panel kullanıcıları ve rolleri." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kullanıcılar"
        subtitle="Panele erişimi olan tüm kullanıcılar."
        actions={<Button size="sm" className="gradient-primary text-primary-foreground shadow-elegant"><Plus className="mr-1 h-4 w-4" /> Yeni Kullanıcı</Button>}
      />
      <Card className="glass"><CardContent className="p-4">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Kullanıcı</TableHead><TableHead>E-posta</TableHead><TableHead>Rol</TableHead><TableHead>Durum</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{u.name.split(" ").map((w) => w[0]).join("")}</AvatarFallback></Avatar>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                <TableCell><Badge variant={u.status === "Aktif" ? "default" : "secondary"}>{u.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
