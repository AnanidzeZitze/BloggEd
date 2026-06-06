"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Save, BookOpen, User, Check, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [brandName, setBrandName] = useState("Signal & Noise");
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [brandContext, setBrandContext] = useState(
    "Target Audience: CMOs, Senior Marketers, Growth Leaders, Analytics Directors.\n" +
    "Tone of Voice: Skeptical of hype, practitioner-focused, slightly contrarian, authoritative but humble, willing to criticize industry vendors when necessary.\n" +
    "Niche: B2B and B2C marketing operations, first-party data strategies, and AI integration systems."
  );
  const [blogTemplate, setBlogTemplate] = useState("");

  // Seed default template on mount
  useEffect(() => {
    setBlogTemplate(
      "## Voice and Tone\n" +
      "- Authoritative but not arrogant.\n" +
      "- Practitioner-first. Every post should be useful to someone who has to make a real decision this quarter. No pure theory.\n" +
      "- Slightly contrarian. The best posts push back on something the industry has accepted uncritically.\n\n" +
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
      "- No trailing 'ensuring' clauses."
    );
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    // Simulate API call to save settings
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    setSuccess(true);
    
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center">
            Brand Context & Editorial Templates
          </h1>
          <p className="text-xs text-gray-400">
            Configure the default guidelines, audience parameters, and writing briefs that the AI uses as references when generating new blog posts.
          </p>
        </div>
        
        {success && (
          <span className="flex items-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Settings saved successfully!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand Meta */}
        <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <User className="w-4 h-4 mr-2 text-[#1a73e8]" />
            Brand Profile
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Brand/Workspace Name</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Workspace ID (Google Blogger Sync)</label>
              <input
                type="text"
                disabled
                value="5387823041396511011"
                className="w-full bg-[#0a0d18] border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800/50 mt-4">
            <label className="block text-xs text-gray-400 font-semibold mb-1">
              Custom Gemini API Key (Google AI Studio)
            </label>
            <input
              type="password"
              placeholder="Paste your private AIzaSy... key to use your own Google Cloud API quota"
              value={customGeminiKey}
              onChange={(e) => setCustomGeminiKey(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1a73e8] text-white font-mono"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Leaving this empty falls back to the system&apos;s master API key.
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
            Describe your brand, target audience, specific category, and core differentiators. This information is injected into the AI&apos;s prompt for deep, relevant industry targeting.
          </p>
          <div>
            <textarea
              rows={4}
              required
              value={brandContext}
              onChange={(e) => setBrandContext(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Writing brief */}
        <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-[#9c27b0]" />
            Writing Template & Anti-Slop Rules
          </h2>
          <p className="text-xs text-gray-400">
            Input the exact instructions the AI should follow when generating posts (e.g., formatting styles, banned vocabulary list, and rhythm rules). Pre-seeded with your <strong>Signal & Noise</strong> rules.
          </p>
          <div>
            <textarea
              rows={12}
              required
              value={blogTemplate}
              onChange={(e) => setBlogTemplate(e.target.value)}
              className="w-full bg-[#161f38] border border-gray-700 rounded-lg p-4 text-sm focus:outline-none focus:border-[#1a73e8] text-white font-mono leading-relaxed"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] disabled:bg-[#1a73e8]/50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving Settings...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Guidelines & Templates
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
