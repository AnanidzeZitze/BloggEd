import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import { db } from "@/lib/db";
import { getOAuth2Client } from "@/lib/google-auth";
import { getAuthenticatedWorkspace } from "@/lib/workspace-guard";
import { safeDecrypt, encrypt } from "@/lib/encrypt";
import { generateLimiter, checkRateLimit } from "@/lib/rate-limit";
import { compileRecipeToPrompt, DEFAULT_HTML_STYLE, HtmlStyleConfig, PostRecipe } from "@/lib/post-recipe";
import { TemplateType } from "@prisma/client";

const TOPIC_MAX_LENGTH = 500;
const CONTEXT_MAX_LENGTH = 2000;

type PublishMode = "none" | "draft" | "live";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeImageUrl(url: string): string {
  if (url.startsWith("https://") || url.startsWith("data:image/")) return url;
  return "";
}

// ---------------------------------------------------------------------------
// Google Blogger client (decrypts stored tokens)
// ---------------------------------------------------------------------------

async function getBloggerClient(workspaceId: string) {
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });

  if (!workspace?.googleRefreshToken) {
    throw new Error("Google account not connected. Connect it in Settings.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: safeDecrypt(workspace.googleAccessToken) ?? undefined,
    refresh_token: safeDecrypt(workspace.googleRefreshToken) ?? undefined,
    expiry_date: workspace.googleTokenExpiry?.getTime() ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        googleAccessToken: tokens.access_token ? encrypt(tokens.access_token) : undefined,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    });
  });

  return google.blogger({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// Image uploader
// ---------------------------------------------------------------------------

async function uploadImageToHost(base64Image: string): Promise<string> {
  const apiKey = process.env.FREEIMAGE_API_KEY;

  if (!apiKey) {
    return `data:image/jpeg;base64,${base64Image}`;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("action", "upload");
    formData.append("source", base64Image);
    formData.append("format", "json");

    const resp = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data?.image?.url) return data.image.url as string;
    }
    console.error("[Uploader] Upload returned status:", resp.status);
  } catch (err) {
    console.error("[Uploader] Error uploading image:", err);
  }

  return `data:image/jpeg;base64,${base64Image}`;
}

// ---------------------------------------------------------------------------
// HTML compiler (XSS-safe)
// ---------------------------------------------------------------------------

function renderImageTag(url: string, title: string): string {
  return (
    `<div style="text-align:center;margin:2em 0;">` +
    `<img src="${url}" alt="${escapeHtml("Illustration for " + title)}" ` +
    `style="max-width:100%;height:auto;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.12);" /></div>`
  );
}

function compilePostToHtml(post: GeneratedPost, style: HtmlStyleConfig = DEFAULT_HTML_STYLE): string {
  const heading = style.headingColor ?? "#1a3c5e";
  const accent = style.accentColor ?? "#f97316";
  const font = style.fontBody ?? "Georgia, serif";
  const subtitleStyle = style.subtitleStyle ?? "italic_bordered";

  // Build a map: section_index → image url (only images that have a url)
  // section_index === 0 means "before section 0" (hero position)
  // section_index === N means "after section N-1" (insert after that section renders)
  const imageByIndex = new Map<number, string>();
  for (const m of post.image_metaphors) {
    if (m.url) {
      const url = sanitizeImageUrl(m.url);
      if (url) imageByIndex.set(m.section_index, url);
    }
  }

  // Fallback: if Gemini assigned all images to section_index 0 (common), spread them
  // — put the second one at the midpoint automatically so it still lands in the body.
  if (imageByIndex.size >= 2) {
    const indices = [...imageByIndex.keys()].sort((a, b) => a - b);
    // If both are at the same index, move the second to midpoint
    if (indices.length === 2 && indices[0] === indices[1]) {
      const midpoint = Math.max(1, Math.floor(post.sections.length / 2));
      const entries = [...imageByIndex.entries()];
      imageByIndex.clear();
      imageByIndex.set(entries[0][0], entries[0][1]);
      imageByIndex.set(midpoint, entries[1][1]);
    }
  }

  const parts: string[] = [];

  if (post.subtitle) {
    let subtitleCss = `font-size:1.15em;color:#555;font-family:${font};margin-bottom:1.5em;`;
    if (subtitleStyle === "italic_bordered") subtitleCss += `font-style:italic;border-left:3px solid ${accent};padding-left:14px;`;
    else if (subtitleStyle === "italic_only") subtitleCss += `font-style:italic;`;
    parts.push(`<p style="${subtitleCss}">${escapeHtml(post.subtitle)}</p>`);
  }

  // Hero image: section_index === 0 goes before any sections
  const heroUrl = imageByIndex.get(0);
  if (heroUrl) parts.push(renderImageTag(heroUrl, post.title));

  post.sections.forEach((section, index) => {
    if (section.heading) {
      parts.push(`<h2 style="color:${heading};font-family:${font};margin-top:1.8em;">${escapeHtml(section.heading)}</h2>`);
    }
    section.paragraphs.forEach((para) => parts.push(`<p>${escapeHtml(para)}</p>`));

    // After rendering section `index`, check for an image placed at index+1
    // (section_index N means "after the Nth section" in 1-based terms)
    const afterUrl = imageByIndex.get(index + 1);
    if (afterUrl) parts.push(renderImageTag(afterUrl, post.title));
  });

  return `<div>${parts.join("\n\n")}</div>`
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;");
}

