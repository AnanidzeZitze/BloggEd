// Downloadable guide templates for workspace, campaign, and post template setup.
// Structured so the parsers in file-parsers.ts extract the right fields automatically
// once the user fills them in and re-uploads.

// ---------------------------------------------------------------------------
// Workspace / Brand Guide
// ---------------------------------------------------------------------------
// Parsed fields: name (from # heading), brandContext (## Brand Context),
//                blogTemplate (## Writing Brief)

export const WORKSPACE_GUIDE_TEMPLATE = `# [Your Brand or Company Name]

> INSTRUCTIONS: Replace every line that starts with [brackets] with your real content.
> Delete these instruction lines when you're done.
> Save this file and upload it in Settings → "Import brand guide".
> Supported formats: .md, .txt, .docx, .json
> The section headings (## Brand Context, ## Writing Brief) must stay exactly as written.

---

## Brand Context

**Who you are writing for**
[Describe your primary reader. Be specific — job title, industry, company size, the decisions they make, and what keeps them up at night. The more precise this is, the more the AI will calibrate its examples and language to match.]

Example: Senior marketing leaders (VP and above) at B2B SaaS companies with 50–500 employees. They own the demand gen and martech budget. They read to make real decisions this quarter — not to learn theory.

**Tone of Voice**
[Pick 3–5 adjectives that describe your voice. For each one, write a sentence explaining what it looks like on the page — not just "authoritative" but what authoritative means in practice for your brand.]

Example:
- Skeptical: We name the hype directly. We don't "challenge" assumptions — we call out bad conventional wisdom.
- Practitioner-first: Every insight is useful to someone building something right now. No empty theory.
- Authoritative: We have strong opinions and back them with evidence. We say "most marketers get this wrong" when it's true.
- Slightly contrarian: We take the position the industry hasn't accepted yet, then make the case for it.

**Niche and Coverage Area**
[What topics do you cover? What is your specific angle? What do you explicitly NOT write about?]

Example: B2B marketing operations, martech stack strategy, first-party data, AI in marketing. We do not cover brand, creative, or consumer marketing.

**What Makes You Different**
[Why should someone read your blog instead of any other? What unique insight, access, or experience do you bring?]

Example: We are practitioners who have built and broken these systems ourselves. We cite real numbers from real companies — not vendor case studies or analyst reports.

---

## Writing Brief

**Voice and Rhythm Rules**
[Specific rules about how sentences and paragraphs should be written. Think about sentence rhythm, what moves to avoid, what patterns you want to encourage.]

Example:
- No em dashes (—). Use commas, colons, or periods instead.
- Vary paragraph length deliberately. Mix 1-sentence punches with longer analytical paragraphs.
- Lead with the claim, not the setup.
- No rhetorical questions followed by an immediate answer ("What does this mean? It means X."). State the claim directly.
- No trailing "ensuring" or "allowing" clauses at the end of sentences. Cut them.

**Banned Words and Replacements**
[Words or phrases that sound generic, AI-generated, or off-brand. Include a replacement for each.]

Example:
- delve → explore, examine, dig into
- leverage → use
- utilize → use
- robust → strong, reliable, solid
- seamless → smooth
- cutting-edge → modern, latest, advanced
- game-changer → [describe the actual change instead]
- journey → process, path, work
- comprehensive → thorough, complete, full
- it's worth noting → [just say the thing]
- at the end of the day → [cut it entirely]

**Structure Preferences**
[How do you want posts built? How should introductions work? What should each section do?]

Example:
- Open with a claim or a scene, not a question or a statistic.
- Each H2 section should advance a single clear argument.
- End sections with a consequence or implication, not a summary of what was just said.
- Conclusions should open a new question or call to action — not recap the post.

**Evidence Standards**
[What proof do you require in your posts? What sources are acceptable or off-limits?]

Example:
- Every major claim needs either a named source, a statistic, or a concrete example from a real company.
- Name the company or executive when citing examples. Vague attribution weakens the argument.
- Prefer primary data over vendor whitepapers.
- Do not use hedged attribution like "experts say" or "some companies report."
`;

// ---------------------------------------------------------------------------
// Campaign Brief
// ---------------------------------------------------------------------------
// Parsed fields: name (from # heading), description (first paragraph after #),
//                campaignContext (## Context), keywordCluster (## Keywords)

