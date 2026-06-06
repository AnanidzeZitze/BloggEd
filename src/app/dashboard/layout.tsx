"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { 
  LayoutDashboard, 
  Settings, 
  FolderKanban, 
  FileText, 
  ChevronsUpDown, 
  Plus, 
  Globe, 
  Sparkles,
  BookOpen
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [activeBrand, setActiveBrand] = useState("Signal & Noise");
  const [brands, setBrands] = useState([
    { name: "Signal & Noise", industry: "AI Marketing", slug: "signal-noise" },
    { name: "SaaS Rocket", industry: "Growth Hacking", slug: "saas-rocket" },
  ]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandIndustry, setNewBrandIndustry] = useState("");

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Campaigns", href: "/dashboard/campaigns", icon: FolderKanban },
    { name: "Blog Posts", href: "/dashboard/posts", icon: FileText },
    { name: "Brand Context & Template", href: "/dashboard/settings", icon: Settings },
  ];

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    const slug = newBrandName.toLowerCase().replace(/\s+/g, "-");
    const newBrand = {
      name: newBrandName,
      industry: newBrandIndustry || "General",
      slug,
    };
    setBrands([...brands, newBrand]);
    setActiveBrand(newBrandName);
    setNewBrandName("");
    setNewBrandIndustry("");
    setShowAddBrandModal(false);
  };

  return (
    <div className="flex h-screen bg-[#0b0f19] text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0d1324] border-r border-gray-800 flex flex-col z-10">
        {/* Brand Switcher */}
        <div className="p-4 border-b border-gray-800 relative">
          <button 
            onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-[#161f38] hover:bg-[#1f2b4e] transition-colors border border-gray-700"
          >
            <div className="flex items-center text-left">
              <div className="w-8 h-8 rounded-md bg-[#1a73e8] flex items-center justify-center mr-2 shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold truncate w-36">{activeBrand}</p>
                <p className="text-xs text-gray-400 truncate w-36">
                  {brands.find(b => b.name === activeBrand)?.industry || "Marketing"}
                </p>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-gray-400" />
          </button>

          {isSwitcherOpen && (
            <div className="absolute top-16 left-4 right-4 bg-[#11192e] border border-gray-700 rounded-lg shadow-xl z-20 p-1">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold p-2">Switch Workspace</p>
              {brands.map((brand) => (
                <button
                  key={brand.slug}
                  onClick={() => {
                    setActiveBrand(brand.name);
                    setIsSwitcherOpen(false);
                  }}
                  className={`w-full text-left p-2 rounded-md hover:bg-[#1a233d] transition-colors flex items-center justify-between text-xs ${
                    activeBrand === brand.name ? "bg-[#161f38] text-white font-semibold" : "text-gray-300"
                  }`}
                >
                  <span>{brand.name}</span>
                  {activeBrand === brand.name && <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]"></span>}
                </button>
              ))}
              <div className="border-t border-gray-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowAddBrandModal(true);
                    setIsSwitcherOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-md text-xs text-[#1a73e8] hover:bg-[#1a233d] transition-colors flex items-center"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add New Brand
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive 
                    ? "bg-[#1a73e8] text-white font-semibold shadow-md shadow-[#1a73e8]/20" 
                    : "text-gray-400 hover:text-white hover:bg-[#161f38]"
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between bg-[#0a0e1c]">
          <div className="flex items-center space-x-3">
            <UserButton />
            <div>
              <p className="text-xs font-semibold text-gray-200">Jane Doe</p>
              <p className="text-[10px] text-gray-400">Marketing Partner</p>
            </div>
          </div>
          <Link href="/dashboard/settings" title="Workspace Settings">
            <Settings className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[#0d1324] border-b border-gray-800 flex items-center justify-between px-6 z-0">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Globe className="w-4 h-4 text-gray-500" />
            <span>Workspace:</span>
            <span className="font-semibold text-gray-200">{activeBrand}</span>
          </div>
          <div className="flex items-center space-x-4">
            <button className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Generate Post
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {/* Add Brand Modal */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#11192e] border border-gray-700 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center">
              <Sparkles className="w-5 h-5 text-[#1a73e8] mr-2" />
              Configure New Brand
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Workspaces isolate brand rules, style templates, and social publishing configurations.
            </p>
            <form onSubmit={handleAddBrand} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Tech"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-semibold mb-1">Industry / Category</label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise SaaS"
                  value={newBrandIndustry}
                  onChange={(e) => setNewBrandIndustry(e.target.value)}
                  className="w-full bg-[#161f38] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1a73e8] text-white"
                />
              </div>
              <div className="flex space-x-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddBrandModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 text-xs hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1a73e8] text-white text-xs hover:bg-[#155fc0] transition-colors font-semibold"
                >
                  Create Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
