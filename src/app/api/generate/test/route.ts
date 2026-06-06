import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { getOAuth2Client } from "@/lib/google-auth";

// ---------------------------------------------------------------------------
// Interfaces & Types
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
// Google Blogger Authentication (Cloud-Native + Local Fallback)
// ---------------------------------------------------------------------------

async function getBloggerClient(workspaceId: string = "default_workspace") {
  // 1. Try loading credentials securely from the Cloud PostgreSQL Database
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (workspace && workspace.googleRefreshToken) {
      console.log(`[Blogger Client] Loading OAuth credentials from Cloud DB for workspace: ${workspaceId}`);
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: workspace.googleAccessToken || undefined,
        refresh_token: workspace.googleRefreshToken,
        expiry_date: workspace.googleTokenExpiry?.getTime() || undefined,
      });

      // Automatically listen for token refreshes and persist back to DB
      oauth2Client.on("tokens", async (tokens) => {
        console.log(`[Blogger Client] Automatically updating refreshed credentials for workspace: ${workspaceId}`);
        await db.workspace.update({
          where: { id: workspaceId },
          data: {
            googleAccessToken: tokens.access_token || undefined,
            googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
          },
        });
      });

      return google.blogger({ version: "v3", auth: oauth2Client });
    }
  } catch (dbErr) {
    console.warn(`[Blogger Client] Cloud DB credentials lookup failed or unconfigured, falling back to local files:`, dbErr);
  }

  // 2. Local fallback for testing environments
  const secretPath = path.join(process.cwd(), "client_secret.json");
  const tokenPath = path.join(process.cwd(), "blogger_token.json");

  if (!fs.existsSync(secretPath) || !fs.existsSync(tokenPath)) {
    throw new Error(`Blogger credentials not found in Cloud Database or local files.`);
  }

  console.log("[Blogger Client] Loading credentials from local token files.");
  const secretData = JSON.parse(fs.readFileSync(secretPath, "utf-8"));
  const tokenData = JSON.parse(fs.readFileSync(tokenPath, "utf-8"));

  const installed = secretData.installed || secretData.web;
  if (!installed) {
    throw new Error("Invalid client_secret.json structure");
  }

  const { client_id, client_secret, redirect_uris } = installed;
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  oauth2Client.setCredentials(tokenData);
  return google.blogger({ version: "v3", auth: oauth2Client });
}

// ---------------------------------------------------------------------------
// FreeImage.host Uploader
// ---------------------------------------------------------------------------

async function uploadImageToHost(base64Image: string): Promise<string> {
  const apiKey = process.env.FREEIMAGE_API_KEY || "6d207e02198a847aa98d0a2a901485a5";
  
  try {
    const formData = new URLSearchParams();
    formData.append("key", apiKey);
    formData.append("action", "upload");
    formData.append("source", base64Image);
    formData.append("format", "json");

    const resp = await fetch("https://freeimage.host/api/1/upload", {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.image && data.image.url) {
        console.log("  [Uploader] Successfully uploaded image to host:", data.image.url);
        return data.image.url;
      }
    }
    console.error("  [Uploader] Warning: Upload returned status code:", resp.status);
  } catch (err) {
    console.error("  [Uploader] Error uploading image:", err);
  }

  // Fallback to inline Base64 data URI
  console.log("  [Uploader] Warning: Falling back to inline base64 image data.");
  return `data:image/jpeg;base64,${base64Image}`;
}

// ---------------------------------------------------------------------------
// HTML Compiler
// ---------------------------------------------------------------------------

