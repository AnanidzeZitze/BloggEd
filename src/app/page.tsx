import Link from "next/link";
import Image from "next/image";
import { Sparkles, Globe, FolderKanban, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      {/* Nav */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <Image src="/BloggEd_Logo.png" alt="BloggEd" height={36} width={120} className="h-9 w-auto" priority />
        <div className="flex items-center space-x-3">
          <Link
            href="/sign-in"
            className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm bg-[#1a73e8] hover:bg-[#155fc0] text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center space-x-2 bg-[#1a73e8]/10 border border-[#1a73e8]/30 text-[#60a5fa] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Powered by Gemini 2.5 Flash + Imagen</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight max-w-3xl mb-6">
          AI blog content,{" "}
          <span className="text-[#1a73e8]">published to Blogger</span>{" "}
          in one click.
        </h1>

        <p className="text-gray-400 text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Manage multiple brands, create campaign series, generate long-form posts with AI-written content and generated images, then publish directly to Google Blogger.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/sign-up"
            className="flex items-center bg-[#1a73e8] hover:bg-[#155fc0] text-white font-semibold px-6 py-3 rounded-xl shadow-lg shadow-[#1a73e8]/20 transition-colors text-sm"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start generating posts
          </Link>
          <Link
            href="/sign-in"
            className="flex items-center border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
          >
            Sign in to dashboard
          </Link>
        </div>
      </main>

      {/* Feature strip */}
      <section className="border-t border-gray-800 px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: FolderKanban,
              title: "Campaign series",
              desc: "Group posts under thematic campaigns. Each series injects its own strategic context into the AI writer.",
            },
            {
              icon: Sparkles,
              title: "AI-generated content",
              desc: "Gemini 2.5 Flash produces structured long-form posts with section blocks, subtitles, and visual metaphors.",
            },
            {
              icon: Globe,
              title: "One-click publishing",
              desc: "Posts compile to styled HTML and push directly to your Google Blogger account as a draft.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl bg-[#0d1324] border border-gray-800 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-[#1a73e8]/10 text-[#1a73e8] flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-800 px-6 py-5 text-center text-xs text-gray-600">
        BloggEd &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
