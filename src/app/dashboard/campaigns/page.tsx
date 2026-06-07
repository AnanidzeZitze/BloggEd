"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FolderKanban, Plus, Calendar, Trash2, Loader2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

interface CampaignItem {
  id: string;
  name: string;
  description: string;
  campaignContext: string;
  postsCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignContext, setCampaignContext] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadCampaigns = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingList(true);
    setListError("");
    try {
      const res = await fetch(`/api/campaigns?workspaceId=${activeWorkspaceId}`);
      const json = await res.json();
      if (json.success) setCampaigns(json.data);
      else setListError(json.error ?? "Failed to load campaigns");
    } catch {
      setListError("Network error");
    } finally {
      setLoadingList(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`/api/campaigns?workspaceId=${activeWorkspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), campaignContext: campaignContext.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create");
      setCampaigns((prev) => [json.data, ...prev]);
      setName(""); setDescription(""); setCampaignContext("");
      setShowModal(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error creating campaign");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this campaign and all its posts?")) return;
    try {
      const res = await fetch(`/api/campaigns?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silently ignore — list still shows the item
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Campaign Series Manager</h1>
          <p className="text-xs text-gray-400">
            Organize blog posts into thematic series. Campaign context is injected into the AI writer for each post.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!activeWorkspaceId}
          className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Series
        </button>
      </div>

      {loadingList && (
        <div className="flex items-center text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading campaigns…
        </div>
      )}

      {!loadingList && listError && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{listError}</div>
      )}

      {!loadingList && !listError && campaigns.length === 0 && (
        <div className="text-sm text-gray-500 py-12 text-center">
          No campaigns yet. Click &ldquo;Create Series&rdquo; to get started.
        </div>
      )}

      {/* Campaigns Grid */}
      {!loadingList && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div key={camp.id} className="p-5 rounded-xl bg-[#0d1324] border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#1a73e8]/10 text-[#1a73e8] flex items-center justify-center">
                    <FolderKanban className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-gray-500 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {camp.createdAt}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white leading-snug">{camp.name}</h3>
                {camp.description && (
                  <p className="text-xs text-gray-400 line-clamp-2">{camp.description}</p>
                )}

                {camp.campaignContext && (
                  <div className="p-2 rounded bg-[#11192e] border border-gray-800 text-[10px] text-gray-400 leading-relaxed italic line-clamp-3">
                    <strong className="not-italic text-gray-300">Context: </strong>{camp.campaignContext}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400">
                  {camp.postsCount} post{camp.postsCount !== 1 ? "s" : ""}
                </span>

                <button
                  onClick={() => handleDelete(camp.id)}
                  title="Delete Series"
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#11192e] border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
              <FolderKanban className="w-5 h-5 text-[#1a73e8] mr-2" />
              Create Blog Series
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              The campaign context is injected into every AI generation request for posts in this series.
            </p>
            {createError && (
              <p className="text-xs text-red-400 mb-3 bg-red-900/20 px-3 py-2 rounded-md">{createError}</p>
            )}
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Series Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Honest MarTech Audit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="e.g. Tool-by-tool honest assessment of what works vs. hype."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Strategic Goal Context</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Focus on evaluating HubSpot, Salesforce. Highlight when to buy vs. when to move on."
                  value={campaignContext}
                  onChange={(e) => setCampaignContext(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1a73e8] text-white resize-none"
                />
              </div>

              <div className="flex space-x-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setCreateError(""); }}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-xs hover:bg-[#155fc0] transition-colors font-semibold disabled:opacity-60 flex items-center"
                >
                  {creating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