function compilePostToHtml(post: GeneratedPost): string {
  const parts: string[] = [];

  // 1. Render Subtitle
  if (post.subtitle) {
    parts.push(
      `<p style="font-size:1.15em;color:#555;font-style:italic;` +
      `border-left:3px solid #1a73e8;padding-left:14px;` +
      `margin-bottom:1.5em;">${post.subtitle}</p>`
    );
  }

  // 2. Render first image immediately after the subtitle/header
  const img1 = post.image_metaphors.find(m => m.section_index === 0);
  if (img1 && img1.url) {
    parts.push(
      `<div style="text-align:center;margin:1.5em 0;">` +
      `<img src="${img1.url}" alt="Illustration for ${post.title}" ` +
      `style="max-width:100%;height:auto;border-radius:8px;" />` +
      `</div>`
    );
  }

  const totalSections = post.sections.length;
  const img2At = Math.max(1, Math.floor(totalSections / 2));

  // 3. Render Body Sections & mid-post image
  post.sections.forEach((section, index) => {
    if (section.heading) {
      parts.push(
        `<h2 style="color:#1a3c5e;margin-top:1.8em;">${section.heading}</h2>`
      );
    }
    section.paragraphs.forEach(para => {
      parts.push(`<p>${para}</p>`);
    });

    // Render second image halfway through
    if (index === img2At) {
      const img2 = post.image_metaphors.find(m => m.section_index > 0);
      if (img2 && img2.url) {
        parts.push(
          `<div style="text-align:center;margin:1.5em 0;">` +
          `<img src="${img2.url}" alt="Illustration for ${post.title}" ` +
          `style="max-width:100%;height:auto;border-radius:8px;" />` +
          `</div>`
        );
      }
    }
  });

  // Replaces braces for Blogger XML compliance
  return `<div>${parts.join("\n\n")}</div>`
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;");
}

// ---------------------------------------------------------------------------
// Category & Metaphor Prompting Helpers
// ---------------------------------------------------------------------------

function inferCategory(title: string): string {
  const t = title.toLowerCase();
  if (/\b(tool|stack|software|vendor)\b/.test(t)) return "tools";
  if (/\b(code|system|architecture|data)\b/.test(t)) return "technical";
  if (/\b(ai|agent|artificial|llm|intent|advertising)\b/.test(t)) return "ai";
  if (/\b(privacy|governance|security|cookie)\b/.test(t)) return "privacy";
  if (/\b(career|job|analyst|role|hire)\b/.test(t)) return "career";
  if (/\b(measure|analytics|metric|attribution|predictive)\b/.test(t)) return "measurement";
  return "opinion";
}

function buildImagePrompt(postTitle: string, sceneDesc: string, imageIndex: number): string {
  const category = inferCategory(postTitle);
  
  const styleMap: Record<string, [string, string]> = {
    opinion: [
      "cinematic editorial photography, 24mm wide-angle, high dynamic range, film color grading",
      "chiaroscuro single overhead light source, deep navy and cold gray palette with electric crimson accent"
    ],
    tools: [
      "detailed isometric illustration, hyperrealistic material textures, dramatic overhead industrial lighting",
      "warm amber pendant lamps, pools of light on dark concrete, brushed steel and warm walnut palette"
    ],
    technical: [
      "large-format architectural blueprint aesthetic, deep navy drafting paper, white and copper ink",
      "even flat drafting table lamp light, deep navy and copper palette, clean geometric shadow"
    ],
    ai: [
      "ultra-photorealistic cinematic render, volumetric fog, Blade Runner visual language",
      "cool corporate blue-white ambient with single warm crimson accent point, volumetric light shafts"
    ],
    privacy: [
      "conceptual editorial illustration, surrealist juxtaposition of photorealistic elements",
      "golden hour fortress light at low angle, warm amber and deep shadow palette"
    ],
    career: [
      "cinematic editorial photography, 35mm ground-level lens, golden hour",
      "dawn raking light at 10 degrees, long shadows, warm amber horizon transitioning to deep violet zenith"
    ],
    measurement: [
      "ultra-photorealistic, 100mm macro lens, f/2.8, rich surface texture",
      "warm tungsten desk lamp at upper left, deep shadow filling rest of frame, warm gold and dark palette"
    ],
  };

  const [styleDirective, lighting] = styleMap[category] || styleMap["opinion"];
  
  const angle = imageIndex === 0 
    ? "establishing wide-angle cinematic composition, strong left-third subject placement"
    : "medium shot, dynamic or isometric perspective";
    
  const subject = `${sceneDesc}. Highly specific scene with precise material detail`;
  const textures = "rich surface textures, tactile material detail throughout";

  return (
    `${subject}. ${angle}, ${lighting}. ${textures}. ${styleDirective}. ` +
    `Ultra-high resolution, photorealistic render quality, rich shadow detail, ` +
    `no text, no labels, no logos, no readable screens, no user interface overlays, no watermarks. ` +
    `No text of any kind. No labels, captions, or annotations. ` +
    `No logos or brand marks. No readable screens or monitors. ` +
    `No user interface elements or app windows. ` +
    `No stock photo compositions. No clip art aesthetics. ` +
    `No watermarks. No posed stock-photo people. ` +
    `No generic business handshakes or team meeting compositions.`
  );
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  return handleRequest(req);
}

