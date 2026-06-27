import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Users, MessageSquare, Calendar, Layers, BookOpen, FolderOpen, ShoppingBag, Compass, Globe, PackageSearch } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";

const navItems = [
  { path: "/home", label: "Home", icon: Home },
  { path: "/connections", label: "Connect", icon: Users },
  { path: "/messages", label: "Messages", icon: MessageSquare },
  { path: "/events", label: "Events", icon: Calendar },
];

const extraFeatures = [
  { path: "/discover", label: "Discover", icon: Compass },
  { path: "/communities", label: "Communities", icon: Globe },
  { path: "/study-groups", label: "Study Groups", icon: BookOpen },
  { path: "/resources", label: "Resources", icon: FolderOpen },
  { path: "/marketplace", label: "Marketplace", icon: ShoppingBag },
  { path: "/lost-found", label: "Lost & Found", icon: PackageSearch },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const isExtraActive = extraFeatures.some((f) => location.pathname.startsWith(f.path));

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}

        {/* More — bottom sheet */}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isExtraActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Layers className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </DrawerTrigger>
          <DrawerContent className="pb-safe">
            <div className="px-2 pb-4 pt-2">
              {extraFeatures.map(({ path, label, icon: Icon }) => {
                const isActive = location.pathname.startsWith(path);
                return (
                  <button
                    key={path}
                    onClick={() => {
                      setOpen(false);
                      navigate(path);
                    }}
                    className={`flex items-center gap-3 w-full rounded-lg py-3 px-4 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/5"
                        : "text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </button>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
