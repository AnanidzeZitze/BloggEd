export type OpeningHook = "contrarian_claim" | "surprising_stat" | "scene_setting" | "direct_assertion";
export type ClosingStyle = "soft_cta" | "hard_cta" | "open_question" | "none";
export type HotTakeStrength = "mild" | "moderate" | "strong";
export type AudienceDepth = "executive" | "practitioner" | "technical";
export type Perspective = "first_person" | "first_person_plural" | "second_person" | "third_person";
export type SubtitleStyle = "plain" | "italic_bordered" | "italic_only";

export interface PostRecipeStructure {
  targetWordCount?: number;
  sectionCountMin?: number;
  sectionCountMax?: number;
  openingHook?: OpeningHook;
  closingStyle?: ClosingStyle;
  includeTldr?: boolean;
  includeFaq?: boolean;
  allowBulletLists?: boolean;
  allowNumberedLists?: boolean;
}

export interface PostRecipeContent {
  requireDataPoints?: boolean;
  dataPointCount?: number;
  requireHotTake?: boolean;
  hotTakeStrength?: HotTakeStrength;
  requireRealExamples?: boolean;
  requireAnalogies?: boolean;
  includePullQuote?: boolean;
}

export interface PostRecipeVoice {
  depth?: AudienceDepth;
  perspective?: Perspective;
}

export interface PostRecipe {
  structure?: PostRecipeStructure;
  content?: PostRecipeContent;
  voice?: PostRecipeVoice;
}

export interface HtmlStyleConfig {
  headingColor?: string;
  accentColor?: string;
  fontBody?: string;
  subtitleStyle?: SubtitleStyle;
}

export const DEFAULT_POST_RECIPE: PostRecipe = {
  structure: {
    targetWordCount: 1200,
    sectionCountMin: 4,
    sectionCountMax: 6,
    openingHook: "contrarian_claim",
    closingStyle: "soft_cta",
    includeTldr: false,
    includeFaq: false,
    allowBulletLists: false,
    allowNumberedLists: false,
  },
  content: {
    requireDataPoints: true,
    dataPointCount: 2,
    requireHotTake: true,
    hotTakeStrength: "strong",
    requireRealExamples: true,
    requireAnalogies: false,
    includePullQuote: false,
  },
  voice: {
    depth: "practitioner",
    perspective: "first_person_plural",
  },
};

export const DEFAULT_HTML_STYLE: HtmlStyleConfig = {
  headingColor: "#1a3c5e",
  accentColor: "#f97316",
  fontBody: "Georgia, serif",
  subtitleStyle: "italic_bordered",
};

const OPENING_HOOK_LABELS: Record<OpeningHook, string> = {
  contrarian_claim: "Bold contrarian claim that challenges a common assumption",
  surprising_stat: "Surprising or counterintuitive statistic",
  scene_setting: "Specific, vivid scene that grounds the argument",
  direct_assertion: "Direct, unhedged assertion — no warm-up",
};

const CLOSING_STYLE_LABELS: Record<ClosingStyle, string> = {
  soft_cta: "Thought-provoking takeaway with a soft call to action",
  hard_cta: "Direct, explicit call to action",
  open_question: "Open question that leaves the reader reflecting",
  none: "Natural ending — no explicit call to action",
};

const DEPTH_LABELS: Record<AudienceDepth, string> = {
  executive: "C-suite / executive — strategic framing, avoid operational jargon",
  practitioner: "Senior practitioners — specific, actionable, no hand-waving",
  technical: "Technical audience — precise, use domain vocabulary",
};

const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  first_person: "I — singular first person",
  first_person_plural: "We — collective first person",
  second_person: "You — address the reader directly",
  third_person: "Third person",
};

