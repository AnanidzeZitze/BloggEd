"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  FileText,
  LayoutTemplate,
  ChevronsUpDown,
  Plus,
  Globe,
  Sparkles,
  Loader2,
  LogOut,
} from "lucide-react";
import { WorkspaceProvider, useWorkspace } from "@/lib/workspace-context";
import { FirstWorkspace } from "@/components/onboarding/FirstWorkspace";

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { workspaces, activeWorkspaceId, activeWorkspace, setActiveWorkspaceId, reload, loading } = useWorkspace();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: FolderKanban },
    { name: "Blog Posts", href: "/dashboard/posts", icon: FileText },
    { name: "Post Templates", href: "/dashboard/templates", icon: LayoutTemplate },
    { name: "Brand Context & Template", href: "/dashboard/settings", icon: Settings },
  ];

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBrandName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError("");
    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create workspace");
      await reload();
      setActiveWorkspaceId(json.data.id);
      setNewBrandName("");
      setShowAddBrandModal(false);
      router.push("/dashboard/settings");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error creating workspace");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--bg-base)] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-surface)] border-r border-gray-800 flex flex-col z-10 overflow-hidden">
        {/* Logo */}
        <div className="px-4 pt-4 pb-2">
          <Image src="/BloggEd_Logo.png" alt="BloggEd" height={32} width={107} className="h-8 w-auto" priority />
        </div>
        {/* Brand Switcher */}
        <div className="p-4 border-b border-gray-800 relative">
          <button
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            disabled={loading}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors border border-gray-700 disabled:opacity-60"
          >
            <div className="flex items-center text-left">
              <div className="w-8 h-8 rounded-md bg-[var(--accent)] flex items-center justify-center mr-2 shadow-md">
                {loading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Sparkles className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className="text-sm font-semibold truncate w-36">
                  {activeWorkspace?.name ?? (loading ? "Loading…" : "No workspace")}
                </p>
                <p className="text-xs text-gray-400 truncate w-36">
                  {activeWorkspace ? (activeWorkspace.hasGoogleToken ? "Google connected" : "Google not connected") : ""}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-gray-400" />
          </button>

          {isSwitcherOpen && (
            <div className="absolute top-16 left-4 right-4 bg-[var(--bg-overlay)] border border-gray-700 rounded-lg shadow-xl z-20 p-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold p-2">Switch Workspace</p>
              {workspaces.length === 0 && (
                <p className="text-xs text-gray-500 p-2">No workspaces yet.</p>
              )}
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    setIsSwitcherOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-[var(--bg-highlight)] transition-colors flex items-center justify-between text-xs ${
                    activeWorkspaceId === ws.id ? "bg-[var(--bg-elevated)] text-white font-semibold" : "text-gray-300"
                  }`}
                >
                  <span>{ws.name}</span>
                  {activeWorkspaceId === ws.id && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </button>
              ))}
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowAddBrandModal(true);
                    setIsSwitcherOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-md text-xs text-[var(--accent)] hover:bg-[var(--bg-highlight)] transition-colors flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add New Brand
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--accent)] text-white font-semibold shadow-md shadow-[var(--accent)]/20"
                    : "text-gray-400 hover:text-white hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-[var(--bg-deep)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <UserButton />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate w-28">
                  {user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User"}
                </p>
                <p className="text-[10px] text-gray-400 truncate w-28">
                  {user?.primaryEmailAddress?.emailAddress || ""}
                </p>
              </div>
            </div>
            <Link href="/dashboard/settings" title="Workspace Settings">
              <Settings className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
            </Link>
          </div>
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full flex items-center justify-center space-x-2 text-xs text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-md py-1.5 px-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[var(--bg-surface)] border-b border-gray-800 flex items-center justify-between px-6 z-0">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Globe className="w-4 h-4 text-gray-500" />
            <span>Workspace:</span>
            <span className="font-semibold text-gray-200">{activeWorkspace?.name ?? "—"}</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard/posts"
              className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Generate Post
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {!loading && workspaces.length === 0 ? <FirstWorkspace /> : children}
        </main>
      </div>

      {/* Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-overlay)] border border-gray-700 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-5 h-5 text-[var(--accent)] mr-2" />
              Configure New Brand
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Workspaces isolate brand rules, style templates, and publishing configs.
            </p>
            {createError && (
              <p className="text-xs text-red-400 mb-3 bg-red-900/20 px-3 py-2 rounded-md">{createError}</p>
            )}
            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                />
              </div>
              <div className="flex space-x-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowAddBrandModal(false); setCreateError(""); }}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs hover:bg-[var(--accent-hover)] transition-colors font-semibold disabled:opacity-60 flex items-center"
                >
                  {creating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Create Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <DashboardShell>{children}</DashboardShell>
    </WorkspaceProvider>
  );
}
