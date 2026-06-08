"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Plus, FileText, ArrowLeft, Save, Trash2, Loader2, Check, Copy, Upload, Download } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { readFileText, isJsonFile, parseTemplateMd, parseTemplateJson } from "@/lib/file-parsers";
import { POST_TEMPLATE_GUIDE, downloadGuideTemplate } from "@/lib/guide-templates";
import {
  PostRecipe, HtmlStyleConfig,
  DEFAULT_POST_RECIPE, DEFAULT_HTML_STYLE,
  OPENING_HOOK_OPTIONS, CLOSING_STYLE_OPTIONS,
  DEPTH_OPTIONS, PERSPECTIVE_OPTIONS,
  WORD_COUNT_PRESETS, FONT_OPTIONS,
  OpeningHook, ClosingStyle, AudienceDepth, Perspective,
} from "@/lib/post-recipe";

interface TemplateItem {
  id: string;
  name: string;
  description: string;
  proseBrief: string;
  postRecipe: PostRecipe | null;
  htmlStyleConfig: HtmlStyleConfig | null;
  createdAt: string;
}

type Tab = "basics" | "recipe" | "formatting" | "json";

const BLANK_FORM = {
  name: "",
  description: "",
  proseBrief: "",
  recipe: DEFAULT_POST_RECIPE as PostRecipe,
  style: DEFAULT_HTML_STYLE as HtmlStyleConfig,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${checked ? "bg-[var(--accent)]" : "bg-gray-700"}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${checked ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"}`} />
    </button>
  );
}