// ---------------------------------------------------------------------------
// Image prompt helpers
// ---------------------------------------------------------------------------
// Image prompt helpers
// ---------------------------------------------------------------------------

// Score-based category inference across title + subtitle + first section heading
function inferCategory(title: string, subtitle?: string, firstHeading?: string): string {
  const corpus = [title, subtitle ?? "", firstHeading ?? ""].join(" ").toLowerCase();

  const patterns: Array<[string, RegExp]> = [
    ["ai",          /\b(ai|artificial intelligence|machine learning|llm|large language|agent|generative|gpt|claude|gemini|openai|deepmind|neural|intent|advertising|automation)\b/],
    ["technical",   /\b(code|coding|system|architecture|infrastructure|api|database|backend|frontend|algorithm|data pipeline|engineering|devops|cloud|kubernetes|microservice)\b/],
    ["tools",       /\b(tool|stack|software|platform|vendor|saas|crm|cms|product|feature|integration|workflow|plugin|extension)\b/],
    ["privacy",     /\b(privacy|gdpr|ccpa|security|compliance|governance|cookie|data protection|breach|regulation|consent|audit)\b/],
    ["career",      /\b(career|job|hire|hiring|role|team|leadership|manager|analyst|freelance|salary|skill|talent|remote work|culture)\b/],
    ["measurement", /\b(measure|metric|analytics|attribution|kpi|dashboard|report|tracking|conversion|roi|funnel|a\/b test|experiment|predictive|forecast)\b/],
    ["opinion",     /\b(why|wrong|truth|myth|future|strategy|opinion|perspective|take|change|should|must|overrated|underrated|reality|lesson)\b/],
  ];

  // Score each category by number of regex matches in corpus
  let bestCategory = "opinion";
  let bestScore = 0;
  for (const [cat, pattern] of patterns) {
    const matches = corpus.match(new RegExp(pattern.source, "gi"));
    const score = matches ? matches.length : 0;
    if (score > bestScore) { bestScore = score; bestCategory = cat; }
  }
  return bestCategory;
}

// Map VisualStyle → [style directive, lighting]
const VISUAL_STYLE_OVERRIDES: Record<string, [string, string]> = {
  editorial_dark: [
    "cinematic editorial photography, 24mm wide-angle, high dynamic range, desaturated film grade",
    "chiaroscuro single overhead source, deep navy and cold charcoal palette with electric crimson accent",
  ],
  editorial_light: [
    "clean editorial photography, airy natural light, soft shadows, muted warm tones",
    "diffused north-facing window light, warm white and sand palette with slate accent",
  ],
  brutalist: [
    "bold graphic illustration, raw concrete textures, stark geometric forms, high contrast",
    "flat fluorescent overhead, pure black and white with single vivid accent color",
  ],
  luxury_dark: [
    "ultra-premium product photography, deep black background, specular highlights on rich materials",
    "single narrow spotlight from upper right, near-total darkness, obsidian and gold palette",
  ],
  luxury_light: [
    "high-key luxury editorial, soft diffused fill, marble and linen surfaces, muted elegance",
    "wraparound studio softbox, creamy warm white with champagne gold accents",
  ],
  technical: [
    "large-format architectural blueprint aesthetic, deep navy drafting paper, white and copper ink",
    "even flat drafting table lamp light, deep navy and copper palette, clean geometric shadow",
  ],
  cinematic: [
    "ultra-photorealistic cinematic render, anamorphic lens flare, volumetric fog, film grain",
    "practitioner rim light and practical lamp fill, teal-orange complementary grade",
  ],
};

