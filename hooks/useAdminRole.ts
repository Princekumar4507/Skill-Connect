import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "super_admin" | "events_team" | "community_moderator" | "content_moderator";

const GLOBAL_DOMAINS = ["gmail.com"];

export const useAdminRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [adminDomain, setAdminDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setAdminDomain(null);
      setLoading(false);
      return;
    }

    const fetchRolesAndDomain = async () => {
      const [{ data: rolesData }, { data: profileData }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("email_domain").eq("user_id", user.id).single(),
      ]);
      setRoles((rolesData || []).map((r: any) => r.role as AppRole));
      setAdminDomain(profileData?.email_domain || null);
      setLoading(false);
    };

    fetchRolesAndDomain();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isSuperAdmin = hasRole("super_admin");
  const isEventsTeam = isSuperAdmin || hasRole("events_team");
  const isCommunityMod = isSuperAdmin || hasRole("community_moderator");
  const isContentMod = isSuperAdmin || hasRole("content_moderator");
  const isAnyAdmin = roles.length > 0;
  const isGlobalAdmin = adminDomain ? GLOBAL_DOMAINS.includes(adminDomain) : false;

  return { roles, loading, hasRole, isSuperAdmin, isEventsTeam, isCommunityMod, isContentMod, isAnyAdmin, adminDomain, isGlobalAdmin };
};
