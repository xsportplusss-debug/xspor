import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  ShoppingCart,
  Archive,
  Users,
  UserSquare,
  Package,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
  Store,
  BarChart3,
  Calendar,
  Bell,
  UserCog,
  Building2,
  FileSignature,
  Cloud,
  Sparkles,

} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
];

const salesItems = [
  { title: "Satış Faturaları", url: "/satis-faturalari", icon: FileText },
  { title: "Alış Faturaları", url: "/alis-faturalari", icon: ShoppingCart },
  { title: "Fiyat Teklifi", url: "/fiyat-teklifi", icon: FileSignature },
  { title: "E-Arşiv", url: "/e-arsiv", icon: Archive },
  { title: "E-Fatura Entegrasyonu", url: "/e-fatura-entegrasyon", icon: Cloud },
];

const cariItems = [
  { title: "Cari Hesaplar", url: "/cari-hesaplar", icon: Users },
  { title: "Müşteriler", url: "/musteriler", icon: UserSquare },
];

const stockItems = [
  { title: "Ürünler", url: "/urunler", icon: Package },
];

const bankSubItems = [
  { title: "Banka Ekle", url: "/bankalar/hesaplar" },
  { title: "Banka Ekstreleri", url: "/bankalar/ekstreler" },
];

const financeItems = [
  { title: "Kasa", url: "/kasa", icon: Wallet },
  { title: "Gelirler", url: "/gelirler", icon: TrendingUp },
  { title: "Giderler", url: "/giderler", icon: TrendingDown },
];

const marketplaceItems = [
  { title: "API Ayarları", url: "/pazaryerleri/ayarlar" },
  { title: "Trendyol", url: "/pazaryerleri/trendyol" },
  { title: "Hepsiburada", url: "/pazaryerleri/hepsiburada" },
  { title: "Amazon", url: "/pazaryerleri/amazon" },
  { title: "N11", url: "/pazaryerleri/n11" },
  { title: "Pazarama", url: "/pazaryerleri/pazarama" },
  { title: "ÇiçekSepeti", url: "/pazaryerleri/ciceksepeti" },
  { title: "PTTAVM", url: "/pazaryerleri/pttavm" },
  { title: "idefix", url: "/pazaryerleri/idefix" },
  { title: "Turkcell Pasaj", url: "/pazaryerleri/turkcell-pasaj" },
];


const otherItems = [
  { title: "Raporlar", url: "/raporlar", icon: BarChart3 },
  { title: "Takvim", url: "/takvim", icon: Calendar },
  { title: "Bildirimler", url: "/bildirimler", icon: Bell },
  { title: "Kullanıcılar", url: "/kullanicilar", icon: UserCog },
  { title: "Firma Ayarları", url: "/firma-ayarlari", icon: Building2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) => (u === "/" ? pathname === "/" : pathname.startsWith(u));

  const renderGroup = (label: string, items: { title: string; url: string; icon: any }[]) => (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => (
            <SidebarMenuItem key={it.url}>
              <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                <Link to={it.url}>
                  <it.icon className="h-4 w-4" />
                  <span>{it.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const marketplaceActive = pathname.startsWith("/pazaryerleri");

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl gradient-primary shadow-elegant">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">Fintra</div>
              <div className="truncate text-[11px] text-muted-foreground">Ön Muhasebe</div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Genel", mainItems)}
        {renderGroup("Faturalar", salesItems)}
        {renderGroup("Cari", cariItems)}
        {renderGroup("Stok", stockItems)}

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Finans</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={pathname.startsWith("/bankalar")} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Bankalar" isActive={pathname.startsWith("/bankalar")}>
                      <Landmark className="h-4 w-4" />
                      <span>Bankalar</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {bankSubItems.map((mi) => (
                        <SidebarMenuSubItem key={mi.url}>
                          <SidebarMenuSubButton asChild isActive={isActive(mi.url)}>
                            <Link to={mi.url}>
                              <span>{mi.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
              {financeItems.map((it) => (
                <SidebarMenuItem key={it.url}>
                  <SidebarMenuButton asChild isActive={isActive(it.url)} tooltip={it.title}>
                    <Link to={it.url}>
                      <it.icon className="h-4 w-4" />
                      <span>{it.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Pazaryerleri</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={marketplaceActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Pazaryerleri" isActive={marketplaceActive}>
                      <Store className="h-4 w-4" />
                      <span>Pazaryerleri</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {marketplaceItems.map((mi) => (
                        <SidebarMenuSubItem key={mi.url}>
                          <SidebarMenuSubButton asChild isActive={isActive(mi.url)}>
                            <Link to={mi.url}>
                              <span>{mi.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {renderGroup("Diğer", otherItems)}
      </SidebarContent>
    </Sidebar>
  );
}
