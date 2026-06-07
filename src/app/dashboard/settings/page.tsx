"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Save, BookOpen, User, Check, Loader2, Link as LinkIcon } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";

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
  const { activeWorkspaceId, activeWorkspace, reload } = useWorkspace();
  const [fetchLoading, setFetchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [brandName, setBrandName] = useState("");
  const [bloggerBlogId, setBloggerBlogId] = useState("");
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [brandContext, setBrandContext] = useState(DEFAULT_BRAND_CONTEXT);
  const [blogTemplate, setBlogTemplate] = useState(DEFAULT_BLOG_TEMPLATE);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    setSaving(true);
    setSuccess(false);
    setError("");
    try {
      const body: Record<string, string> = {
        name: brandName,
        brandContext,
        blogTemplate,
        bloggerBlogId,
      };
      if (customGeminiKey) body.customGeminiKey = customGeminiKey;

      const res = await fetch(`/api/workspace?workspaceId=${activeWorkspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to save");
      setSuccess(true);
      setCustomGeminiKey("");
      await reload();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!activeWorkspaceId) return;
    window.location.href = `/api/auth/google/signin?workspaceId=${activeWorkspaceId}`;
  };

  if (!activeWorkspaceId) {
    return (
      <div className="text-sm text-gray-500 py-12 text-center">
        No workspace selected. Create one using the switcher in the sidebar.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Brand Context & Editorial Templates</h1>
          <p className="text-xs text-gray-400">
            Configure the audience parameters and writing briefs the AI uses when generating posts for this workspace.
          </p>
        </div>

        {success && (
          <span className="flex items-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Saved successfully!
          </span>
        )}
      </div>

      {fetchLoading && (
        <div className="flex items-center text-gray-500 text-sm py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading settings…
        </div>
      )}

      {!fetchLoading && error && (
        <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{error}</div>
      )}

      {!fetchLoading && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Brand Meta */}
          <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <User className="w-4 h-4 mr-2 text-[#1a73e8]" />
              Brand Profile
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Brand / Workspace Name</label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Blogger Blog ID</label>
                <input
                  type="text"
                  placeholder="e.g. 5387823041396511011"
                  value={bloggerBlogId}
                  onChange={(e) => setBloggerBlogId(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white font-mono"
                />
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
                <button
                  type="button"
                  onClick={handleConnectGoogle}
                  className={`flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    hasGoogleToken
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                      : "bg-[#1a73e8] text-white hover:bg-[#155fc0]"
                  }`}
                >
                  {hasGoogleToken ? (
                    <><Check className="w-3.5 h-3.5 mr-1.5" />Connected — Re-authorize</>
                  ) : (
                    <><LinkIcon className="w-3.5 h-3.5 mr-1.5" />Connect Google Account</>
                  )}
                </button>
              </div>
            </div>

            {/* Custom Gemini Key */}
            <div className="pt-4 border-t border-gray-800/50">
              <label className="block text-xs text-gray-400 font-semibold mb-1">
                Custom Gemini API Key (Google AI Studio)
                {activeWorkspace?.hasCustomGeminiKey && (
                  <span className="ml-2 text-emerald-400">(saved — enter new key to update)</span>
                )}
              </label>
              <input
                type="password"
                placeholder={activeWorkspace?.hasCustomGeminiKey ? "••••••••••••••••" : "Paste your AIzaSy… key"}
                value={customGeminiKey}
                onChange={(e) => setCustomGeminiKey(e.target.value)}
                className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1a73e8] text-white font-mono"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Leaving this empty keeps the existing key. Set to a space to clear it.
              </p>
            </div>
          </div>

          {/* Brand Context */}
          <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              Custom Brand Context
            </h2>
            <p className="text-xs text-gray-400">
              Describe your brand, target audience, and differentiators. Injected into every AI generation prompt.
            </p>
            <textarea
              rows={4}
              required
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white font-mono leading-relaxed"
            />
          </div>

          {/* Writing brief */}
          <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
              <BookOpen className="w-4 h-4 mr-2 text-[#9c27b0]" />
              Writing Template & Anti-Slop Rules
            </h2>
            <p className="text-xs text-gray-400">
              Exact instructions the AI follows when generating posts — voice, banned vocabulary, rhythm rules. This replaces BLOG_BRIEF.md.
            </p>
            <textarea
              rows={14}
              required
              value={blogTemplate}
              onChange={(e) => setBlogTemplate(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg p-4 text-sm focus:outline-none focus:border-[#1a73e8] text-white font-mono leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Save Guidelines & Templates</>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
