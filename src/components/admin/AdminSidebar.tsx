import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, UsersRound, FileText, Shield, ChevronLeft } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const AdminSidebar = () => {
  const location = useLocation();
  const { isSuperAdmin, isEventsTeam, isCommunityMod, isContentMod } = useAdminRole();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const items = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, show: true },
    { title: "Events", url: "/admin/events", icon: Calendar, show: isEventsTeam },
    { title: "Communities", url: "/admin/communities", icon: UsersRound, show: isCommunityMod },
    { title: "Content", url: "/admin/content", icon: FileText, show: isContentMod },
    { title: "Manage Roles", url: "/admin/roles", icon: Shield, show: isSuperAdmin },
  ].filter(i => i.show);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {!collapsed && "Admin Panel"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/home" className="flex items-center gap-2 px-3 py-2 text-muted-foreground hover:text-foreground">
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Back to App</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AdminSidebar;
