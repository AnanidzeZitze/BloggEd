# Blog Publisher SaaS

A multi-tenant SaaS platform that enables users to manage multiple brands (Workspaces), campaigns (Series), and dynamically generate SEO-optimized blog posts using Google Gemini 2.5 Flash and Imagen 4.

## Tech Stack

- **Frontend & Backend:** Next.js 15 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** Clerk (User & Organization Management)
- **Database:** PostgreSQL with Prisma ORM
- **AI Engine:** Google Gemini SDK (`@google/genai`) for text and image generation
- **Publishing Platform:** Google Blogger API via Google APIs Client Library

## Core Features

1. **Brand Management (Workspaces):** Configure custom `brandContext` (target audience, tone of voice, etc.) and `blogTemplate` (custom formatting, rules, and styles).
2. **Campaign Orchestration (Series):** Group blog posts under campaigns with dedicated `campaignContext` goals.
3. **AI Post Generator:** Provide a topic and local context (URLs, notes, files). The system constructs a composite system prompt merging brand context, blog templates, and campaign context to generate highly specific, non-generic blog text in a Structured JSON format.
4. **Interactive Editor:** Review and edit the generated post blocks (headings, paragraphs, image prompts).
5. **Automated Metaphor Generation:** Generate stunning visual metaphor images via Imagen 4 based on section-specific content, upload to FreeImage.host, and render seamlessly in the blog.
6. **One-Click Blogger Publishing:** Connect to Google Blogger via OAuth 2.0 and publish live or draft posts instantly from the web interface.

## Local Development (Next Steps)

1. **Install Dependencies:**
   ```bash
   npx create-next-app@15 blog-publisher-saas --typescript --tailwind --app --eslint
   ```
2. **Set Up Environment Variables:**
   Create a `.env.local` file with:
   - `GEMINI_API_KEY`
   - `CLERK_SECRET_KEY`
   - `DATABASE_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

3. **Initialize Database:**
   ```bash
   npx prisma init
   ```
