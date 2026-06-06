"use client";

import React from "react";
import { 
  FolderKanban, 
  FileEdit, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  TrendingUp,
  Sparkles,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const stats = [
    { name: "Active Campaigns", value: "3", icon: FolderKanban, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "Draft Posts", value: "12", icon: FileEdit, color: "text-amber-500", bg: "bg-amber-500/10" },
    { name: "Published Posts", value: "18", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { name: "Scheduled Queue", value: "5", icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  const recentPosts = [
    { id: "1", title: "Amazon Ads Is Not E-Commerce. It's the Intent Data Layer of the Internet.", campaign: "Platform Intelligence", status: "Published", date: "June 4, 2026" },
    { id: "2", title: "Meta's Advantage+ Is the Most Underrated Shift in Paid Media", campaign: "Platform Intelligence", status: "Published", date: "June 2, 2026" },
    { id: "3", title: "Why Your Biggest AI Hire Might Not Be in Marketing", campaign: "The New Marketing Org", status: "Draft", date: "In Progress" },
    { id: "4", title: "The B2B Content Playbook for AI-Native Buyers", campaign: "The B2B Marketing Playbook", status: "Scheduled", date: "June 8, 2026" },
  ];

  const activeCampaigns = [
    { name: "Platform Intelligence", progress: 80, posts: "10 / 12 posts completed", color: "bg-blue-500" },
    { name: "The New Marketing Org", progress: 100, posts: "14 / 14 posts completed", color: "bg-emerald-500" },
    { name: "The B2B Marketing Playbook", progress: 40, posts: "5 / 12 posts completed", color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-[#111c3a] to-[#0f1424] border border-gray-800 flex items-center justify-between shadow-lg">
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-white flex items-center">
            Welcome back to the Cockpit! 
            <Sparkles className="w-5 h-5 text-amber-400 ml-2 animate-pulse" />
          </h1>
          <p className="text-xs text-gray-400 max-w-xl">
            All systems are fully synchronized with your Google Blogger API. You have 13 upcoming articles ready in the content queue for your brand campaigns.
          </p>
        </div>
        <div className="hidden md:flex items-center space-x-2">
          <span className="text-xs text-gray-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-ping"></span>
            Blogger API Connected
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="p-4 rounded-xl bg-[#0d1324] border border-gray-800 flex items-center justify-between shadow-sm">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">{stat.name}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mr-1 shadow-inner`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main split dashboard view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 cols: Recent Posts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Recent Blog Operations</h2>
            <Link href="/dashboard/posts" className="text-xs text-[#1a73e8] hover:text-[#155fc0] flex items-center font-semibold transition-colors">
              View All Posts
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          <div className="bg-[#0d1324] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-800">
              {recentPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-[#121a30] transition-colors flex items-center justify-between">
                  <div className="space-y-1 truncate pr-4">
                    <p className="text-xs font-semibold text-gray-200 truncate">{post.title}</p>
                    <div className="flex items-center text-[10px] text-gray-500 space-x-2">
                      <span>{post.campaign}</span>
                      <span>•</span>
                      <span>{post.date}</span>
                    </div>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                      post.status === "Published" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                        : post.status === "Scheduled"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {post.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 col: Campaign Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Campaign Trackers</h2>
            <Link href="/dashboard/campaigns" className="text-xs text-[#1a73e8] hover:text-[#155fc0] flex items-center font-semibold transition-colors">
              Manage Tracker
            </Link>
          </div>

          <div className="p-4 bg-[#0d1324] border border-gray-800 rounded-xl space-y-4 shadow-sm">
            {activeCampaigns.map((camp) => (
              <div key={camp.name} className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-300 truncate w-32">{camp.name}</span>
                  <span className="text-gray-500 text-[10px]">{camp.progress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-gray-800 overflow-hidden">
                  <div className={`h-full ${camp.color} rounded-full`} style={{ width: `${camp.progress}%` }}></div>
                </div>
                <p className="text-[10px] text-gray-500">{camp.posts}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