function RecipeSummary({ recipe }: { recipe: PostRecipe | null }) {
  if (!recipe) return <span className="text-gray-600 text-[10px]">No recipe set</span>;
  const tags: string[] = [];
  if (recipe.structure?.targetWordCount) tags.push(`${recipe.structure.targetWordCount}w`);
  if (recipe.content?.requireHotTake) tags.push("Hot take");
  if (recipe.content?.requireDataPoints) tags.push("Data req.");
  if (recipe.structure?.allowBulletLists === false) tags.push("No lists");
  if (recipe.structure?.includeTldr) tags.push("TL;DR");
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.map((t) => (
        <span key={t} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">{t}</span>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [view, setView] = useState<"list" | "edit">("list");
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("basics");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [copied, setCopied] = useState(false);

  const templateFileRef = useRef<HTMLInputElement>(null);
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState("");

  async function handleTemplateFileImport(file: File) {
    setImportError("");
    try {
      const text = await readFileText(file);
      const parsed = isJsonFile(file) ? parseTemplateJson(text) : parseTemplateMd(text);
      if (!parsed) { setImportError("Could not parse file. Check the format and try again."); return; }
      if (parsed.name) setName(parsed.name);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.proseBrief) setProseBrief(parsed.proseBrief);
      if (parsed.postRecipe) setRecipe(parsed.postRecipe as Parameters<typeof setRecipe>[0]);
      if (parsed.htmlStyleConfig) setStyle(parsed.htmlStyleConfig as Parameters<typeof setStyle>[0]);
      // Sync JSON tab so it reflects the imported state
      const jsonObj: Record<string, unknown> = {};
      if (parsed.postRecipe) jsonObj.postRecipe = parsed.postRecipe;
      if (parsed.htmlStyleConfig) jsonObj.htmlStyleConfig = parsed.htmlStyleConfig;
      if (Object.keys(jsonObj).length) setJsonText(JSON.stringify(jsonObj, null, 2));
      setJsonError("");
      setTab("basics");
    } catch {
      setImportError("Failed to read file.");
    }
    if (templateFileRef.current) templateFileRef.current.value = "";
  }

  async function importJsonFileToEditor() {
    const file = jsonFileRef.current?.files?.[0];
    if (!file) return;
    try {
      const text = await readFileText(file);
      setJsonText(text);
      setJsonError("");
    } catch { /* ignore */ }
    if (jsonFileRef.current) jsonFileRef.current.value = "";
  }

  function exportJson() {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase() || "template"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [proseBrief, setProseBrief] = useState("");
  const [recipe, setRecipe] = useState<PostRecipe>(DEFAULT_POST_RECIPE);
  const [style, setStyle] = useState<HtmlStyleConfig>(DEFAULT_HTML_STYLE);

  const loadTemplates = useCallback(async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?workspaceId=${activeWorkspaceId}`);
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [activeWorkspaceId]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  function openNew() {
    setEditingId(null);
    setName(BLANK_FORM.name);
    setDescription(BLANK_FORM.description);
    setProseBrief(BLANK_FORM.proseBrief);
    setRecipe({ ...DEFAULT_POST_RECIPE });
    setStyle({ ...DEFAULT_HTML_STYLE });
    setTab("basics");
    setError("");
    setView("edit");
  }

  function openEdit(t: TemplateItem) {
    setEditingId(t.id);
    setName(t.name);
    setDescription(t.description);
    setProseBrief(t.proseBrief);
    setRecipe(t.postRecipe ?? { ...DEFAULT_POST_RECIPE });
    setStyle(t.htmlStyleConfig ?? { ...DEFAULT_HTML_STYLE });
    setTab("basics");
    setError("");
    setView("edit");
  }

  function setS<K extends keyof NonNullable<PostRecipe["structure"]>>(key: K, val: NonNullable<PostRecipe["structure"]>[K]) {
    setRecipe((prev) => ({ ...prev, structure: { ...prev.structure, [key]: val } }));
  }
  function setC<K extends keyof NonNullable<PostRecipe["content"]>>(key: K, val: NonNullable<PostRecipe["content"]>[K]) {
    setRecipe((prev) => ({ ...prev, content: { ...prev.content, [key]: val } }));
  }
  function setV<K extends keyof NonNullable<PostRecipe["voice"]>>(key: K, val: NonNullable<PostRecipe["voice"]>[K]) {
    setRecipe((prev) => ({ ...prev, voice: { ...prev.voice, [key]: val } }));
  }

  function syncJsonFromState() {
    setJsonText(JSON.stringify({ postRecipe: recipe, htmlStyleConfig: style }, null, 2));
    setJsonError("");
  }

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText);
      if (parsed.postRecipe) setRecipe(parsed.postRecipe);
      if (parsed.htmlStyleConfig) setStyle(parsed.htmlStyleConfig);
      setJsonError("");
    } catch {
      setJsonError("Invalid JSON — fix syntax and try again.");
    }
  }

  async function handleSave() {
    if (!name.trim() || !activeWorkspaceId) return;
    setSaving(true);
    setError("");
    const body = { name, description, proseBrief, postRecipe: recipe, htmlStyleConfig: style };
    try {
      const url = editingId
        ? `/api/templates?id=${editingId}`
        : `/api/templates?workspaceId=${activeWorkspaceId}`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      await loadTemplates();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (!editingId) setEditingId(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template? Posts that used it won't be affected.")) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      if (editingId === id) setView("list");
    } catch { /* ignore */ }
  }

  const s = recipe.structure ?? {};
  const c = recipe.content ?? {};
  const v = recipe.voice ?? {};

  if (view === "edit") return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")} className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold text-white">{editingId ? "Edit Template" : "New Template"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveSuccess && <span className="flex items-center text-xs text-emerald-400 font-semibold"><Check className="w-3.5 h-3.5 mr-1" />Saved</span>}
          <button
            type="button"
            onClick={() => downloadGuideTemplate("post-template-guide.md", POST_TEMPLATE_GUIDE)}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors"
            title="Download guide template to fill out offline"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button
            type="button"
            onClick={() => templateFileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors"
            title="Import from .md, .docx, or .json file"
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
          <input
            ref={templateFileRef}
            type="file"
            accept=".md,.txt,.docx,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleTemplateFileImport(f); }}
          />
          {editingId && (
            <button onClick={() => handleDelete(editingId)} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleSave} disabled={saving || !name.trim()} className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
            {saving ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5 mr-1.5" />Save Template</>}
          </button>
        </div>
      </div>

      {importError && <div className="text-xs text-amber-400 bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-800">{importError}</div>}
      {error && <div className="text-sm text-red-400 bg-red-900/20 px-4 py-3 rounded-lg border border-red-800">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-deep)] p-1 rounded-lg w-fit">
        {(["basics", "recipe", "formatting", "json"] as Tab[]).map((t) => (
          <button key={t} onClick={() => { setTab(t); if (t === "json") syncJsonFromState(); }}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${tab === t ? "bg-[var(--bg-surface)] text-white shadow" : "text-gray-400 hover:text-white"}`}>
            {t === "json" ? "Raw JSON" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* BASICS TAB */}
      {tab === "basics" && (
        <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-1">Template Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Opinion / Hot Take" className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Strong contrarian takes, 1200 words, data-backed" className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 font-semibold mb-1">
              Prose Brief
              <span className="ml-2 font-normal text-gray-500">— additional writing instructions (stacks on top of workspace writing guide)</span>
            </label>
            <textarea rows={8} value={proseBrief} onChange={(e) => setProseBrief(e.target.value)}
              placeholder={"e.g.\n- Every argument needs a specific counter-argument against the mainstream view.\n- Name at least one real company or executive.\n- Do not hedge. If the take is strong, commit to it."}
              className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
          </div>
        </div>
      )}

      {/* RECIPE TAB */}
      {tab === "recipe" && (
        <div className="space-y-4">
          {/* Structure */}
          <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Structure</h3>

            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-2">Target Word Count</label>
              <div className="flex flex-wrap gap-2">
                {WORD_COUNT_PRESETS.map((wc) => (
                  <button key={wc} type="button" onClick={() => setS("targetWordCount", wc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${s.targetWordCount === wc ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "bg-[var(--bg-elevated)] border-gray-700 text-gray-400 hover:text-white"}`}>
                    {wc >= 2000 ? "2000+" : wc}w
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Custom:</span>
                  <input type="number" min={200} max={5000} step={100} value={s.targetWordCount ?? ""}
                    onChange={(e) => setS("targetWordCount", parseInt(e.target.value) || undefined)}
                    className="w-20 bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent)]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Min Sections</label>
                <input type="number" min={1} max={20} value={s.sectionCountMin ?? 4}
                  onChange={(e) => setS("sectionCountMin", parseInt(e.target.value))}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Max Sections</label>
                <input type="number" min={1} max={20} value={s.sectionCountMax ?? 6}
                  onChange={(e) => setS("sectionCountMax", parseInt(e.target.value))}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Opening Hook</label>
                <select value={s.openingHook ?? "contrarian_claim"} onChange={(e) => setS("openingHook", e.target.value as OpeningHook)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                  {OPENING_HOOK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Closing Style</label>
                <select value={s.closingStyle ?? "soft_cta"} onChange={(e) => setS("closingStyle", e.target.value as ClosingStyle)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                  {CLOSING_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {([
                ["includeTldr", "Include TL;DR at top"],
                ["includeFaq", "Include FAQ at end"],
                ["allowBulletLists", "Allow bullet lists"],
                ["allowNumberedLists", "Allow numbered lists"],
              ] as [keyof NonNullable<PostRecipe["structure"]>, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <Toggle checked={!!(s as Record<string, unknown>)[key]} onChange={(v) => setS(key, v)} />
                  <span className="text-xs text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content Requirements</h3>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Toggle checked={!!c.requireDataPoints} onChange={(v) => setC("requireDataPoints", v)} />
                <span className="text-xs text-gray-300 flex-1">Require data points / statistics</span>
                {c.requireDataPoints && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Min:</span>
                    <input type="number" min={1} max={10} value={c.dataPointCount ?? 2}
                      onChange={(e) => setC("dataPointCount", parseInt(e.target.value))}
                      className="w-14 bg-[var(--bg-elevated)] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent)]" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={!!c.requireHotTake} onChange={(v) => setC("requireHotTake", v)} />
                <span className="text-xs text-gray-300 flex-1">Require a hot take</span>
                {c.requireHotTake && (
                  <select value={c.hotTakeStrength ?? "strong"} onChange={(e) => setC("hotTakeStrength", e.target.value as "mild" | "moderate" | "strong")}
                    className="bg-[var(--bg-elevated)] border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--accent)]">
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="strong">Strong</option>
                  </select>
                )}
              </div>
              {([
                ["requireRealExamples", "Real-world examples only (no hypotheticals)"],
                ["requireAnalogies", "Must include a memorable analogy"],
                ["includePullQuote", "Include a pull quote callout"],
              ] as [keyof NonNullable<PostRecipe["content"]>, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <Toggle checked={!!(c as Record<string, unknown>)[key]} onChange={(val) => setC(key, val)} />
                  <span className="text-xs text-gray-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Voice */}
          <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Voice</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Audience Depth</label>
                <select value={v.depth ?? "practitioner"} onChange={(e) => setV("depth", e.target.value as AudienceDepth)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                  {DEPTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Perspective</label>
                <select value={v.perspective ?? "first_person_plural"} onChange={(e) => setV("perspective", e.target.value as Perspective)}
                  className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                  {PERSPECTIVE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORMATTING TAB */}
      {tab === "formatting" && (
        <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-5">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">HTML Output Formatting</h3>
          <p className="text-xs text-gray-500">Controls the visual style of the compiled HTML sent to Blogger. No effect on the AI-generated content.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Heading Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={style.headingColor ?? "#1a3c5e"} onChange={(e) => setStyle((prev) => ({ ...prev, headingColor: e.target.value }))}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={style.headingColor ?? "#1a3c5e"} onChange={(e) => setStyle((prev) => ({ ...prev, headingColor: e.target.value }))}
                  className="flex-1 bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Accent / Border Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={style.accentColor ?? "#f97316"} onChange={(e) => setStyle((prev) => ({ ...prev, accentColor: e.target.value }))}
                  className="h-9 w-12 rounded cursor-pointer bg-transparent border-0" />
                <input type="text" value={style.accentColor ?? "#f97316"} onChange={(e) => setStyle((prev) => ({ ...prev, accentColor: e.target.value }))}
                  className="flex-1 bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--accent)]" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Body Font</label>
              <select value={style.fontBody ?? "Georgia, serif"} onChange={(e) => setStyle((prev) => ({ ...prev, fontBody: e.target.value }))}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 font-semibold mb-1">Subtitle Style</label>
              <select value={style.subtitleStyle ?? "italic_bordered"} onChange={(e) => setStyle((prev) => ({ ...prev, subtitleStyle: e.target.value as "plain" | "italic_bordered" | "italic_only" }))}
                className="w-full bg-[var(--bg-elevated)] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--accent)]">
                <option value="italic_bordered">Italic with left border</option>
                <option value="italic_only">Italic only</option>
                <option value="plain">Plain</option>
              </select>
            </div>
          </div>
          <div className="mt-4 p-4 rounded-lg border border-gray-800 bg-[var(--bg-deep)]">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Preview</p>
            <div style={{ fontFamily: style.fontBody ?? "Georgia, serif" }}>
              <p style={{ color: style.headingColor ?? "#1a3c5e", fontWeight: "bold", fontSize: "1.1em", marginBottom: "0.5em" }}>Section Heading</p>
              {(style.subtitleStyle === "italic_bordered" || !style.subtitleStyle) && (
                <p style={{ fontStyle: "italic", borderLeft: `3px solid ${style.accentColor ?? "#f97316"}`, paddingLeft: "10px", color: "#888" }}>Subtitle / tagline text appears here</p>
              )}
              {style.subtitleStyle === "italic_only" && <p style={{ fontStyle: "italic", color: "#888" }}>Subtitle / tagline text appears here</p>}
              {style.subtitleStyle === "plain" && <p style={{ color: "#888" }}>Subtitle / tagline text appears here</p>}
            </div>
          </div>
        </div>
      )}

      {/* JSON TAB */}
      {tab === "json" && (
        <div className="p-6 rounded-xl bg-[var(--bg-surface)] border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Raw JSON</h3>
            <div className="flex gap-2">
              <button
                onClick={() => jsonFileRef.current?.click()}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
                title="Load JSON into editor (then Parse & Apply)"
              >
                <Upload className="w-3 h-3" /> Load
              </button>
              <input ref={jsonFileRef} type="file" accept=".json" className="hidden" onChange={importJsonFileToEditor} />
              <button
                onClick={exportJson}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500"
                title="Export JSON file"
              >
                <Download className="w-3 h-3" /> Export
              </button>
              <button onClick={() => { navigator.clipboard.writeText(jsonText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded border border-gray-700 hover:border-gray-500">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={applyJson} className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] px-2 py-1 rounded border border-[var(--accent)]/30 hover:border-[var(--accent)] transition-colors">
                Parse & Apply →
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-500">Edit raw JSON and click "Parse & Apply" to update all form fields. Structure: <code className="text-gray-400">{`{ "postRecipe": {...}, "htmlStyleConfig": {...} }`}</code></p>
          {jsonError && <p className="text-xs text-red-400 bg-red-900/20 px-3 py-2 rounded border border-red-800">{jsonError}</p>}
          <textarea rows={20} value={jsonText} onChange={(e) => setJsonText(e.target.value)} spellCheck={false}
            className="w-full bg-[var(--bg-deep)] border border-gray-700 rounded-lg p-4 text-xs text-gray-300 font-mono leading-relaxed focus:outline-none focus:border-[var(--accent)] resize-none" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white">Post Templates</h1>
          <p className="text-xs text-gray-400">Define reusable recipes for each post style. Select a template when generating a post to control structure, content requirements, and HTML formatting.</p>
        </div>
        <button onClick={openNew} disabled={!activeWorkspaceId} className="flex items-center bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors">
          <Plus className="w-4 h-4 mr-1.5" /> New Template
        </button>
      </div>

      {loading && <div className="flex items-center justify-center py-12 text-gray-500 text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading…</div>}

      {!loading && templates.length === 0 && (
        <div className="py-16 text-center space-y-3 border border-dashed border-gray-800 rounded-xl">
          <FileText className="w-8 h-8 text-gray-700 mx-auto" />
          <p className="text-sm font-semibold text-gray-400">No templates yet</p>
          <p className="text-xs text-gray-600 max-w-sm mx-auto">Create templates for different post styles — Opinion, How-To, Tool Review, Data Analysis — each with its own structure, content rules, and formatting.</p>
          <button onClick={openNew} className="mt-2 text-xs text-[var(--accent)] font-semibold hover:underline">Create your first template →</button>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="p-5 rounded-xl bg-[var(--bg-surface)] border border-gray-800 hover:border-gray-600 transition-all space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                  {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{t.description}</p>}
                </div>
              </div>
              <RecipeSummary recipe={t.postRecipe} />
              <div className="pt-3 border-t border-gray-800 flex gap-2">
                <button onClick={() => openEdit(t)} className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[var(--bg-elevated)] text-gray-300 hover:text-white hover:bg-[var(--bg-hover)] transition-colors">Edit</button>
                <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
