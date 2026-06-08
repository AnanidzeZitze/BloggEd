"use client";

import React, { useEffect, useState } from "react";
import {
  FolderKanban,
  FileEdit,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useWorkspace } from "@/lib/workspace-context";

interface RecentPost {
  id: string;
  title: string;
  campaign: string;
  status: string;
  date: string;
  bloggerUrl: string | null;
}

interface CampaignProgress {
  id: string;
  name: string;
  seriesCount: number;
}

interface DashboardStats {
  activeCampaigns: number;
  draftPosts: number;
  publishedPosts: number;
  scheduledPosts: number;
  recentPosts: RecentPost[];
  campaignProgress: CampaignProgress[];
}

const CAMPAIGN_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-rose-500",
];

export default function DashboardPage() {
  const { activeWorkspaceId, loading: wsLoading } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    setError("");
    fetch(`/api/dashboard/stats?workspaceId=${activeWorkspaceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.data);
        else setError(json.error ?? "Failed to load stats");
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [activeWorkspaceId]);

  const statCards = stats
    ? [
        { name: "Active Campaigns", value: String(stats.activeCampaigns), icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10" },
        { name: "Draft Posts", value: String(stats.draftPosts), icon: FileEdit, color: "text-amber-500", bg: "bg-amber-500/10" },
        { name: "Published Posts", value: String(stats.publishedPosts), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
        { name: "Scheduled Queue", value: String(stats.scheduledPosts), icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
      ]
    : [];

  const isLoading = wsLoading || loading;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--bg-elevated)] to-[var(--bg-base)] border border-gray-800 flex items-center justify-between shadow-lg">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-white flex items-center">
            Welcome back to the Cockpit!
            <Sparkles className="w-5 h-5 text-amber-400 ml-2 animate-pulse" />
          </h1>
          <p className="text-xs text-gray-400 max-w-xl">
            Monitor your campaigns, track post performance, and generate new content — all from here.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading workspace data…</span>
        </div>
      )}

      {!isLoading && error && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">
          {error}
        </div>
      )}

      {!isLoading && !error && !stats && !activeWorkspaceId && (
        <div className="text-sm text-gray-500 py-8 text-center">
          No workspace selected. Create one using the switcher in the sidebar.
        </div>
      )}

      {!isLoading && stats && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.name} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-gray-800 flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">{stat.name}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mr-1 shadow-inner`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main split dashboard view */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 cols: Recent Posts */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Blog Operations</h2>
                <Link href="/dashboard/posts" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center font-semibold transition-colors">
                  View All Posts
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>

              <div className="bg-[var(--bg-surface)] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
                {stats.recentPosts.length === 0 ? (
                  <p className="text-xs text-gray-500 p-6 text-center">No posts yet. Generate your first post.</p>
                ) : (
                  <div className="divide-y divide-gray-800">
                    {stats.recentPosts.map((post) => (
                      <div key={post.id} className="p-4 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between">
                        <div className="space-y-1 truncate pr-4">
                          <p className="text-xs font-semibold text-gray-200 truncate">{post.title}</p>
                          <div className="flex items-center text-[10px] text-gray-500 space-x-2">
                            <span>{post.campaign}</span>
                            <span>•</span>
                            <span>{post.date}</span>
                          </div>
                        </div>
                        <div>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                            post.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : post.status === "SCHEDULED"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}>
                            {post.status === "PUBLISHED" ? "Published" : post.status === "SCHEDULED" ? "Scheduled" : "Draft"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 col: Campaign Progress */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Campaign Trackers</h2>
                <Link href="/dashboard/campaigns" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] flex items-center font-semibold transition-colors">
                  Manage
                </Link>
              </div>

              <div className="p-4 bg-[var(--bg-surface)] border border-gray-800 rounded-xl space-y-4 shadow-sm">
                {stats.campaignProgress.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-2">No campaigns yet.</p>
                ) : (
                  stats.campaignProgress.map((camp, i) => (
                    <div key={camp.id} className="flex items-center justify-between text-xs py-1">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 mr-2 ${CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length]}`} />
                      <span className="font-semibold text-gray-300 truncate flex-1">{camp.name}</span>
                      <span className="text-gray-500 text-[10px] ml-2">{camp.seriesCount} series</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