export function compileRecipeToPrompt(recipe: PostRecipe, templateName?: string): string {
  const sections: string[] = [];

  if (templateName) sections.push(`POST TEMPLATE: ${templateName}`);

  const s = recipe.structure ?? {};
  const structLines: string[] = [];

  if (s.targetWordCount) structLines.push(`Target approximately ${s.targetWordCount} words`);
  if (s.sectionCountMin != null && s.sectionCountMax != null) {
    structLines.push(`Write ${s.sectionCountMin}–${s.sectionCountMax} sections`);
  }
  if (s.openingHook) structLines.push(`Open with: ${OPENING_HOOK_LABELS[s.openingHook]}`);
  if (s.closingStyle) structLines.push(`Close with: ${CLOSING_STYLE_LABELS[s.closingStyle]}`);
  if (s.includeTldr) structLines.push("Include a TL;DR summary before the first section");
  if (s.includeFaq) structLines.push("Include a FAQ section as the final section");
  if (s.allowBulletLists === false) structLines.push("No bullet lists — use prose");
  if (s.allowNumberedLists === false) structLines.push("No numbered lists — use prose");

  if (structLines.length > 0) {
    sections.push("STRUCTURE:\n" + structLines.map((l) => `- ${l}`).join("\n"));
  }

  const c = recipe.content ?? {};
  const contentLines: string[] = [];

  if (c.requireDataPoints && c.dataPointCount) {
    contentLines.push(`Include at least ${c.dataPointCount} specific data points or statistics, cited inline`);
  }
  if (c.requireHotTake) {
    const strength = c.hotTakeStrength ?? "strong";
    contentLines.push(`Include a ${strength} hot take — push back on something the industry accepts uncritically`);
  }
  if (c.requireRealExamples) contentLines.push("Use real-world examples, not hypotheticals");
  if (c.requireAnalogies) contentLines.push("Use at least one memorable analogy");
  if (c.includePullQuote) contentLines.push("Include one pull quote or key callout worth highlighting");

  if (contentLines.length > 0) {
    sections.push("CONTENT REQUIREMENTS:\n" + contentLines.map((l) => `- ${l}`).join("\n"));
  }

  const v = recipe.voice ?? {};
  const voiceLines: string[] = [];

  if (v.depth) voiceLines.push(`Write for: ${DEPTH_LABELS[v.depth]}`);
  if (v.perspective) voiceLines.push(PERSPECTIVE_LABELS[v.perspective]);

  if (voiceLines.length > 0) {
    sections.push("VOICE:\n" + voiceLines.map((l) => `- ${l}`).join("\n"));
  }

  return sections.join("\n\n").trim();
}

export const OPENING_HOOK_OPTIONS: { value: OpeningHook; label: string }[] = [
  { value: "contrarian_claim", label: "Contrarian claim" },
  { value: "surprising_stat", label: "Surprising statistic" },
  { value: "scene_setting", label: "Scene setting" },
  { value: "direct_assertion", label: "Direct assertion" },
];

export const CLOSING_STYLE_OPTIONS: { value: ClosingStyle; label: string }[] = [
  { value: "soft_cta", label: "Soft call to action" },
  { value: "hard_cta", label: "Hard call to action" },
  { value: "open_question", label: "Open question" },
  { value: "none", label: "No closing CTA" },
];

export const DEPTH_OPTIONS: { value: AudienceDepth; label: string }[] = [
  { value: "executive", label: "Executive / C-suite" },
  { value: "practitioner", label: "Senior practitioner" },
  { value: "technical", label: "Technical" },
];

export const PERSPECTIVE_OPTIONS: { value: Perspective; label: string }[] = [
  { value: "first_person_plural", label: "We (first person plural)" },
  { value: "first_person", label: "I (first person)" },
  { value: "second_person", label: "You (address the reader)" },
  { value: "third_person", label: "Third person" },
];

export const WORD_COUNT_PRESETS = [600, 800, 1000, 1200, 1500, 2000];

export const FONT_OPTIONS = [
  { value: "Georgia, serif", label: "Georgia (serif)" },
  { value: "Times New Roman, serif", label: "Times New Roman (serif)" },
  { value: "Arial, sans-serif", label: "Arial (sans-serif)" },
  { value: "Helvetica, Arial, sans-serif", label: "Helvetica (sans-serif)" },
  { value: "Verdana, sans-serif", label: "Verdana (sans-serif)" },
  { value: "Trebuchet MS, sans-serif", label: "Trebuchet MS (sans-serif)" },
];
