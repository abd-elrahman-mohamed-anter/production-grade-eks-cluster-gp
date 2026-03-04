import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Home,
  Search,
  Calendar,
  FileText,
  Settings,
  Info,
  HelpCircle,
  CircleHelp,
  GitCompare,
} from "lucide-react";
import ZapLogo from "./ZapLogo";

const mainMenuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Scan Now", url: "/scan", icon: Search },
  { title: "Scheduling", url: "/scheduling", icon: Calendar },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Compare Scans", url: "/compare", icon: GitCompare },
  { title: "Settings", url: "/settings", icon: Settings },
];

const infoMenuItems = [
  { title: "About Us", url: "/about-us", icon: Info },
  { title: "About", url: "/about", icon: CircleHelp },
  { title: "FAQ", url: "/faq", icon: HelpCircle },
];

export default function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <ZapLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {infoMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url} data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-xs text-muted-foreground text-center">
          Vulnerability Scanner v1.2025
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
