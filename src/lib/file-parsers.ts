// Client-side parsers for .md, .docx, and .json file imports.
// Each parser returns a partial object so callers only update fields that were found.

export interface ParsedWorkspace {
  name?: string;
  brandContext?: string;
  blogTemplate?: string;
}

export interface ParsedCampaign {
  name?: string;
  description?: string;
  campaignContext?: string;
  keywordCluster?: string;
}

export interface ParsedTemplate {
  name?: string;
  description?: string;
  proseBrief?: string;
  postRecipe?: Record<string, unknown>;
  htmlStyleConfig?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Internal: split markdown into { title, sections }
// ---------------------------------------------------------------------------

function parseMdSections(text: string): { title?: string; firstParagraph?: string; sections: Map<string, string> } {
  const lines = text.split("\n");
  let title: string | undefined;
  let firstParagraph: string | undefined;
  const sections = new Map<string, string>();

  let currentKey: string | null = null;
  const currentLines: string[] = [];
  let afterTitle = false;

  const flush = () => {
    if (currentKey !== null) {
      sections.set(currentKey, currentLines.join("\n").trim());
      currentLines.length = 0;
    }
  };

  for (const line of lines) {
    if (line.startsWith("# ") && !title) {
      flush();
      title = line.slice(2).trim();
      afterTitle = true;
      currentKey = null;
    } else if (line.startsWith("## ")) {
      flush();
      currentKey = line.slice(3).trim().toLowerCase();
    } else {
      if (currentKey !== null) {
        currentLines.push(line);
      } else if (afterTitle && !firstParagraph && line.trim()) {
        firstParagraph = line.trim();
      }
    }
  }
  flush();

  return { title, firstParagraph, sections };
}

function getSection(sections: Map<string, string>, ...candidates: string[]): string | undefined {
  for (const key of candidates) {
    const val = sections.get(key.toLowerCase());
    if (val) return val;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Workspace / Brand Settings
// ---------------------------------------------------------------------------

// Expected MD structure:
// # Brand Name
// One-line tagline (optional)
//
// ## Brand Context
// Target audience, tone, niche…
//
// ## Writing Brief   (also: Writing Rules, Voice, Template, Rules)
// Voice and style rules…

export function parseWorkspaceMd(text: string): ParsedWorkspace {
  const { title, firstParagraph, sections } = parseMdSections(text);

  const brandContext = getSection(
    sections,
    "brand context", "brand profile", "audience", "target audience",
    "about", "brand", "brand description"
  );

  const blogTemplate = getSection(
    sections,
    "writing brief", "writing rules", "writing guidelines", "writing template",
    "voice", "voice and tone", "template", "rules", "editorial rules",
    "anti-slop", "style guide", "style"
  );

  // If no sections were found at all, treat the entire file as brand context
  const fallback = sections.size === 0 ? text.trim() : undefined;

  return {
    name: title,
    brandContext: brandContext ?? (firstParagraph && !blogTemplate ? text.trim() : fallback),
    blogTemplate,
  };
}

export function parseWorkspaceJson(text: string): ParsedWorkspace | null {
  try {
    const data = JSON.parse(text);
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      brandContext: typeof data.brandContext === "string" ? data.brandContext : undefined,
      blogTemplate: typeof data.blogTemplate === "string" ? data.blogTemplate : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Campaign Brief
// ---------------------------------------------------------------------------

// Expected MD structure:
// # Campaign Name
// One-line description
//
// ## Context   (also: Strategic Goal, Goal, Strategy)
// Strategic goal text…
//
// ## Keywords  (also: Keyword Cluster, SEO, Topics)
// keyword1, keyword2…

export function parseCampaignMd(text: string): ParsedCampaign {
  const { title, firstParagraph, sections } = parseMdSections(text);

  const description = getSection(sections, "description", "brief", "summary", "overview") ?? firstParagraph;

  const campaignContext = getSection(
    sections,
    "context", "strategic goal", "campaign context", "goal",
    "strategy", "campaign goal", "objective", "objectives"
  );

  const keywordCluster = getSection(
    sections,
    "keywords", "keyword cluster", "seo", "seo keywords",
    "topics", "target keywords", "search terms"
  );

  // If no sections, treat whole text as context
  const fallback = sections.size === 0 ? text.trim() : undefined;

  return {
    name: title,
    description,
    campaignContext: campaignContext ?? fallback,
    keywordCluster,
  };
}

export function parseCampaignJson(text: string): ParsedCampaign | null {
  try {
    const data = JSON.parse(text);
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      description: typeof data.description === "string" ? data.description : undefined,
      campaignContext: typeof data.campaignContext === "string" ? data.campaignContext : undefined,
      keywordCluster: typeof data.keywordCluster === "string" ? data.keywordCluster : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Post Template
// ---------------------------------------------------------------------------

// Expected MD structure:
// # Template Name
// One-line description
//
// ## Prose Brief  (also: Writing Style, Instructions, Style)
// Writing instructions…

// Expected JSON structure:
// {
//   "name": "...",
//   "description": "...",
//   "proseBrief": "...",
//   "postRecipe": { ... },
//   "htmlStyleConfig": { ... }
// }

export function parseTemplateMd(text: string): ParsedTemplate {
  const { title, firstParagraph, sections } = parseMdSections(text);

  const description = getSection(sections, "description", "summary", "overview") ?? firstParagraph;

  const proseBrief = getSection(
    sections,
    "prose brief", "writing style", "writing instructions",
    "instructions", "brief", "style", "voice"
  );

  return {
    name: title,
    description,
    // If no known section found but file has content, treat whole file as prose brief
    proseBrief: proseBrief ?? (sections.size === 0 ? text.trim() : undefined),
  };
}

export function parseTemplateJson(text: string): ParsedTemplate | null {
  try {
    const data = JSON.parse(text);
    return {
      name: typeof data.name === "string" ? data.name : undefined,
      description: typeof data.description === "string" ? data.description : undefined,
      proseBrief: typeof data.proseBrief === "string" ? data.proseBrief : undefined,
      postRecipe: data.postRecipe && typeof data.postRecipe === "object" ? data.postRecipe : undefined,
      htmlStyleConfig: data.htmlStyleConfig && typeof data.htmlStyleConfig === "object" ? data.htmlStyleConfig : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utility: read a File and dispatch to the right parser based on name + content
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// HTML → markdown-like text (used when converting DOCX output from mammoth)
// ---------------------------------------------------------------------------

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n# $1\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n## $1\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n### $1\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// File reading utilities
// ---------------------------------------------------------------------------

export function isJsonFile(file: File): boolean {
  return file.name.toLowerCase().endsWith(".json");
}

export function isDocxFile(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export async function readFileText(file: File): Promise<string> {
  if (isDocxFile(file)) {
    return readDocxAsText(file);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === "string") resolve(e.target.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}

async function readDocxAsText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  // Dynamic import so mammoth is only bundled when actually needed
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return htmlToMarkdown(result.value);
}