async function handleRequest(req: NextRequest) {
  // 1. Gather parameters
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic") || "Amazon Ads Is Not E-Commerce. It's the Intent Data Layer of the Internet.";
  
  // For POST requests, we can also extract from body if available
  let customTopic = topic;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body && body.topic) {
        customTopic = body.topic;
      }
    } catch {
      // Ignored if raw body is empty or not JSON
    }
  }

  // 2. Initialize Gemini API
  const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyCGUue9QvJbMV9gMyz88xOpTZRx7k6Kly8";
  if (!geminiApiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY environment variable" },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  // 3. Load Writing Brief context
  const briefPath = path.join(process.cwd(), "../BLOG_BRIEF.md");
  let briefContent = "";
  try {
    if (fs.existsSync(briefPath)) {
      briefContent = fs.readFileSync(briefPath, "utf-8");
    }
  } catch (err) {
    console.error("Warning: Could not read parent BLOG_BRIEF.md file:", err);
  }

  // 4. Construct Structured Output Schema for Post Generation
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
            paragraphs: {
              type: "array",
              items: { type: "string" }
            }
          },
          required: ["heading", "paragraphs"]
        }
      },
      image_metaphors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section_index: { 
              type: "integer", 
              description: "The section array index after which this image should reside (use 0 for immediate top place, and a midway index for the second image)." 
            },
            scene_description: { 
              type: "string", 
              description: "A 1-2 sentence description of a physical, concrete visual scene (concrete objects, setting, actions, no abstract buzzwords)." 
            }
          },
          required: ["section_index", "scene_description"]
        }
      }
    },
    required: ["title", "subtitle", "sections", "image_metaphors"]
  };

  try {
    console.log(`[Next.js Spike] 1. Generating text for topic: "${customTopic}"...`);
    
    // Call Gemini 2.5 Flash for the blog content
    const textResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a long-form premium blog post about: "${customTopic}".`,
      config: {
        systemInstruction: `
You are a master ghostwriter for a senior marketing strategist and analyst. You write long-form blog posts for a publication called 'Signal & Noise'.
Your readers are CMOs and growth leaders. You are skeptical of hype, authoritative, slightly contrarian, and specificity-obsessed.

You MUST follow the entire formatting, anti-slop, and language rules outline in this document strictly:
---
${briefContent}
---

Your response MUST match the JSON schema perfectly. Do not include listicles or bullet points.
Ensure 'image_metaphors' has exactly 2 visual scenes.
        `,
        responseMimeType: "application/json",
        responseSchema: postSchema,
      }
    });

    const textOutput = textResponse.text;
    if (!textOutput) {
      throw new Error("Gemini returned empty text response");
    }

    const parsedPost: GeneratedPost = JSON.parse(textOutput);
    console.log(`[Next.js Spike]   => Successfully generated blog JSON: "${parsedPost.title}"`);
    console.log(`[Next.js Spike]   => Found ${parsedPost.sections.length} sections and ${parsedPost.image_metaphors.length} image metaphors.`);

    // 5. Generate and Upload Metaphor Images
    console.log("[Next.js Spike] 2. Spawning image generation (Imagen)...");
    
    for (let i = 0; i < parsedPost.image_metaphors.length; i++) {
      const metaphor = parsedPost.image_metaphors[i];
      console.log(`[Next.js Spike]   => Metaphor ${i+1}: ${metaphor.scene_description}`);
      
      const imagenPrompt = buildImagePrompt(parsedPost.title, metaphor.scene_description, i);
      
      try {
        console.log(`[Next.js Spike]   => Calling Imagen for prompt ${i+1}...`);
        const imgResponse = await ai.models.generateImages({
          model: "imagen-3.0-generate-001",
          prompt: imagenPrompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            outputMimeType: "image/jpeg",
          }
        });

        const generatedImages = imgResponse.generatedImages;
        if (generatedImages && generatedImages.length > 0 && generatedImages[0].image?.imageBytes) {
          console.log(`[Next.js Spike]   => Image ${i+1} generated successfully. Uploading...`);
          const uploadedUrl = await uploadImageToHost(generatedImages[0].image.imageBytes);
          metaphor.url = uploadedUrl;
        } else {
          console.error(`[Next.js Spike]   => Image ${i+1} returned empty payload.`);
        }
      } catch (imgErr) {
        console.error(`[Next.js Spike]   => Failed to generate/upload image ${i+1}:`, imgErr);
      }
    }

    // 6. Compile JSON to Styled HTML
    console.log("[Next.js Spike] 3. Compiling post structured JSON to styled HTML...");
    const htmlContent = compilePostToHtml(parsedPost);

    // 7. Publish to Google Blogger
    console.log("[Next.js Spike] 4. Publishing draft to Blogger...");
    let bloggerResult = null;
    let bloggerError = null;
    
    try {
      const workspaceId = searchParams.get("workspaceId") || "default_workspace";
      const blogger = await getBloggerClient(workspaceId);
      let blogId = process.env.BLOG_ID || "5387823041396511011";

      // Dynamically load custom workspace Blogger blog ID from cloud if present
      try {
        const workspace = await db.workspace.findUnique({
          where: { id: workspaceId }
        });
        if (workspace && workspace.bloggerBlogId) {
          blogId = workspace.bloggerBlogId;
          console.log(`[Next.js Spike]   => Routing to custom workspace blog ID from Cloud DB: ${blogId}`);
        }
      } catch {
        // Fallback to default blogId if db read fails
      }

      const res = await blogger.posts.insert({
        blogId: blogId,
        isDraft: true, // Always default to draft for automated safety!
        requestBody: {
          title: parsedPost.title,
          content: htmlContent,
          labels: ["AI Generated", "SaaS Spike", "Signal & Noise"]
        }
      });
      bloggerResult = res.data;
      console.log(`[Next.js Spike]   => Success! Created Blogger post draft: ${res.data.url}`);
    } catch (blogErr: unknown) {
      const blogErrMessage = blogErr instanceof Error ? blogErr.message : String(blogErr);
      bloggerError = blogErrMessage;
      console.error("[Next.js Spike]   => Blogger publishing failed:", blogErr);
    }

    // 8. Return response
    return NextResponse.json({
      success: true,
      topic: customTopic,
      generated_post: parsedPost,
      blogger_post: bloggerResult,
      blogger_error: bloggerError,
      message: bloggerResult ? "Successfully generated and published draft to Blogger." : "Generated post locally, but failed to publish to Blogger."
    });

  } catch (err: unknown) {
    console.error("[Next.js Spike] Pipeline Error:", err);
    const errMessage = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json(
      {
        success: false,
        error: errMessage,
        details: errStack
      },
      { status: 500 }
    );
  }
}
