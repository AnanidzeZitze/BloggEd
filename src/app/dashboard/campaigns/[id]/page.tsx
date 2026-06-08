"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Check, Plus, Tag,
  Upload, Download, Layers, ArrowRight, Trash2, Sparkles,
} from "lucide-react";
import { readFileText, isJsonFile, parseCampaignMd, parseCampaignJson } from "@/lib/file-parsers";
import { CAMPAIGN_GUIDE_TEMPLATE, downloadGuideTemplate } from "@/lib/guide-templates";
import { useWorkspace } from "@/lib/workspace-context";

interface CampaignDetail {
  id: string;
  name: string;
  description: string;
  campaignContext: string;
  keywordCluster: string;
  seriesCount: number;
  createdAt: string;
}

interface SeriesItem {
  id: string;
  name: string;
  description: string;
  seriesContext: string;
  keywordCluster: string;
  postsCount: number;
  createdAt: string;
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignContext, setCampaignContext] = useState("");
  const [keywordCluster, setKeywordCluster] = useState("");

  const campaignFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  // New series form
  const [showNewSeries, setShowNewSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspaceId || !id) return;
    setLoading(true);
    try {
      const [campRes, seriesRes] = await Promise.all([
        fetch(`/api/campaigns?workspaceId=${activeWorkspaceId}&id=${id}`),
        fetch(`/api/series?campaignId=${id}`),
      ]);
      const campJson = await campRes.json();
      const seriesJson = await seriesRes.json();

      if (!campJson.success) { setError("Campaign not found."); return; }
      const c: CampaignDetail = campJson.data;
      setCampaign(c);
      setName(c.name);
      setDescription(c.description);
      setCampaignContext(c.campaignContext);
      setKeywordCluster(c.keywordCluster);

      if (seriesJson.success) setSeriesList(seriesJson.data);
    } catch {
      setError("Failed to load campaign.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/campaigns?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, campaignContext, keywordCluster }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      setCampaign((prev) => prev ? { ...prev, name, description, campaignContext, keywordCluster } : prev);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSeries = async () => {
    if (!newSeriesName.trim() || !activeWorkspaceId) return;
    setCreatingNew(true);
    try {
      const res = await fetch(`/api/series?campaignId=${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to create series");
      setSeriesList((prev) => [...prev, json.data]);
      setNewSeriesName("");
      setShowNewSeries(false);
      router.push(`/dashboard/campaigns/${id}/series/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create series");
    } finally {
      setCreatingNew(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!confirm("Delete this series and all its posts?")) return;
    await fetch(`/api/series?id=${seriesId}`, { method: "DELETE" }).catch(() => {});
    setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
  };

  async function handleCampaignFileImport(file: File) {
    setImportError("");
    try {
      const text = await readFileText(file);
      const parsed = isJsonFile(file) ? parseCampaignJson(text) : parseCampaignMd(text);
      if (!parsed) { setImportError("Could not parse file."); return; }
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.campaignContext) setCampaignContext(parsed.campaignContext);
      if (parsed.keywordCluster) setKeywordCluster(parsed.keywordCluster);
    } catch {
      setImportError("Failed to read file.");
    }
    if (campaignFileRef.current) campaignFileRef.current.value = "";
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading campaign…
    </div>
  );

  if (error && !campaign) return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4 mr-1.5" />Back
      </button>
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/campaigns" className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{campaign?.name}</h1>
            <p className="text-xs text-gray-500">{seriesList.length} series · Created {campaign?.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="flex items-center text-xs text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5 mr-1" />Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Changes</>}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: campaign settings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />Campaign Settings
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadGuideTemplate("campaign-brief-template.md", CAMPAIGN_GUIDE_TEMPLATE)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                  title="Download guide template"
                >
                  <Download className="w-2.5 h-2.5" /> Template
                </button>
                <button
                  type="button"
                  onClick={() => campaignFileRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                >
                  <Upload className="w-2.5 h-2.5" /> Import
                </button>
                <input
                  ref={campaignFileRef}
                  type="file"
                  accept=".md,.txt,.docx,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCampaignFileImport(f); }}
                />
              </div>
            </div>

            {importError && <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-800">{importError}</p>}

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Campaign Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line description of this campaign"
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">
                Campaign Context
                <span className="ml-1 font-normal text-gray-500">— injected into every AI prompt in this campaign</span>
              </label>
              <textarea rows={5} value={campaignContext} onChange={(e) => setCampaignContext(e.target.value)}
                placeholder="e.g. This campaign targets CMOs evaluating AI tools. Focus on real ROI data and avoid vendor marketing language."
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1 flex items-center">
                <Tag className="w-3 h-3 mr-1" />Keyword Cluster
                <span className="ml-1 font-normal text-gray-500">— campaign-wide SEO focus</span>
              </label>
              <textarea rows={3} value={keywordCluster} onChange={(e) => setKeywordCluster(e.target.value)}
                placeholder="e.g. AI marketing tools, marketing automation ROI, B2B marketing stack 2025"
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
            </div>
          </div>
        </div>

        {/* Right: series list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Series</h2>
            <button
              onClick={() => setShowNewSeries(true)}
              className="flex items-center text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />New Series
            </button>
          </div>

          {/* Inline new-series form */}
          {showNewSeries && (
            <div className="bg-[var(--bg-surface)] border border-[var(--accent)]/30 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-300">New Series</p>
              <input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateSeries()}
                placeholder="Series name…"
                autoFocus
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateSeries}
                  disabled={!newSeriesName.trim() || creatingNew}
                  className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {creatingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create & Open"}
                </button>
                <button onClick={() => { setShowNewSeries(false); setNewSeriesName(""); }} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-surface)] border border-gray-800 rounded-xl overflow-hidden">
            {seriesList.length === 0 && !showNewSeries ? (
              <div className="py-12 text-center text-xs text-gray-500">
                No series yet.{" "}
                <button onClick={() => setShowNewSeries(true)} className="text-[var(--accent)] font-semibold hover:underline">
                  Create the first one →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {seriesList.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors group">
                    <div className="min-w-0 pr-4 flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] shrink-0">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-200 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {s.postsCount ?? 0} post{(s.postsCount ?? 0) !== 1 ? "s" : ""} · {s.createdAt}
                        </p>
                        {s.description && <p className="text-[10px] text-gray-600 mt-0.5 truncate">{s.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeleteSeries(s.id)}
                        className="p-1.5 rounded bg-transparent hover:bg-red-500/20 text-transparent group-hover:text-gray-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/dashboard/campaigns/${id}/series/${s.id}`}
                        className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 hover:bg-[var(--accent)] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Open <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
