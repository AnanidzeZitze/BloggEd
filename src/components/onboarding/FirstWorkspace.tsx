"use client";

import React, { useState } from "react";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { useRouter } from "next/navigation";

export function FirstWorkspace() {
  const { reload, setActiveWorkspaceId } = useWorkspace();
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create workspace");
      await reload();
      setActiveWorkspaceId(json.data.id);
      router.push("/dashboard/settings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-full">
      <div className="max-w-md w-full text-center space-y-8 px-4">
        <div className="space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#1a73e8]/10 border border-[#1a73e8]/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7 text-[#1a73e8]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to Blogger Auto</h1>
          <p className="text-sm text-gray-400">
            Create your first brand workspace to get started. Each workspace has its own brand context, writing style, and Blogger connection.
          </p>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 px-4 py-2 rounded-lg border border-red-800">{error}</p>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs text-gray-400 font-semibold mb-1.5">Brand / Publication Name</label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. Signal & Noise"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full flex items-center justify-center bg-[#1a73e8] hover:bg-[#155fc0] disabled:opacity-60 text-white font-semibold px-4 py-3 rounded-lg shadow-md transition-colors"
          >
            {creating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
            ) : (
              <>Create Workspace <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </button>
        </form>

        <p className="text-[11px] text-gray-600">
          You can add more brand workspaces later from the sidebar.
        </p>
      </div>
    </div>
  );
}
