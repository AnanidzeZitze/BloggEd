"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Save, Loader2, Check, Edit3, Globe,
  Trash2, Plus, Tag, Upload, Download, Layers,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { readFileText, isJsonFile, parseCampaignMd, parseCampaignJson } from "@/lib/file-parsers";
import { CAMPAIGN_GUIDE_TEMPLATE, downloadGuideTemplate } from "@/lib/guide-templates";

interface SeriesDetail {
  id: string;
  campaignId: string;
  name: string;
  description: string;
  seriesContext: string;
  keywordCluster: string;
  templateId: string | null;
}

interface PostItem {
  id: string;
  title: string;
  status: string;
  bloggerUrl: string | null;
  createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  SCHEDULED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  DRAFT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function SeriesDetailPage() {
  const { id: campaignId, seriesId } = useParams<{ id: string; seriesId: string }>();
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspace();

  const [series, setSeries] = useState<SeriesDetail | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [seriesContext, setSeriesContext] = useState("");
  const [keywordCluster, setKeywordCluster] = useState("");

  const seriesFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  const load = useCallback(async () => {
    if (!activeWorkspaceId || !seriesId) return;
    setLoading(true);
    try {
      const [sRes, pRes] = await Promise.all([
        fetch(`/api/series?id=${seriesId}`),
        fetch(`/api/posts?workspaceId=${activeWorkspaceId}&seriesId=${seriesId}`),
      ]);
      const sJson = await sRes.json();
      const pJson = await pRes.json();

      if (!sJson.success) { setError("Series not found."); return; }
      const s: SeriesDetail = sJson.data;
      setSeries(s);
      setName(s.name);
      setDescription(s.description);
      setSeriesContext(s.seriesContext);
      setKeywordCluster(s.keywordCluster);

      if (pJson.success) setPosts(pJson.data);
    } catch {
      setError("Failed to load series.");
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, seriesId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!seriesId) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/series?id=${seriesId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, seriesContext, keywordCluster }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      setSeries((prev) => prev ? { ...prev, name, description, seriesContext, keywordCluster } : prev);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  async function handleSeriesFileImport(file: File) {
    setImportError("");
    try {
      const text = await readFileText(file);
      const parsed = isJsonFile(file) ? parseCampaignJson(text) : parseCampaignMd(text);
      if (!parsed) { setImportError("Could not parse file."); return; }
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.campaignContext) setSeriesContext(parsed.campaignContext);
      if (parsed.keywordCluster) setKeywordCluster(parsed.keywordCluster);
    } catch {
      setImportError("Failed to read file.");
    }
    if (seriesFileRef.current) seriesFileRef.current.value = "";
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/posts?id=${postId}`, { method: "DELETE" }).catch(() => {});
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-500 text-sm">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading series…
    </div>
  );

  if (error && !series) return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center text-sm text-gray-400 hover:text-white">
        <ArrowLeft className="w-4 h-4 mr-1.5" />Back
      </button>
      <p className="text-sm text-red-400">{error}</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb + header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}`}
            className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{series?.name}</h1>
            <p className="text-xs text-gray-500">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="flex items-center text-xs text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5 mr-1" />Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save</>}
          </button>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Series settings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">
                <Layers className="w-3.5 h-3.5 mr-1.5 text-[var(--accent)]" />Series Settings
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => downloadGuideTemplate("series-brief-template.md", CAMPAIGN_GUIDE_TEMPLATE)}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                  title="Download guide template"
                >
                  <Download className="w-2.5 h-2.5" /> Template
                </button>
                <button
                  type="button"
                  onClick={() => seriesFileRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2 py-1 rounded transition-colors"
                >
                  <Upload className="w-2.5 h-2.5" /> Import
                </button>
                <input
                  ref={seriesFileRef}
                  type="file"
                  accept=".md,.txt,.docx,.json"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSeriesFileImport(f); }}
                />
              </div>
            </div>

            {importError && <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-800">{importError}</p>}

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Series Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="One-line description"
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">
                Series Context
                <span className="ml-1 font-normal text-gray-500">— injected into every AI prompt for this series</span>
              </label>
              <textarea rows={5} value={seriesContext} onChange={(e) => setSeriesContext(e.target.value)}
                placeholder="What is this series trying to accomplish? Who specifically is it for? What should readers be able to do after reading it?"
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
            </div>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1 flex items-center">
                <Tag className="w-3 h-3 mr-1" />Keyword Cluster
              </label>
              <textarea rows={3} value={keywordCluster} onChange={(e) => setKeywordCluster(e.target.value)}
                placeholder="Target SEO keywords and topics for this series"
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Posts in This Series</h2>
            <Link
              href={`/dashboard/posts?seriesId=${seriesId}`}
              className="flex items-center text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />Generate New Post
            </Link>
          </div>

          <div className="bg-[var(--bg-surface)] border border-gray-800 rounded-xl overflow-hidden">
            {posts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                No posts yet.{" "}
                <Link href={`/dashboard/posts?seriesId=${seriesId}`} className="text-[var(--accent)] font-semibold hover:underline">
                  Generate the first one →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {posts.map((post) => (
                  <div key={post.id} className="px-4 py-3 flex items-center justify-between hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-semibold text-gray-200 truncate">{post.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{post.createdAt}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${STATUS_STYLE[post.status] ?? STATUS_STYLE.DRAFT}`}>
                        {post.status.charAt(0) + post.status.slice(1).toLowerCase()}
                      </span>
                      <Link href="/dashboard/posts" className="p-1.5 rounded bg-gray-800 hover:bg-[var(--accent)] text-gray-400 hover:text-white transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </Link>
                      {post.bloggerUrl && (
                        <a href={post.bloggerUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded bg-gray-800 hover:bg-purple-600 text-gray-400 hover:text-white transition-colors">
                          <Globe className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 rounded bg-gray-800 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