export const CAMPAIGN_GUIDE_TEMPLATE = `# [Campaign or Series Name]
[One sentence: what this series covers and who it is for. This becomes the series description.]

> INSTRUCTIONS: Replace every line that starts with [brackets] with your real content.
> Delete these instruction lines when you're done.
> Save this file and upload it in the Campaign detail page → "Import brief".
> Supported formats: .md, .txt, .docx, .json
> The section headings (## Context, ## Keywords) must stay exactly as written.

---

## Context

**What is this series about?**
[Describe the theme and scope. What question is the series answering across all its posts? What central thesis is it building toward? This text is injected into every AI generation prompt for posts in this series.]

Example: This series audits the most widely-used B2B martech tools honestly — based on what actually moves the needle for mid-market teams, not vendor claims. Each post focuses on a single category (CRM, MAP, CDP, etc.) and evaluates 3–5 tools against real-world use cases.

**Who specifically is this series for?**
[Be more specific than your general audience. What stage of consideration? What job are they trying to get done right now?]

Example: Marketing Ops leads at companies evaluating their first or second martech stack replacement. They have a budget, a shortlist, and 90 days to make a decision.

**What should a reader be able to DO after reading this series?**
[The concrete outcome or decision this series enables. This keeps the AI focused on practical, actionable content rather than general coverage.]

Example: Walk into a vendor negotiation knowing exactly what questions to ask, what red flags to look for, and what fair pricing looks like.

**Angle and Point of View**
[What is the editorial stance? Skeptical? Investigative? Comparative? Celebratory? This shapes the AI's framing across every post in the series.]

Example: Skeptical-but-fair. We assume the reader has been burned by overpromising vendors before. We call out when the ROI story doesn't hold up, but we also recognize when a tool genuinely delivers.

---

## Keywords

[List the SEO target keywords and topical clusters for this series. One per line or comma-separated. These are injected into every generation prompt to keep posts topically on-target.]

Example:
martech stack review 2025
B2B marketing automation comparison
HubSpot vs Salesforce Marketing Cloud
CDP platforms mid-market
marketing operations tools
demand gen technology stack
`;

// ---------------------------------------------------------------------------
// Post Template / Prose Brief
// ---------------------------------------------------------------------------
// Parsed fields: name (from # heading), description (first paragraph after #),
//                proseBrief (## Prose Brief)

export const POST_TEMPLATE_GUIDE = `# [Template Name — e.g. Opinion / Hot Take]
[One sentence: post style, typical word count, and best use case. This becomes the template description.]

> INSTRUCTIONS: Replace every line that starts with [brackets] with your real content.
> Delete these instruction lines when you're done.
> Save this file and upload it in Post Templates → New Template → "Import".
> Supported formats: .md, .txt, .docx, .json
> The section heading (## Prose Brief) must stay exactly as written.

---

## Prose Brief

**When to use this template**
[Describe the situation that calls for this post style. What topic types, what audience state of mind, what editorial goal?]

Example: Use Opinion / Hot Take when you want to stake out a position the industry hasn't accepted yet, or push back on a widely-held belief. Best when you have a strong point of view and at least one piece of evidence most readers haven't encountered.

**Opening Hook**
[How should this post type open? What should the first paragraph accomplish? What is off-limits for the intro?]

Example: Open with the claim — don't build to it. The first sentence should be the most provocative thing in the post. Do not start with a statistic, a question, or scene-setting. State the position immediately.

**Argument Structure**
[How should the body of the post build its argument? Describe each major section's job, not just its topic.]

Example:
- Section 1: The accepted wisdom — what most people currently believe and why it's reasonable
- Section 2: The evidence that contradicts it — the specific data or example that creates the turn
- Section 3: The better explanation — what's actually happening and why the accepted view misses it
- Section 4: What this means in practice — a concrete implication for someone making a real decision today
- Section 5: The challenge — what the reader should now question or try differently

**Evidence Requirements**
[What proof must be in this post type? How much? What is off-limits as a source?]

Example:
- Minimum two specific data points: named statistics, named company examples, or direct quotes
- At least one named company or executive as a concrete example — no vague attribution
- No hedged evidence ("some experts say," "many companies report") — be specific or omit it
- Vendor case studies are not acceptable as primary evidence
- Analyst reports are acceptable only when citing a specific stat with attribution

**Voice Notes Specific to This Style**
[Any voice rules specific to this template that stack on top of the workspace writing guide. Only add rules here that are unique to this post type.]

Example:
- This is an opinion piece — use first-person or editorial "we" where appropriate
- Do not soften the conclusion with qualifications — commit to the position
- The headline must make a specific claim, not ask a question
- No "to be sure," "it's worth noting," or "of course" hedges anywhere in the post

**Structural Anti-Patterns to Avoid**
[What are the most common ways posts of this type go wrong? List the specific failure modes so the AI avoids them.]

Example:
- Do not spend more than 150 words setting up the problem before stating the argument
- Do not end with a "balanced" conclusion that undercuts the take
- Do not use a bullet-pointed "Key Takeaways" section — conclusions should be prose
- Do not use a numbered list for the main argument — each section should be a flowing section, not a listicle step
`;

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadGuideTemplate(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
