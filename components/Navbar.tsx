import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageSquare, Calendar, UsersRound, Bell, LogOut, User, Search, ThumbsUp, UserPlus, Check, Sun, Moon, Shield, BookOpen, FolderOpen, ShoppingBag, ChevronDown, Layers, PackageSearch } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface AppNotification {
  id: string;
  type: string;
  actor_id: string;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: { full_name: string; avatar_url: string | null };
}

const navItems = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/connections", label: "Connections", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/events", label: "Events", icon: Calendar },
  { path: "/communities", label: "Communities", icon: UsersRound },
  { path: "/discover", label: "Discover", icon: Search },
];

const extraFeatures = [
  { path: "/study-groups", label: "Study Groups", icon: BookOpen },
  { path: "/resources", label: "Resources", icon: FolderOpen },
  { path: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { path: "/lost-found", label: "Lost & Found", icon: PackageSearch },
];

const notifIcon: Record<string, typeof ThumbsUp> = {
  like: ThumbsUp,
  comment: MessageSquare,
  connection_request: UserPlus,
  connection_accepted: Check,
};

const notifText: Record<string, string> = {
  like: "liked your post",
  comment: "commented on your post",
  connection_request: "sent you a connection request",
  connection_accepted: "accepted your connection request",
};

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full hover:bg-secondary/80 transition-all duration-300 hover:scale-105"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
    </button>
  );
};

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAnyAdmin } = useAdminRole();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [{ data: notifs }, { data: profile }] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle(),
      ]);

      if (notifs?.length) {
        const actorIds = [...new Set(notifs.map((n) => n.actor_id))];
        const { data: actors } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", actorIds);
        const actorMap: Record<string, { full_name: string; avatar_url: string | null }> = {};
        (actors || []).forEach((a) => { actorMap[a.user_id] = a; });

        const enriched = notifs.map((n) => ({ ...n, actor: actorMap[n.actor_id] }));
        setNotifications(enriched);
        setUnreadCount(enriched.filter((n) => !n.read).length);
      }

      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
    };

    fetchData();

    const channel = supabase
      .channel("navbar-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async (payload) => {
          const n = payload.new as any;
          const { data: actor } = await supabase.from("profiles").select("full_name, avatar_url").eq("user_id", n.actor_id).maybeSingle();
          const enriched = { ...n, actor: actor || undefined };
          setNotifications((prev) => [enriched, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.read) {
      supabase.from("notifications").update({ read: true }).eq("id", notif.id).then();
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notif.type === "connection_request" || notif.type === "connection_accepted") {
      navigate(`/user/${notif.actor_id}`);
    } else if (notif.post_id) {
      navigate(`/post/${notif.post_id}`);
    }
  };

  const isExtraActive = extraFeatures.some((f) => location.pathname.startsWith(f.path));

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="container flex h-16 items-center justify-between">
        <Link to={user ? "/home" : "/"} className="flex items-center gap-2.5 group">
          <Logo size={36} />
          <span className="text-xl font-bold text-foreground tracking-tight">
            Skill<span className="gradient-text">-Connect</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />
                )}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isExtraActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <Layers className="h-4 w-4" />
                More
                <ChevronDown className="h-3 w-3" />
                {isExtraActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full gradient-primary" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 glass-strong">
              {extraFeatures.map(({ path, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={path}
                  onClick={() => navigate(path)}
                  className={location.pathname.startsWith(path) ? "text-primary" : ""}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative p-2 rounded-full hover:bg-secondary/80 transition-all duration-300 hover:scale-105">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full gradient-primary text-[10px] font-bold flex items-center justify-center text-primary-foreground animate-bounce-in">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 glass-strong">
                  <div className="flex items-center justify-between px-3 py-2">
                    <p className="font-semibold text-sm text-foreground">Notifications</p>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <ScrollArea className="max-h-80">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      notifications.map((n) => {
                        const Icon = notifIcon[n.type] || Bell;
                        return (
                          <button
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`w-full flex items-start gap-3 px-3 py-3 text-left hover:bg-secondary/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
                          >
                            <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-foreground">
                                <span className="font-semibold">{n.actor?.full_name || "Someone"}</span>{" "}
                                <span className="text-muted-foreground">{notifText[n.type]}</span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                          </button>
                        );
                      })
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all duration-300">
                    <Avatar className="h-8 w-8">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="Avatar" />}
                      <AvatarFallback className="gradient-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass-strong">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="h-4 w-4 mr-2" />Profile
                  </DropdownMenuItem>
                  {isAnyAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="h-4 w-4 mr-2" />Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} className="shimmer-btn animate-shimmer text-primary-foreground border-0" size="sm">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