// Category fallbacks when no VisualStyle is set
const CATEGORY_STYLES: Record<string, [string, string]> = {
  opinion: [
    "cinematic editorial photography, 24mm wide-angle, high dynamic range, film color grading",
    "chiaroscuro single overhead light source, deep navy and cold gray palette with electric crimson accent",
  ],
  tools: [
    "detailed isometric illustration, hyperrealistic material textures, dramatic overhead industrial lighting",
    "warm amber pendant lamps, pools of light on dark concrete, brushed steel and warm walnut palette",
  ],
  technical: [
    "large-format architectural blueprint aesthetic, deep navy drafting paper, white and copper ink",
    "even flat drafting table lamp light, deep navy and copper palette, clean geometric shadow",
  ],
  ai: [
    "ultra-photorealistic cinematic render, volumetric fog, Blade Runner visual language",
    "cool corporate blue-white ambient with single warm crimson accent point, volumetric light shafts",
  ],
  privacy: [
    "conceptual editorial illustration, surrealist juxtaposition of photorealistic elements",
    "golden hour fortress light at low angle, warm amber and deep shadow palette",
  ],
  career: [
    "cinematic editorial photography, 35mm ground-level lens, golden hour",
    "dawn raking light at 10 degrees, long shadows, warm amber horizon transitioning to deep violet zenith",
  ],
  measurement: [
    "ultra-photorealistic, 100mm macro lens, f/2.8, rich surface texture",
    "warm tungsten desk lamp at upper left, deep shadow filling rest of frame, warm gold and dark palette",
  ],
};

