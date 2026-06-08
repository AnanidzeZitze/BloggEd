"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Sparkles, Save, BookOpen, User, Check, Loader2, Link as LinkIcon, Sun, Moon, Eye, EyeOff, Upload, Download } from "lucide-react";
import { useTheme } from "next-themes";
import { useWorkspace } from "@/lib/workspace-context";
import { readFileText, isJsonFile, parseWorkspaceMd, parseWorkspaceJson } from "@/lib/file-parsers";
import { WORKSPACE_GUIDE_TEMPLATE, downloadGuideTemplate } from "@/lib/guide-templates";

const DEFAULT_BRAND_CONTEXT =
  "Target Audience: CMOs, Senior Marketers, Growth Leaders, Analytics Directors.\n" +
  "Tone of Voice: Skeptical of hype, practitioner-focused, slightly contrarian, authoritative but humble.\n" +
  "Niche: B2B and B2C marketing operations, first-party data strategies, and AI integration systems.";

const DEFAULT_BLOG_TEMPLATE =
  "## Voice and Tone\n" +
  "- Authoritative but not arrogant.\n" +
  "- Practitioner-first. Every post should be useful to someone making a real decision this quarter.\n" +
  "- Slightly contrarian. Push back on something the industry has accepted uncritically.\n\n" +
  "## Banned Words (Delete on Sight)\n" +
  "- delve -> explore, examine, dig into\n" +
  "- leverage -> use\n" +
  "- utilize -> use\n" +
  "- robust -> strong, reliable, solid\n" +
  "- seamless -> smooth\n" +
  "- cutting-edge -> modern, latest\n\n" +
  "## Rules\n" +
  "- No Em Dashes (—) ever. Use commas, colons, or periods.\n" +
  "- Vary paragraph lengths (mix 1-sentence paragraphs with longer ones).\n" +
  "- No rhetorical questions followed by a direct answer.\n" +
  "- No trailing 'ensuring' clauses.";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { activeWorkspaceId, activeWorkspace, reload } = useWorkspace();

  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState("");

  // Brand Profile section state
  const [brandName, setBrandName] = useState("");
  const [bloggerBlogId, setBloggerBlogId] = useState("");
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [hasGoogleToken, setHasGoogleToken] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Visibility toggles
  const [showBlogId, setShowBlogId] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Writing sections state
  const [brandContext, setBrandContext] = useState(DEFAULT_BRAND_CONTEXT);
  const [blogTemplate, setBlogTemplate] = useState(DEFAULT_BLOG_TEMPLATE);
  const [savingWriting, setSavingWriting] = useState(false);
  const [writingSuccess, setWritingSuccess] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setFetchLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/workspace?workspaceId=${activeWorkspaceId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load settings");
      const ws = json.workspace;
      setBrandName(ws.name ?? "");
      setBloggerBlogId(ws.bloggerBlogId ?? "");
      setBrandContext(ws.brandContext ?? DEFAULT_BRAND_CONTEXT);
      setBlogTemplate(ws.blogTemplate ?? DEFAULT_BLOG_TEMPLATE);
      setHasGoogleToken(!!ws.hasGoogleToken);
      setCustomGeminiKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setFetchLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSaveProfile = async () => {
    if (!activeWorkspaceId) return;
    setSavingProfile(true);
    setProfileSuccess(false);
    setError("");
    try {
      const body: Record<string, string> = { name: brandName, bloggerBlogId };
      if (customGeminiKey) body.customGeminiKey = customGeminiKey;

      const res = await fetch(`/api/workspace?workspaceId=${activeWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      setProfileSuccess(true);
      setCustomGeminiKey("");
      await reload();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveWriting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    setSavingWriting(true);
    setWritingSuccess(false);
    setError("");
    try {
      const res = await fetch(`/api/workspace?workspaceId=${activeWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandContext, blogTemplate }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      setWritingSuccess(true);
      await reload();
      setTimeout(() => setWritingSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save writing guidelines");
    } finally {
      setSavingWriting(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!activeWorkspaceId) return;
    window.location.href = `/api/auth/google/signin?workspaceId=${activeWorkspaceId}`;
  };

  const handleDisconnectGoogle = async () => {
    if (!activeWorkspaceId) return;
    try {
      const res = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: activeWorkspaceId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to disconnect");
      setHasGoogleToken(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Google account");
    }
  };

  const workspaceFileRef = useRef<HTMLInputElement>(null);
  const brandContextFileRef = useRef<HTMLInputElement>(null);
  const blogTemplateFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  async function handleWorkspaceFileImport(file: File) {
    setImportError("");
    try {
      const text = await readFileText(file);
      const parsed = isJsonFile(file) ? parseWorkspaceJson(text) : parseWorkspaceMd(text);
      if (!parsed) { setImportError("Could not parse file. Check the format and try again."); return; }
      if (parsed.name) setBrandName(parsed.name);
      if (parsed.brandContext) setBrandContext(parsed.brandContext);
      if (parsed.blogTemplate) setBlogTemplate(parsed.blogTemplate);
    } catch {
      setImportError("Failed to read file.");
    }
    if (workspaceFileRef.current) workspaceFileRef.current.value = "";
  }

  async function importFieldFile(ref: React.RefObject<HTMLInputElement | null>, setter: (v: string) => void) {
    const file = ref.current?.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      setter(text);
    } catch { /* ignore */ }
    if (ref.current) ref.current.value = "";
  }

  if (!activeWorkspaceId) {
    return (
      <div className="text-sm text-gray-500 py-12 text-center">
        No workspace selected. Create one using the switcher in the sidebar.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Brand Context & Editorial Templates</h1>
          <p className="text-xs text-gray-400">
            Configure the audience parameters and writing briefs the AI uses when generating posts for this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => downloadGuideTemplate("brand-guide-template.md", WORKSPACE_GUIDE_TEMPLATE)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 bg-[var(--bg-surface)] px-3 py-2 rounded-lg transition-colors"
            title="Download a pre-filled guide template to edit offline"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button
            type="button"
            onClick={() => workspaceFileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 bg-[var(--bg-surface)] px-3 py-2 rounded-lg transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import guide
          </button>
          <input
            ref={workspaceFileRef}
            type="file"
            accept=".md,.txt,.docx,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleWorkspaceFileImport(f); }}
          />
        </div>
      </div>
      {importError && (
        <div className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded-lg border border-red-800">{importError}</div>
      )}

      {fetchLoading && (
        <div className="flex items-center text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
        </div>
      )}

      {!fetchLoading && error && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{error}</div>
      )}

      {/* Appearance */}
      <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center">
          {theme === "dark"
            ? <Moon className="w-4 h-4 mr-2 text-[var(--accent)]" />
            : <Sun className="w-4 h-4 mr-2 text-[var(--accent)]" />}
          Appearance
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              theme === "light"
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-[var(--bg-elevated)] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
            }`}
          >
            <Sun className="w-4 h-4" /> Light
          </button>
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              theme === "dark"
                ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                : "bg-[var(--bg-elevated)] border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
            }`}
          >
            <Moon className="w-4 h-4" /> Dark
          </button>
        </div>
      </div>

      {!fetchLoading && (
        <>
          {/* Brand Profile — its own save */}
          <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <User className="w-4 h-4 mr-2 text-[var(--accent)]" />
              Brand Profile
            </h2>

            {/* Workspace name */}
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Brand / Workspace Name</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Blogger Blog ID with show/hide */}
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Blogger Blog ID</label>
                <div className="relative">
                  <input
                    type={showBlogId ? "text" : "password"}
                    placeholder="e.g. 5387823041396511011"
                    value={bloggerBlogId}
                    onChange={(e) => setBloggerBlogId(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:border-[var(--accent)] text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBlogId((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showBlogId ? "Hide Blog ID" : "Show Blog ID"}
                  >
                    {showBlogId ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Gemini API Key with show/hide */}
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">
                  Gemini API Key (Google AI Studio)
                  {activeWorkspace?.hasCustomGeminiKey && (
                    <span className="ml-2 text-emerald-400">(saved — enter new key to update)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showGeminiKey ? "text" : "password"}
                    placeholder={activeWorkspace?.hasCustomGeminiKey ? "••••••••••••••••" : "Paste your AIzaSy… key"}
                    value={customGeminiKey}
                    onChange={(e) => setCustomGeminiKey(e.target.value)}
                    className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 pr-9 text-xs focus:outline-none focus:border-[var(--accent)] text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showGeminiKey ? "Hide API key" : "Show API key"}
                  >
                    {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">
                  Leave empty to keep the existing key. Set to a space to clear it.
                </p>
              </div>
            </div>

            {/* Google OAuth connection */}
            <div className="pt-4 border-t border-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-semibold">Google Blogger Connection</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {hasGoogleToken ? "Your Google account is connected." : "Connect to publish directly to Blogger."}
                  </p>
                </div>
                {hasGoogleToken ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    >
                      <Check className="w-3.5 h-3.5 mr-1.5" />
                      Re-authorize
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGoogle}
                      className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectGoogle}
                    className="flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
                  >
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>

            {/* Profile save */}
            <div className="pt-4 border-t border-gray-800/50 flex items-center justify-end gap-3">
              {profileSuccess && (
                <span className="flex items-center text-xs text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5 mr-1" /> Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-colors"
              >
                {savingProfile
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</>
                  : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Profile</>}
              </button>
            </div>
          </div>

          {/* Writing sections */}
          <form onSubmit={handleSaveWriting} className="space-y-6">
            {/* Brand Context */}
            <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                  Custom Brand Context
                </h2>
                <button
                  type="button"
                  onClick={() => brandContextFileRef.current?.click()}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Upload className="w-3 h-3" /> Import .md
                </button>
                <input ref={brandContextFileRef} type="file" accept=".md,.txt,.docx" className="hidden"
                  onChange={() => importFieldFile(brandContextFileRef, setBrandContext)} />
              </div>
              <p className="text-xs text-gray-400">
                Describe your brand, target audience, and differentiators. Injected into every AI generation prompt.
              </p>
              <textarea
                rows={4}
                required
                value={brandContext}
                onChange={(e) => setBrandContext(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] text-white font-mono leading-relaxed"
              />
            </div>

            {/* Writing brief */}
            <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                  <BookOpen className="w-4 h-4 mr-2 text-[#9c27b0]" />
                  Writing Template & Anti-Slop Rules
                </h2>
                <button
                  type="button"
                  onClick={() => blogTemplateFileRef.current?.click()}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Upload className="w-3 h-3" /> Import .md
                </button>
                <input ref={blogTemplateFileRef} type="file" accept=".md,.txt,.docx" className="hidden"
                  onChange={() => importFieldFile(blogTemplateFileRef, setBlogTemplate)} />
              </div>
              <p className="text-xs text-gray-400">
                Exact instructions the AI follows when generating posts — voice, banned vocabulary, rhythm rules.
              </p>
              <textarea
                rows={14}
                required
                value={blogTemplate}
                onChange={(e) => setBlogTemplate(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg p-4 text-sm focus:outline-none focus:border-[var(--accent)] text-white font-mono leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              {writingSuccess && (
                <span className="flex items-center text-xs text-emerald-400 font-semibold">
                  <Check className="w-3.5 h-3.5 mr-1" /> Saved
                </span>
              )}
              <button
                type="submit"
                disabled={savingWriting}
                className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
              >
                {savingWriting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                  : <><Save className="w-4 h-4 mr-2" />Save Guidelines & Templates</>}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
