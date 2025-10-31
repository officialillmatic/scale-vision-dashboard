// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Role = 'owner' | 'admin' | 'member' | 'viewer';

type TeamLite = {
  id: string;
  name: string;
  seat_limit: number | null;
};

type SessionState = {
  loading: boolean;
  user: any | null;
  currentTeam: TeamLite | null;
  teamRole: Role | null;
};

const AuthCtx = createContext<SessionState>({
  loading: true,
  user: null,
  currentTeam: null,
  teamRole: null,
});

export const useAuth = () => useContext(AuthCtx);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamLite | null>(null);
  const [teamRole, setTeamRole] = useState<Role | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const u = auth?.user ?? null;
      if (!mounted) return;

      setUser(u);

      if (!u) {
        // not logged in
        setCurrentTeam(null);
        setTeamRole(null);
        setLoading(false);
        return;
      }

      // Resolve current team by membership (first team for now; later you can add a switcher)
      const { data: mem, error: memErr } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', u.id)
        .limit(1)
        .maybeSingle();

      if (memErr) {
        console.warn('[auth] team_members read error (RLS?)', memErr);
      }

      if (!mem) {
        setCurrentTeam(null);
        setTeamRole(null);
        setLoading(false);
        return;
      }

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, seat_limit')
        .eq('id', mem.team_id)
        .single();

      if (teamErr) {
        console.warn('[auth] teams read error (RLS?)', teamErr);
        setCurrentTeam(null);
        setTeamRole(mem.role as Role);
        setLoading(false);
        return;
      }

      setCurrentTeam(team as TeamLite);
      setTeamRole(mem.role as Role);
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      // re-run init on sign in/out
      init();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const value = useMemo(
    () => ({ loading, user, currentTeam, teamRole }),
    [loading, user, currentTeam, teamRole]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
