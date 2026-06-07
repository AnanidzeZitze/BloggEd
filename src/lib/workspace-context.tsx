"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  hasGoogleToken: boolean;
  hasCustomGeminiKey: boolean;
}

interface WorkspaceContextValue {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
  activeWorkspace: WorkspaceSummary | null;
  setActiveWorkspaceId: (id: string) => void;
  reload: () => Promise<void>;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const LS_KEY = "activeWorkspaceId";

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveWorkspaceIdState(id);
    try { localStorage.setItem(LS_KEY, id); } catch { /* ignore */ }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      if (!res.ok) return;
      const json = await res.json();
      if (!json.success) return;
      const list: WorkspaceSummary[] = json.data ?? [];
      setWorkspaces(list);

      if (list.length === 0) {
        setActiveWorkspaceIdState(null);
        return;
      }

      const stored = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
      const valid = stored && list.some((w) => w.id === stored) ? stored : list[0].id;
      setActiveWorkspaceIdState(valid);
      try { localStorage.setItem(LS_KEY, valid); } catch { /* ignore */ }
    } catch {
      // network error — keep current state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspaceId, activeWorkspace, setActiveWorkspaceId, reload, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
