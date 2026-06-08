"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, Sparkles, Loader2, Check, AlertCircle, Edit3, Send,
  ArrowLeft, Globe, Image as ImageIcon, Save, Trash2, Calendar,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

interface PostSection {
  heading: string;
  paragraphs: string[];
}

interface ImageMetaphor {
  section_index: number;
  scene_description: string;
  url?: string;
}

interface GeneratedPost {
  title: string;
  subtitle: string;
  sections: PostSection[];
  image_metaphors: ImageMetaphor[];
}

interface PostItem {
  id: string;
  title: string;
  subtitle: string;
  seriesId: string;
  seriesName: string;
  campaignName: string;
  status: string;
  createdAt: string;
  bloggerUrl: string | null;
  bloggerId: string | null;
  content: GeneratedPost | null;
}

interface CampaignOption { id: string; name: string; }
interface SeriesOption { id: string; name: string; campaignId: string; }
interface TemplateOption { id: string; name: string; description: string; }

function PostsPageInner() {
  const { activeWorkspaceId } = useWorkspace();
  const searchParams = useSearchParams();

  const [view, setView] = useState<"list" | "generator" | "editor">("list");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const [topic, setTopic] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [postInputContext, setPostInputContext] = useState("");
  const [generating, setGenerating] = useState(false);

  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedSubtitle, setEditedSubtitle] = useState("");
  const [editedSections, setEditedSections] = useState<PostSection[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadPosts = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/posts?workspaceId=${activeWorkspaceId}`);
      const json = await res.json();
      if (json.success) setPosts(json.data);
    } catch { /* ignore */ } finally {
      setLoadingPosts(false);
    }
  }, [activeWorkspaceId]);

  const loadCampaigns = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/campaigns?workspaceId=${activeWorkspaceId}`);
      const json = await res.json();
      if (json.success) setCampaigns(json.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* ignore */ }
  }, [activeWorkspaceId]);

  const loadTemplates = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch(`/api/templates?workspaceId=${activeWorkspaceId}&type=POST`);
      const json = await res.json();
      if (json.success) setTemplates(json.data.map((t: { id: string; name: string; description: string }) => ({ id: t.id, name: t.name, description: t.description })));
    } catch { /* ignore */ }
  }, [activeWorkspaceId]);

  // Load series whenever selected campaign changes
  useEffect(() => {
    if (!selectedCampaignId) { setSeriesOptions([]); setSelectedSeriesId(""); return; }
    setLoadingSeries(true);
    setSelectedSeriesId("");
    fetch(`/api/series?campaignId=${selectedCampaignId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const list: SeriesOption[] = json.data.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name, campaignId: selectedCampaignId }));
          setSeriesOptions(list);
          if (list.length > 0) setSelectedSeriesId(list[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSeries(false));
  }, [selectedCampaignId]);

  // Handle URL params: ?seriesId=... or legacy ?campaignId=...
  useEffect(() => {
    const preSeriesId = searchParams.get("seriesId");
    if (preSeriesId && activeWorkspaceId) {
      fetch(`/api/series?id=${preSeriesId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setSelectedCampaignId(json.data.campaignId);
            setSelectedSeriesId(preSeriesId);
            setView("generator");
          }
        })
        .catch(() => {});
    }
  }, [searchParams, activeWorkspaceId]);

  useEffect(() => {
    loadPosts();
    loadCampaigns();
    loadTemplates();
  }, [loadPosts, loadCampaigns, loadTemplates]);

  // Auto-select first campaign when campaigns load (and no URL param already selected)
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId && !searchParams.get("seriesId")) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId, searchParams]);

  const showSuccess = (msg: string) => {
    setGlobalSuccess(msg);
    setTimeout(() => setGlobalSuccess(null), 4000);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !activeWorkspaceId || !selectedSeriesId) return;
    setGenerating(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/generate/test?workspaceId=${activeWorkspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, postInputContext, seriesId: selectedSeriesId, templateId: selectedTemplateId || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Generation failed");

      const generated: GeneratedPost = data.generated_post;
      const series = seriesOptions.find((s) => s.id === selectedSeriesId);
      const campaign = campaigns.find((c) => c.id === selectedCampaignId);

      const newPost: PostItem = {
        id: data.post_id ?? `local-${Date.now()}`,
        title: generated.title,
        subtitle: generated.subtitle,
        seriesId: selectedSeriesId,
        seriesName: series?.name ?? "",
        campaignName: campaign?.name ?? "",
        status: "DRAFT",
        createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        bloggerUrl: data.blogger_post?.url ?? null,
        bloggerId: data.blogger_post?.id ?? null,
        content: generated,
      };

      setPosts((prev) => [newPost, ...prev]);
      loadIntoEditor(newPost);
      showSuccess("Post generated and saved.");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const loadIntoEditor = (post: PostItem) => {
    setEditingPost(post);
    setEditedTitle(post.title);
    setEditedSubtitle(post.subtitle);
    const sections = post.content?.sections
      ? JSON.parse(JSON.stringify(post.content.sections))
      : [{ heading: "Opening Section", paragraphs: ["Start writing here…"] }];
    setEditedSections(sections);
    setView("editor");
    setGlobalError(null);
  };

  const handleSectionHeadingChange = (index: number, val: string) => {
    setEditedSections((prev) => prev.map((s, i) => (i === index ? { ...s, heading: val } : s)));
  };

  const handleParagraphChange = (secIndex: number, paraIndex: number, val: string) => {
    setEditedSections((prev) =>
      prev.map((s, i) =>
        i === secIndex ? { ...s, paragraphs: s.paragraphs.map((p, j) => (j === paraIndex ? val : p)) } : s
      )
    );
  };

  const handleAddParagraph = (secIndex: number) => {
    setEditedSections((prev) =>
      prev.map((s, i) => (i === secIndex ? { ...s, paragraphs: [...s.paragraphs, ""] } : s))
    );
  };

  const handleAddSection = () => {
    setEditedSections((prev) => [...prev, { heading: "New Section", paragraphs: [""] }]);
  };

  const handleSave = async () => {
    if (!editingPost) return;
    setSaving(true);
    setGlobalError(null);
    const updatedContent = editingPost.content
      ? { ...editingPost.content, title: editedTitle, subtitle: editedSubtitle, sections: editedSections }
      : null;

    if (!editingPost.id.startsWith("local-")) {
      try {
        const res = await fetch(`/api/posts?id=${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: editedTitle, subtitle: editedSubtitle, content: updatedContent }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Save failed");
        const updated = { ...editingPost, title: editedTitle, subtitle: editedSubtitle, content: updatedContent };
        setEditingPost(updated);
        setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
        showSuccess("Changes saved.");
      } catch (err) {
        setGlobalError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!activeWorkspaceId || !selectedSeriesId) { setSaving(false); return; }
    try {
      const res = await fetch(`/api/posts?workspaceId=${activeWorkspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesId: editingPost.seriesId || selectedSeriesId,
          title: editedTitle,
          subtitle: editedSubtitle,
          content: updatedContent,
          status: "DRAFT",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      const created = { ...editingPost, id: json.data.id, title: editedTitle, subtitle: editedSubtitle, content: updatedContent };
      setEditingPost(created);
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? created : p)));
      showSuccess("Post saved to database.");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!editingPost || !activeWorkspaceId) return;
    setPublishing(true);
    setGlobalError(null);
    const postPayload = {
      ...(editingPost.content ?? {}),
      title: editedTitle,
      subtitle: editedSubtitle,
      sections: editedSections,
    };
    try {
      const res = await fetch(`/api/publish?workspaceId=${activeWorkspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: postPayload, isDraft: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Publish failed");

      const bloggerUrl = data.blogger_post?.url ?? null;
      const bloggerId = data.blogger_post?.id ?? null;

      if (!editingPost.id.startsWith("local-")) {
        await fetch(`/api/posts?id=${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "PUBLISHED", bloggerUrl, bloggerId }),
        });
      }

      const updated = { ...editingPost, status: "PUBLISHED", bloggerUrl, bloggerId };
      setEditingPost(updated);
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
      showSuccess("Published to Blogger drafts.");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const handleSchedule = async () => {
    if (!editingPost || !scheduleAt) return;
    const scheduledDate = new Date(scheduleAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      setGlobalError("Schedule date must be in the future.");
      return;
    }
    setScheduling(true);
    setGlobalError(null);
    try {
      if (!editingPost.id.startsWith("local-")) {
        const res = await fetch(`/api/posts?id=${editingPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SCHEDULED", publishedAt: scheduledDate.toISOString() }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Schedule failed");
      }
      const updated = { ...editingPost, status: "SCHEDULED" };
      setEditingPost(updated);
      setPosts((prev) => prev.map((p) => (p.id === editingPost.id ? updated : p)));
      setScheduleAt("");
      showSuccess(`Post scheduled for ${scheduledDate.toLocaleString()}.`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Schedule failed");
    } finally {
      setScheduling(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    if (!id.startsWith("local-")) {
      await fetch(`/api/posts?id=${id}`, { method: "DELETE" }).catch(() => {});
    }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const statusBadge = (s: string) => s === "PUBLISHED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : s === "SCHEDULED" ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20";
  const statusLabel = (s: string) => s === "PUBLISHED" ? "Published" : s === "SCHEDULED" ? "Scheduled" : "Draft";

  return (
    <div className="space-y-6">
      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white">Blog Article Hub</h1>
              <p className="text-xs text-gray-400">Generate, edit, and publish posts to your Google Blogger draft queue.</p>
            </div>
            <button
              onClick={() => { setView("generator"); setGlobalError(null); }}
              disabled={!activeWorkspaceId}
              className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4 mr-1.5" />New AI Post
            </button>
          </div>

          {globalSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center">
              <Check className="w-4 h-4 mr-2" />{globalSuccess}
            </div>
          )}

          {loadingPosts ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading posts…
            </div>
          ) : (
            <div className="bg-[var(--bg-surface)] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[var(--bg-deep)]">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title / Series</span>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-6">Status</span>
              </div>
              {posts.length === 0 ? (
                <p className="text-xs text-gray-500 py-10 text-center">No posts yet. Click &ldquo;New AI Post&rdquo; to generate one.</p>
              ) : (
                <div className="divide-y divide-gray-800">
                  {posts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-[var(--bg-elevated)] transition-colors flex items-center justify-between">
                      <div className="space-y-0.5 truncate pr-4">
                        <p className="text-sm font-semibold text-gray-200 truncate max-w-xl">{post.title}</p>
                        <div className="flex items-center text-[10px] text-gray-500 space-x-2">
                          <span className="font-semibold text-gray-400">{post.campaignName}</span>
                          <span>›</span>
                          <span className="text-gray-500">{post.seriesName}</span>
                          <span>·</span>
                          <span>{post.createdAt}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${statusBadge(post.status)}`}>
                          {statusLabel(post.status)}
                        </span>
                        <button onClick={() => loadIntoEditor(post)} className="p-1.5 rounded bg-gray-800 hover:bg-[var(--accent)] text-gray-400 hover:text-white transition-colors" title="Open Editor">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {post.bloggerUrl && (
                          <a href={post.bloggerUrl} target="_blank" rel="noreferrer" className="p-1.5 rounded bg-gray-800 hover:bg-[#9c27b0] text-gray-400 hover:text-white transition-colors">
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
          )}
        </div>
      )}

      {/* GENERATOR PANEL */}
      {view === "generator" && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center space-x-2">
            <button onClick={() => setView("list")} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-white">Generate AI Blog Post</h1>
          </div>

          <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 shadow-lg">
            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Campaign picker */}
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Campaign</label>
                {campaigns.length === 0 ? (
                  <p className="text-xs text-amber-400">No campaigns yet — create one in the Campaigns tab first.</p>
                ) : (
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                  >
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {/* Series picker */}
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Series</label>
                {!selectedCampaignId ? (
                  <p className="text-xs text-gray-500">Select a campaign first.</p>
                ) : loadingSeries ? (
                  <div className="flex items-center text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Loading series…</div>
                ) : seriesOptions.length === 0 ? (
                  <p className="text-xs text-amber-400">No series in this campaign yet — <a href={`/dashboard/campaigns/${selectedCampaignId}`} className="underline">create one</a>.</p>
                ) : (
                  <select
                    value={selectedSeriesId}
                    onChange={(e) => setSelectedSeriesId(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                  >
                    {seriesOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>

              {/* Template picker */}
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Post Template <span className="font-normal text-gray-500">(optional)</span></label>
                {templates.length === 0 ? (
                  <p className="text-xs text-gray-500">No templates yet — <a href="/dashboard/templates" className="text-[var(--accent)] hover:underline">create one</a> to control structure and formatting.</p>
                ) : (
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                  >
                    <option value="">— No template (use workspace defaults) —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.description ? ` — ${t.description}` : ""}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Topic / Title Prompt *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google's AI Bet Is Bigger Than Search: What Marketers Keep Missing"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 flex items-center justify-between">
                  <span>Additional Context (Optional)</span>
                  <span className="text-[10px] text-gray-500 font-normal">{postInputContext.length}/2000</span>
                </label>
                <textarea
                  rows={4}
                  maxLength={2000}
                  placeholder="Paste industry announcements, stats, or notes you want woven into the article…"
                  value={postInputContext}
                  onChange={(e) => setPostInputContext(e.target.value)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--accent)] text-white leading-relaxed resize-none"
                />
              </div>

              {globalError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />{globalError}
                </div>
              )}

              <div className="flex space-x-2 pt-2 justify-end">
                <button type="button" onClick={() => setView("list")} className="px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={generating || !selectedSeriesId}
                  className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
                >
                  {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating… (30–60s)</> : <><Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />Generate Post</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLOCK EDITOR */}
      {view === "editor" && editingPost && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button onClick={() => setView("list")} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Block Editor</h1>
                <p className="text-[10px] text-gray-500">{editingPost.campaignName} › {editingPost.seriesName}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {globalSuccess && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />{globalSuccess}
                </span>
              )}
              <button onClick={handleSave} disabled={saving} className="flex items-center bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-gray-700 disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Save
              </button>
              <button onClick={handlePublish} disabled={publishing} className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-colors">
                {publishing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}Publish Draft
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 rounded-lg bg-[var(--bg-surface)] border border-gray-800">
            <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">Schedule publish:</span>
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
            <button onClick={handleSchedule} disabled={scheduling || !scheduleAt} className="flex items-center bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
              {scheduling ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Calendar className="w-3 h-3 mr-1" />}Set Schedule
            </button>
            {editingPost.status === "SCHEDULED" && (
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 whitespace-nowrap">Scheduled</span>
            )}
          </div>

          {globalError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />{globalError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Post Title</label>
                  <input type="text" value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[var(--accent)]" />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Subtitle / Tagline</label>
                  <input type="text" value={editedSubtitle} onChange={(e) => setEditedSubtitle(e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent)]" />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content Blocks</h3>
                {editedSections.map((section, secIndex) => (
                  <div key={secIndex} className="p-5 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Section Heading {secIndex + 1}</label>
                      <input type="text" value={section.heading} onChange={(e) => handleSectionHeadingChange(secIndex, e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[var(--accent)]" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold">Paragraphs</label>
                      {section.paragraphs.map((para, paraIndex) => (
                        <textarea key={paraIndex} rows={3} value={para} onChange={(e) => handleParagraphChange(secIndex, paraIndex, e.target.value)} className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[var(--accent)] leading-relaxed resize-none" />
                      ))}
                    </div>
                    <div className="flex justify-end pt-1">
                      <button onClick={() => handleAddParagraph(secIndex)} className="text-[10px] text-[var(--accent)] hover:text-[var(--accent-hover)] font-semibold flex items-center transition-colors">
                        <Plus className="w-3 h-3 mr-1" /> Add Paragraph
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleAddSection} className="w-full py-3 rounded-xl border border-dashed border-gray-800 hover:border-gray-600 bg-[var(--bg-surface)]/30 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-xs font-semibold">
                <Plus className="w-4 h-4 mr-1.5" /> Add Section
              </button>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Image Metaphors</h3>
              {editingPost.content?.image_metaphors?.length ? (
                editingPost.content.image_metaphors.map((meta, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-300 flex items-center"><ImageIcon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />Metaphor {i + 1}</span>
                      <span className="text-[10px] text-gray-500">After §{meta.section_index}</span>
                    </div>
                    {meta.url ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-800 aspect-video">
                        <img src={meta.url} alt="AI illustration" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-800 bg-[var(--bg-overlay)] py-8 text-center text-gray-500 text-xs flex flex-col items-center space-y-1">
                        <ImageIcon className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="font-semibold text-gray-400">No image generated</span>
                      </div>
                    )}
                    <div className="p-2.5 rounded bg-[var(--bg-overlay)] border border-gray-800 text-[10px] text-gray-400 leading-normal italic">
                      <strong>Scene: </strong>{meta.scene_description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-gray-800 text-center text-gray-500 text-xs py-8">No visual assets.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PostsPage() {
  return (
    <Suspense>
      <PostsPageInner />
    </Suspense>
  );
}