function buildImagePrompt(
  post: GeneratedPost,
  imageIndex: number,
  sceneDesc: string,
  visualStyle?: string,
): string {
  // Prefer explicit visual style from template; fall back to category inference
  const styleEntry =
    visualStyle && visualStyle !== "none" && VISUAL_STYLE_OVERRIDES[visualStyle]
      ? VISUAL_STYLE_OVERRIDES[visualStyle]
      : CATEGORY_STYLES[inferCategory(
          post.title,
          post.subtitle,
          post.sections[0]?.heading,
        )] ?? CATEGORY_STYLES["opinion"];

  const [styleDirective, lighting] = styleEntry;

  const angle =
    imageIndex === 0
      ? "establishing wide-angle cinematic composition, strong left-third subject placement"
      : "medium close-up, dynamic or isometric perspective, subject fills right two-thirds";

  return (
    `${sceneDesc}. Highly specific scene with precise material detail. ${angle}, ${lighting}. ` +
    `Rich surface textures, tactile material detail throughout. ${styleDirective}. ` +
    `Ultra-high resolution, photorealistic render quality, rich shadow detail, ` +
    `no text, no labels, no logos, no readable screens, no user interface overlays, no watermarks.`
  );
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  // 1. Auth
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthenticated" }, { status: 401 });
  }

  // 2. Rate limit
  const { limited } = await checkRateLimit(generateLimiter, userId);
  if (limited) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again shortly." },
      { status: 429 }
    );
  }

  // 3. Parse and validate inputs
  const { searchParams } = new URL(req.url);
  let topic = (searchParams.get("topic") ?? "").trim();
  let postInputContext = "";
  let seriesId = searchParams.get("seriesId") ?? "";
  let templateId = searchParams.get("templateId") ?? "";

  let publishMode: PublishMode = "draft";

  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.topic && typeof body.topic === "string") topic = body.topic.trim();
      if (body?.postInputContext && typeof body.postInputContext === "string") {
        postInputContext = body.postInputContext.trim().slice(0, CONTEXT_MAX_LENGTH);
      }
      if (body?.seriesId && typeof body.seriesId === "string") seriesId = body.seriesId.trim();
      if (body?.templateId && typeof body.templateId === "string") templateId = body.templateId.trim();
      if (body?.publishMode === "none" || body?.publishMode === "draft" || body?.publishMode === "live") {
        publishMode = body.publishMode as PublishMode;
      }
    } catch {
      // not JSON — ignore
    }
  }

  if (!topic) {
    return NextResponse.json({ success: false, error: "topic is required" }, { status: 400 });
  }
  if (topic.length > TOPIC_MAX_LENGTH) {
    return NextResponse.json(
      { success: false, error: `topic must be ${TOPIC_MAX_LENGTH} characters or fewer` },
      { status: 400 }
    );
  }

  // 4. Workspace ownership
  const workspaceId = searchParams.get("workspaceId");
  const { workspace, error: wsError, status: wsStatus } = await getAuthenticatedWorkspace(workspaceId);
  if (wsError || !workspace) {
    return NextResponse.json({ success: false, error: wsError }, { status: wsStatus });
  }

  // 4b. Verify series belongs to this workspace (if provided); load parent campaign too
  let series = null;
  let campaign = null;
  if (seriesId) {
    series = await db.series.findFirst({
      where: { id: seriesId, campaign: { workspaceId: workspace.id } },
      include: { campaign: true },
    });
    if (!series) {
      return NextResponse.json({ success: false, error: "Series not found in this workspace" }, { status: 404 });
    }
    campaign = series.campaign;
  }

  // 4c. Load post template (if provided)
  let postTemplate = null;
  if (templateId) {
    postTemplate = await db.template.findFirst({
      where: { id: templateId, workspaceId: workspace.id, templateType: TemplateType.POST },
    });
    if (!postTemplate) {
      return NextResponse.json({ success: false, error: "Template not found in this workspace" }, { status: 404 });
    }
  }

  // 5. Resolve Gemini key (custom workspace key takes priority)
  const activeGeminiKey =
    (workspace.customGeminiKey ? safeDecrypt(workspace.customGeminiKey) : null) ??
    process.env.GEMINI_API_KEY ??
    "";

  if (!activeGeminiKey) {
    return NextResponse.json(
      { success: false, error: "No Gemini API key configured. Add one in Settings or set GEMINI_API_KEY." },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: activeGeminiKey });

  // 6. Build system instruction: workspace brief + template prose brief + compiled recipe
  const instructionParts: string[] = [];
  if (workspace.blogTemplate?.trim()) {
    instructionParts.push(`WRITING BRIEF:\n${workspace.blogTemplate.trim()}`);
  }
  if (postTemplate?.proseBrief?.trim()) {
    instructionParts.push(`TEMPLATE STYLE GUIDE (${postTemplate.name}):\n${postTemplate.proseBrief.trim()}`);
  }
  if (postTemplate?.postRecipe) {
    const recipe = postTemplate.postRecipe as PostRecipe;
    instructionParts.push(compileRecipeToPrompt(recipe, postTemplate.name));
  }
  const briefContent = instructionParts.join("\n\n");

  // 7. Gemini structured output schema
  const postSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            paragraphs: { type: "array", items: { type: "string" } },
          },
          required: ["heading", "paragraphs"],
        },
      },
      image_metaphors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section_index: { type: "integer" },
            scene_description: { type: "string" },
          },
          required: ["section_index", "scene_description"],
        },
      },
    },
    required: ["title", "subtitle", "sections", "image_metaphors"],
  };

  try {
    console.log(`[Generate] Topic: "${topic}"`);

    const contextParts: string[] = [];
    if (workspace.brandContext?.trim()) {
      contextParts.push(`BRAND CONTEXT:\n${workspace.brandContext.trim()}`);
    }
    if (campaign?.campaignContext?.trim()) {
      contextParts.push(`CAMPAIGN CONTEXT:\n${campaign.campaignContext.trim()}`);
    }
    if (series?.seriesContext?.trim()) {
      contextParts.push(`SERIES CONTEXT:\n${series.seriesContext.trim()}`);
    }
    if (series?.keywordCluster?.trim()) {
      contextParts.push(`TARGET KEYWORDS FOR THIS SERIES:\n${series.keywordCluster.trim()}`);
    }
    if (postInputContext) {
      contextParts.push(`ADDITIONAL CONTEXT PROVIDED BY THE AUTHOR:\n${postInputContext}`);
    }
    const contextBlock = contextParts.length > 0 ? `\n\n${contextParts.join("\n\n")}` : "";

    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `TOPIC: ${topic}${contextBlock}\n\nGenerate a long-form premium blog post about the topic above.` }],
        },
      ],
      config: {
        systemInstruction: briefContent
          ? `You are an expert ghostwriter.\n\nFollow every formatting, voice, and style rule in the brief below strictly:\n---\n${briefContent}\n---\n\nYour response MUST match the JSON schema. No listicles or bullet points. 'image_metaphors' must have exactly 2 visual scenes.`
          : `You are a master ghostwriter for a senior marketing strategist and analyst. Write long-form premium blog posts. Be authoritative, specific, and avoid generic filler. Your response MUST match the JSON schema. No listicles or bullet points. 'image_metaphors' must have exactly 2 visual scenes.`,
        responseMimeType: "application/json",
        responseSchema: postSchema,
      },
    });

    const textOutput = textResponse.text;
    if (!textOutput) throw new Error("Gemini returned empty response");

    const parsedPost: GeneratedPost = JSON.parse(textOutput);
    console.log(`[Generate] Post generated: "${parsedPost.title}" (${parsedPost.sections.length} sections)`);

    // 8. Generate and upload images
    const htmlStyle = (postTemplate?.htmlStyleConfig as HtmlStyleConfig | null) ?? DEFAULT_HTML_STYLE;
    const visualStyle = htmlStyle.visualStyle ?? undefined;

    const imageErrors: string[] = [];
    for (let i = 0; i < parsedPost.image_metaphors.length; i++) {
      const metaphor = parsedPost.image_metaphors[i];
      const imagenPrompt = buildImagePrompt(parsedPost, i, metaphor.scene_description, visualStyle);

      try {
        const imgResponse = await ai.models.generateImages({
          model: "imagen-3.0-generate-001",
          prompt: imagenPrompt,
          config: { numberOfImages: 1, aspectRatio: "16:9", outputMimeType: "image/jpeg" },
        });

        const img = imgResponse.generatedImages?.[0]?.image?.imageBytes;
        if (img) {
          metaphor.url = await uploadImageToHost(img);
        } else {
          const msg = `Image ${i + 1}: generation returned no bytes`;
          imageErrors.push(msg);
          console.error(`[Generate] ${msg}`);
        }
      } catch (imgErr) {
        const msg = `Image ${i + 1}: ${imgErr instanceof Error ? imgErr.message : String(imgErr)}`;
        imageErrors.push(msg);
        console.error(`[Generate] Image ${i + 1} failed:`, imgErr);
      }
    }

    // 9. Compile HTML
    const htmlContent = compilePostToHtml(parsedPost, htmlStyle);

    let bloggerResult = null;
    let bloggerError = null;

    if (publishMode !== "none") {
      try {
        const blogger = await getBloggerClient(workspace.id);
        const blogId = workspace.bloggerBlogId ?? process.env.BLOG_ID ?? "";

        if (!blogId) throw new Error("No Blogger blog ID configured for this workspace.");

        const isDraft = publishMode === "draft";
        const res = await blogger.posts.insert({
          blogId,
          isDraft,
          requestBody: {
            title: parsedPost.title,
            content: htmlContent,
            labels: ["AI Generated", "Signal & Noise"],
          },
        });
        bloggerResult = res.data;
      } catch (blogErr: unknown) {
        bloggerError = blogErr instanceof Error ? blogErr.message : String(blogErr);
        console.error("[Generate] Blogger publish failed:", blogErr);
      }
    }

    // 10. Save post to DB (if a series is associated)
    let savedPostId: string | null = null;
    if (seriesId && series) {
      try {
        const isPublished = publishMode === "live" && bloggerResult != null;
        const savedPost = await db.post.create({
          data: {
            seriesId,
            templateId: templateId || null,
            title: parsedPost.title,
            subtitle: parsedPost.subtitle ?? null,
            postInputContext: postInputContext || null,
            content: parsedPost as unknown as Parameters<typeof db.post.create>[0]["data"]["content"],
            status: isPublished ? "PUBLISHED" : "DRAFT",
            bloggerUrl: bloggerResult?.url ?? null,
            bloggerId: bloggerResult?.id ?? null,
            publishedAt: isPublished ? new Date() : null,
          },
        });
        savedPostId = savedPost.id;
      } catch (dbErr) {
        console.error("[Generate] DB save failed:", dbErr);
      }
    }

    const message =
      publishMode === "none"
        ? "Generated post saved to database (not pushed to Blogger)."
        : bloggerResult
          ? publishMode === "live"
            ? "Generated and published live to Blogger."
            : "Generated and published draft to Blogger."
          : "Generated post locally; Blogger publish failed.";

    return NextResponse.json({
      success: true,
      topic,
      post_id: savedPostId,
      generated_post: parsedPost,
      blogger_post: bloggerResult,
      blogger_error: bloggerError,
      image_errors: imageErrors,
      message,
    });
  } catch (err: unknown) {
    console.error("[Generate] Pipeline error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "An internal error occurred. Please try again."
            : (err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}
