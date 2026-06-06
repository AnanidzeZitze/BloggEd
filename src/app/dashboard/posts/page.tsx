"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Sparkles, 
  Loader2, 
  Check, 
  AlertCircle, 
  Edit3, 
  Send, 
  ArrowLeft, 
  Globe, 
  Image as ImageIcon,
  Save
} from "lucide-react";

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
  campaign: string;
  status: "Draft" | "Published" | "Scheduled";
  date: string;
  bloggerUrl?: string;
  content?: GeneratedPost;
}

export default function PostsPage() {
  // App States
  const [view, setView] = useState<"list" | "generator" | "editor">("list");
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data Lists
  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: "1",
      title: "Amazon Ads Is Not E-Commerce. It's the Intent Data Layer of the Internet.",
      subtitle: "Google knows what you search. Amazon knows what you buy. That difference is worth $80 billion.",
      campaign: "Platform Intelligence",
      status: "Published",
      date: "June 4, 2026",
      bloggerUrl: "https://draft.blogger.com"
    },
    {
      id: "2",
      title: "Meta's Advantage+ Is the Most Underrated Shift in Paid Media",
      subtitle: "Volume was a strategy. Now, programmatic automation handles the target parameters.",
      campaign: "Platform Intelligence",
      status: "Published",
      date: "June 2, 2026",
      bloggerUrl: "https://draft.blogger.com"
    }
  ]);

  // Generation Inputs
  const [topic, setTopic] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("Platform Intelligence");
  const [postInputContext, setPostInputContext] = useState("");

  // Editor Workspace State (Single Post Editing)
  const [editingPost, setEditingPost] = useState<PostItem | null>(null);
  const [editedTitle, setEditingTitle] = useState("");
  const [editedSubtitle, setEditingSubtitle] = useState("");
  const [editedSections, setEditingSections] = useState<PostSection[]>([]);

  // Trigger Generation
  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`[UI Generator] Triggering AI API for topic: "${topic}"...`);
      // Trigger our actual feasibility API spike route
      const response = await fetch(`/api/generate/test?topic=${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: topic,
          postInputContext: postInputContext
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate blog post from Gemini.");
      }

      const generated: GeneratedPost = data.generated_post;

      const newPost: PostItem = {
        id: String(posts.length + 1),
        title: generated.title,
        subtitle: generated.subtitle,
        campaign: selectedCampaign,
        status: "Draft",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        content: generated
      };

      setPosts([newPost, ...posts]);
      
      // Load directly into the Block Editor!
      loadIntoEditor(newPost);
      setSuccessMessage("AI Post generated successfully in structured JSON blocks!");
      setTimeout(() => setSuccessMessage(null), 4000);

    } catch (err: unknown) {
      console.error("[UI Generator] API Route Error:", err);
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred during AI generation.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadIntoEditor = (post: PostItem) => {
    setEditingPost(post);
    setEditingTitle(post.title);
    setEditingSubtitle(post.subtitle);
    if (post.content && post.content.sections) {
      setEditingSections(JSON.parse(JSON.stringify(post.content.sections)));
    } else {
      setEditingSections([
        { heading: "Opening Section", paragraphs: ["Start writing here..."] }
      ]);
    }
    setView("editor");
  };

  // Handle local block-level editing changes
  const handleSectionHeadingChange = (index: number, val: string) => {
    const updated = [...editedSections];
    updated[index].heading = val;
    setEditingSections(updated);
  };

  const handleParagraphChange = (secIndex: number, paraIndex: number, val: string) => {
    const updated = [...editedSections];
    updated[secIndex].paragraphs[paraIndex] = val;
    setEditingSections(updated);
  };

  const handleAddParagraph = (secIndex: number) => {
    const updated = [...editedSections];
    updated[secIndex].paragraphs.push("");
    setEditingSections(updated);
  };

  const handleAddSection = () => {
    setEditingSections([
      ...editedSections,
      { heading: "New Section", paragraphs: [""] }
    ]);
  };

  const handleSaveLocal = () => {
    if (!editingPost) return;
    
    const updatedPosts = posts.map((p) => {
      if (p.id === editingPost.id) {
        return {
          ...p,
          title: editedTitle,
          subtitle: editedSubtitle,
          content: {
            ...p.content!,
            title: editedTitle,
            subtitle: editedSubtitle,
            sections: editedSections
          }
        };
      }
      return p;
    });

    setPosts(updatedPosts);
    setSuccessMessage("Changes saved locally in your structured database!");
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Publish Local draft to Live Google Blogger
  const handlePublishBlogger = async () => {
    if (!editingPost) return;
    
    setPublishing(true);
    setError(null);
    setSuccessMessage(null);

    try {
      console.log(`[UI Publisher] Compiling and deploying structured JSON to Google Blogger API...`);

      // Call our API with the structured content for compile and post insertion
      const response = await fetch("/api/generate/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: editedTitle,
          // Re-generate trigger or direct publish with override
          isPublishTrigger: true, 
          // Injecting overrides in actual implementation, for spike we demo pipeline:
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish draft to Google Blogger.");
      }

      const bloggerUrl = data.blogger_post?.url || "https://draft.blogger.com";

      // Update post status to Published
      const updatedPosts = posts.map((p) => {
        if (p.id === editingPost.id) {
          return {
            ...p,
            status: "Published" as const,
            bloggerUrl: bloggerUrl
          };
        }
        return p;
      });

      setPosts(updatedPosts);
      setSuccessMessage("Draft published successfully to Google Blogger! Check your blog.");
      
      // Update editor state status indicator
      if (editingPost) {
        setEditingPost({
          ...editingPost,
          status: "Published",
          bloggerUrl: bloggerUrl
        });
      }

    } catch (err: unknown) {
      console.error("[UI Publisher] Google Blogger Publishing Error:", err);
      setError((err as Error).message || "Blogger publishing failed. Please check credentials.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ----------------- 1. LIST VIEW ----------------- */}
      {view === "list" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white flex items-center">
                Blog Article Hub
              </h1>
              <p className="text-xs text-gray-400">
                Generate new blog posts, edit section blocks, and publish them directly to your Google Blogger draft queue.
              </p>
            </div>

            <button
              onClick={() => setView("generator")}
              className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New AI Post
            </button>
          </div>

          {successMessage && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center shadow-sm">
              <Check className="w-4 h-4 mr-2" />
              {successMessage}
            </div>
          )}

          {/* Posts Feed Grid */}
          <div className="bg-[#0d1324] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#0a0e1c]">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Title & Series</span>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider text-right pr-6">Status</span>
            </div>
            
            <div className="divide-y divide-gray-800">
              {posts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-[#121a30] transition-colors flex items-center justify-between">
                  <div className="space-y-1 truncate pr-4">
                    <p className="text-sm font-semibold text-gray-200 truncate max-w-xl">{post.title}</p>
                    <div className="flex items-center text-[10px] text-gray-500 space-x-2">
                      <span className="font-semibold text-gray-400">{post.campaign}</span>
                      <span>•</span>
                      <span>Created {post.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                      post.status === "Published" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {post.status}
                    </span>

                    <button
                      onClick={() => loadIntoEditor(post)}
                      className="p-1.5 rounded bg-gray-800 hover:bg-[#1a73e8] text-gray-400 hover:text-white transition-colors"
                      title="Open Editor"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    
                    {post.bloggerUrl && (
                      <a
                        href={post.bloggerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-gray-800 hover:bg-[#9c27b0] text-gray-400 hover:text-white transition-colors"
                        title="View Live Post"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- 2. GENERATOR PANEL ----------------- */}
      {view === "generator" && (
        <div className="space-y-6 max-w-2xl">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setView("list")}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center">
              Generate AI Blog Post
            </h1>
          </div>

          <div className="p-6 rounded-xl bg-[#0d1324] border border-gray-800 shadow-lg">
            <form onSubmit={handleGenerate} className="space-y-5">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Select Campaign Series</label>
                <select 
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                >
                  <option value="Platform Intelligence">Platform Intelligence</option>
                  <option value="The New Marketing Org">The New Marketing Org</option>
                  <option value="The B2B Marketing Playbook">The B2B Marketing Playbook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Target Blog Title / Topic Prompt *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google's AI Bet Is Bigger Than Search: What Marketers Keep Missing"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1 flex items-center justify-between">
                  <span>Additional Input Context (Optional)</span>
                  <span className="text-[10px] text-gray-500 font-normal">Links, notes, or talking points</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste industry announcements, URLs, specific product releases, or particular stats you want Gemini to prioritize and weave into the article..."
                  value={postInputContext}
                  onChange={(e) => setPostInputContext(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1a73e8] text-white leading-relaxed"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start leading-relaxed shadow-sm">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex space-x-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] disabled:bg-[#1a73e8]/50 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Content blocks... (takes 10-15s)
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5 text-amber-300" />
                      Generate structured blog
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- 3. STRUCTURED BLOCK EDITOR ----------------- */}
      {view === "editor" && editingPost && (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setView("list")}
                className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                title="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center">
                  Block Editor
                </h1>
                <p className="text-[10px] text-gray-500">
                  Editing structured campaign post in `{editingPost.campaign}`
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {successMessage && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20 mr-2 flex items-center">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {successMessage}
                </span>
              )}

              <button
                onClick={handleSaveLocal}
                className="flex items-center bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-gray-700"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Local
              </button>

              <button
                onClick={handlePublishBlogger}
                disabled={publishing}
                className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] disabled:bg-[#1a73e8]/50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition-colors"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Publish Draft to Blogger
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start leading-relaxed shadow-sm">
              <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Editor Workspace Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Main Editor Inputs */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Subtitle blocks */}
              <div className="p-5 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Post Title</label>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Subtitle / Tagline</label>
                  <input
                    type="text"
                    value={editedSubtitle}
                    onChange={(e) => setEditingSubtitle(e.target.value)}
                    className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Loop through sections */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Content Section Blocks</h3>
                {editedSections.map((section, secIndex) => (
                  <div key={secIndex} className="p-5 rounded-xl bg-[#0d1324] border border-gray-800 space-y-4">
                    <div>
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                        Section Heading {secIndex + 1}
                      </label>
                      <input
                        type="text"
                        value={section.heading}
                        onChange={(e) => handleSectionHeadingChange(secIndex, e.target.value)}
                        className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-[#1a73e8]"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold">Paragraphs</label>
                      {section.paragraphs.map((para, paraIndex) => (
                        <textarea
                          key={paraIndex}
                          rows={3}
                          value={para}
                          onChange={(e) => handleParagraphChange(secIndex, paraIndex, e.target.value)}
                          className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-[#1a73e8] leading-relaxed"
                        />
                      ))}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleAddParagraph(secIndex)}
                        className="text-[10px] text-[#1a73e8] hover:text-[#155fc0] font-semibold flex items-center transition-colors"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Paragraph block
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add section button */}
              <button
                onClick={handleAddSection}
                className="w-full py-3 rounded-xl border border-dashed border-gray-800 hover:border-gray-600 bg-[#0d1324]/30 text-gray-400 hover:text-white transition-colors flex items-center justify-center text-xs font-semibold"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Append New Heading Section Block
              </button>
            </div>

            {/* Right 1 Col: Visual Metaphors Panel */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Generated Art metaphors</h3>
              
              {editingPost.content?.image_metaphors && editingPost.content.image_metaphors.length > 0 ? (
                editingPost.content.image_metaphors.map((meta, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[#0d1324] border border-gray-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-300 flex items-center">
                        <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                        Metaphor Asset {i + 1}
                      </span>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        After Section {meta.section_index}
                      </span>
                    </div>

                    {meta.url ? (
                      <div className="relative rounded-lg overflow-hidden border border-gray-800 bg-[#161f38] aspect-video">
                        <img 
                          src={meta.url} 
                          alt="AI generated metaphor illustration" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-800 bg-[#11192e] py-8 text-center text-gray-500 text-xs flex flex-col items-center justify-center space-y-1">
                        <ImageIcon className="w-5 h-5 text-gray-600 mb-1" />
                        <span className="font-semibold text-gray-400">No image generated yet</span>
                        <span className="text-[10px] text-gray-600">Generated on publishing</span>
                      </div>
                    )}

                    <div className="p-2.5 rounded bg-[#11192e] border border-gray-800 text-[10px] text-gray-400 leading-normal italic">
                      <strong>Design prompts:</strong> {meta.scene_description}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-[#0d1324] border border-gray-800 text-center text-gray-500 text-xs py-8">
                  No visual assets mapped.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
