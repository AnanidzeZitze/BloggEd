"use client";

import React, { useState } from "react";
import { FolderKanban, Plus, Calendar, BookOpen, Sparkles, Check, Trash2, Edit } from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  description: string;
  campaignContext: string;
  postsCount: number;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: "1",
      name: "Platform Intelligence",
      description: "Analyzing major marketing platforms and their algorithmic directions.",
      campaignContext: "Context focuses on major search and social channels: Meta Advantage+, Amazon DSP, TikTok ad rules, LinkedIn B2B data routing.",
      postsCount: 12,
      createdAt: "May 15, 2026"
    },
    {
      id: "2",
      name: "The New Marketing Org",
      description: "Structural layout changes of modern marketing divisions in the age of generative models.",
      campaignContext: "Context focuses on roles elimination, split brand-growth leadership, team AI literacy, and the rise of marketing operations.",
      postsCount: 14,
      createdAt: "May 20, 2026"
    },
    {
      id: "3",
      name: "The B2B Marketing Playbook",
      description: "Custom ABM strategies, intent data audits, and closed attribution pipelines.",
      campaignContext: "Focuses on high-value corporate targeting, intent data skepticism, webinar engagement, and modern CRM loops.",
      postsCount: 12,
      createdAt: "June 1, 2026"
    }
  ]);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [campaignContext, setCampaignContext] = useState("");

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCampaign: CampaignItem = {
      id: String(campaigns.length + 1),
      name,
      description,
      campaignContext,
      postsCount: 0,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    };

    setCampaigns([...campaigns, newCampaign]);
    setName("");
    setDescription("");
    setCampaignContext("");
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setCampaigns(campaigns.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white flex items-center">
            Campaign Series Manager
          </h1>
          <p className="text-xs text-gray-400">
            Create and organize multiple blog series (campaigns) under your brand. Each series can have its own target keywords and strategic context.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Series
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaigns.map((camp) => (
          <div key={camp.id} className="p-5 rounded-xl bg-[#0d1324] border border-gray-800 flex flex-col justify-between hover:border-gray-700 transition-all shadow-sm space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#1a73e8]/10 text-[#1a73e8] flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-gray-500 flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {camp.createdAt}
                </span>
              </div>
              
              <h3 className="text-sm font-bold text-white leading-snug">{camp.name}</h3>
              <p className="text-xs text-gray-400 line-clamp-2 h-8">{camp.description}</p>
              
              {camp.campaignContext && (
                <div className="p-2 rounded bg-[#11192e] border border-gray-800 text-[10px] text-gray-400 leading-relaxed italic">
                  <strong>Series Goal Context:</strong> {camp.campaignContext}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-400">
                {camp.postsCount} posts in queue
              </span>
              
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => handleDelete(camp.id)}
                  title="Delete Series"
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#11192e] border border-gray-700 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
              <FolderKanban className="w-5 h-5 text-[#1a73e8] mr-2" />
              Configure Blog Series (Campaign)
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Groups blog posts under a specific thematic schedule. Setting a campaign context helps focus the AI writer on these specific objectives.
            </p>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Series Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Honest MarTech Audit"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Brief Description</label>
                <input
                  type="text"
                  placeholder="e.g. Tool-by-tool honest assessment of what works vs. hype."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Strategic Goal Context (Injected into AI Writer)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Focus on evaluating HubSpot, Salesforce, and highlighting when to buy vs when to move on."
                  value={campaignContext}
                  onChange={(e) => setCampaignContext(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>

              <div className="flex space-x-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-xs hover:bg-[#155fc0] transition-colors font-semibold"
                >
                  Create Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
