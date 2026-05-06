/**
 * Web Search Extension for Pi
 *
 * Provides LLM-callable tools for searching:
 * - Hacker News (via Algolia API)
 * - Reddit (via native JSON API)
 * - GitHub Issues (via GitHub API)
 * - SearXNG (self-hosted search)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type, StringEnum } from "@mariozechner/pi-ai";

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clean(text: string | null | undefined): string {
	if (!text) return "";
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#x27;/g, "'")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function formatDate(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString().split("T")[0];
}

function parseAfter(value: string | undefined): number | undefined {
	if (!value) return undefined;
	if (/^\d+$/.test(value)) return parseInt(value, 10);
	const match = value.match(/^(\d+)([dmy])$/);
	if (!match) throw new Error(`Invalid after value: ${value}`);
	const amount = parseInt(match[1], 10);
	const days = { d: amount, m: amount * 30, y: amount * 365 }[match[2]] ?? amount;
	return Math.floor(Date.now() / 1000) - days * 86400;
}

async function fetchJSON(url: string, options?: { params?: Record<string, unknown>; headers?: Record<string, string> }): Promise<unknown> {
	let fullUrl = url;
	if (options?.params) {
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(options.params)) {
			if (value !== undefined) params.append(key, String(value));
		}
		fullUrl += `?${params.toString()}`;
	}
	const response = await fetch(fullUrl, {
		headers: {
			"Accept": "application/json",
			"User-Agent": "pi-websearch/1.0",
			...options?.headers,
		},
	});
	if (response.status === 429) throw new Error("Rate limited (HTTP 429)");
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return response.json();
}

// ---------------------------------------------------------------------------
// Hacker News
// ---------------------------------------------------------------------------

async function searchHN(query: string, size: number, type: string, sort: string, after?: string, minScore?: number) {
	const tagMap: Record<string, string> = { story: "story", comment: "comment", ask: "ask_hn,story", show: "show_hn,story" };
	const afterTs = after ? parseAfter(after) : undefined;
	const params: Record<string, unknown> = { query, tags: tagMap[type], hitsPerPage: size };
	if (afterTs) params.numericFilters = `created_at_i>${afterTs}`;

	const endpoint = sort === "date" ? "search_by_date" : "search";
	const data = await fetchJSON(`https://hn.algolia.com/api/v1/${endpoint}`, { params }) as Record<string, unknown>;
	const hits = (data.hits || []) as Array<Record<string, unknown>>;

	const items = hits.map(h => {
		const id = String(h.objectID || "");
		const created = h.created_at_i as number || 0;
		const item: Record<string, unknown> = {
			id,
			author: String(h.author || ""),
			score: (h.points as number) || (h.relevancy_score as number) || 0,
			comments: (h.num_comments as number) || 0,
			date: created ? formatDate(created) : "",
			url: String(h.url || `https://news.ycombinator.com/item?id=${id}`),
			body: clean(String(h.story_text || h.comment_text || "")),
		};
		if (h.title) item.title = clean(String(h.title));
		return item;
	});

	return minScore !== undefined ? items.filter(i => (i.score as number) >= minScore) : items;
}

async function getHNComments(postId: string, size: number) {
	const params = { tags: `comment,story_${postId}`, hitsPerPage: size };
	const data = await fetchJSON("https://hn.algolia.com/api/v1/search", { params }) as Record<string, unknown>;
	const hits = (data.hits || []) as Array<Record<string, unknown>>;

	return hits.map(h => ({
		id: String(h.objectID || ""),
		author: String(h.author || ""),
		score: (h.relevancy_score as number) || 0,
		date: h.created_at_i ? formatDate(h.created_at_i as number) : "",
		body: clean(String(h.comment_text || "")),
	}));
}

// ---------------------------------------------------------------------------
// Reddit
// ---------------------------------------------------------------------------

async function searchReddit(query: string, size: number, sort: string, time: string, subreddit?: string, minScore?: number) {
	const url = subreddit ? `https://www.reddit.com/r/${subreddit}/search.json` : "https://www.reddit.com/search.json";
	const params: Record<string, unknown> = { q: query, sort, limit: size, type: "link", t: time };
	if (subreddit) params.restrict_sr = "1";

	const data = await fetchJSON(url, { params }) as Record<string, unknown>;
	const children = ((data.data as Record<string, unknown>)?.children || []) as Array<{ data: Record<string, unknown> }>;

	const items = children.map(({ data: d }) => {
		let body = String(d.selftext || "");
		if (body === "[removed]" || body === "[deleted]") body = "";
		return {
			id: String(d.id || ""),
			title: clean(String(d.title || "")),
			author: String(d.author || ""),
			score: (d.score as number) || 0,
			comments: (d.num_comments as number) || 0,
			date: d.created_utc ? formatDate(d.created_utc as number) : "",
			url: `https://reddit.com${String(d.permalink || "")}`,
			body: clean(body),
		};
	});

	return minScore !== undefined ? items.filter(i => i.score >= minScore) : items;
}

async function getRedditComments(postId: string, size: number) {
	const url = `https://www.reddit.com/comments/${postId}.json`;
	const data = await fetchJSON(url) as Array<Record<string, unknown>>;
	const items: Array<Record<string, unknown>> = [];

	function extract(node: unknown): void {
		if (items.length >= size) return;
		if (typeof node !== "object" || node === null) return;
		const n = node as Record<string, unknown>;
		if (n.kind === "t1" && n.data) {
			const d = n.data as Record<string, unknown>;
			const body = String(d.body || "");
			if (body !== "[removed]" && body !== "[deleted]") {
				items.push({
					id: String(d.id || ""),
					author: String(d.author || ""),
					score: (d.score as number) || 0,
					date: d.created_utc ? formatDate(d.created_utc as number) : "",
					body: clean(body),
				});
			}
			if (d.replies) extract(d.replies);
		} else if (n.kind === "Listing" && n.data && typeof n.data === "object") {
			const children = ((n.data as Record<string, unknown>).children || []) as Array<unknown>;
			for (const child of children) extract(child);
		}
	}

	if (Array.isArray(data) && data.length >= 2) {
		const comments = ((data[1] as Record<string, unknown>).data as Record<string, unknown>)?.children || [];
		for (const child of comments as Array<unknown>) extract(child);
	}
	return items;
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

async function searchGitHub(query: string, size: number, repo?: string, state?: string, after?: string, minScore?: number) {
	let fullQuery = query;
	if (repo) fullQuery += ` repo:${repo}`;
	if (state && state !== "all") fullQuery += ` state:${state}`;

	const params = { q: fullQuery, per_page: size, sort: "comments" };
	const headers: Record<string, string> = { "Accept": "application/vnd.github+json" };
	const token = process.env.GITHUB_TOKEN;
	if (token) headers["Authorization"] = `Bearer ${token}`;

	const data = await fetchJSON("https://api.github.com/search/issues", { params, headers }) as Record<string, unknown>;
	const items = ((data.items || []) as Array<Record<string, unknown>>).map(i => {
		const created = String(i.created_at || "");
		return {
			id: String(i.number || ""),
			title: clean(String(i.title || "")),
			author: String((i.user as Record<string, unknown>)?.login || ""),
			score: ((i.reactions as Record<string, unknown>)?.["+1"] as number) || 0,
			comments: (i.comments as number) || 0,
			date: created ? created.slice(0, 10) : "",
			url: String(i.html_url || ""),
			body: clean(String(i.body || "")),
			labels: ((i.labels || []) as Array<{ name: string }>).map(l => l.name),
			state: String(i.state || ""),
		};
	});

	if (after) {
		const afterTs = parseAfter(after);
		return items.filter(i => {
			const ts = i.date ? Math.floor(new Date(i.date).getTime() / 1000) : 0;
			return !afterTs || ts >= afterTs;
		});
	}
	return minScore !== undefined ? items.filter(i => i.score >= minScore) : items;
}

// ---------------------------------------------------------------------------
// SearXNG
// ---------------------------------------------------------------------------

async function searchSearXNG(query: string, size: number, searxngUrl: string, categories?: string, timeRange?: string, after?: string) {
	const params: Record<string, unknown> = { q: query, format: "json", pageno: 1 };
	if (categories) params.categories = categories;
	if (timeRange) params.time_range = timeRange;

	const url = searxngUrl.replace(/\/$/, "") + "/search";
	const data = await fetchJSON(url, { params }) as Record<string, unknown>;
	const results = (data.results || []) as Array<Record<string, unknown>>;

	const afterTs = after ? parseAfter(after) : undefined;
	const seenUrls = new Set<string>();
	const items: Array<Record<string, unknown>> = [];

	for (const r of results) {
		const url = String(r.url || "");
		if (seenUrls.has(url)) continue;
		seenUrls.add(url);

		const published = String(r.publishedDate || "");
		let ts = 0;
		if (published) {
			try { ts = Math.floor(new Date(published).getTime() / 1000); } catch { ts = 0; }
		}
		if (afterTs && ts && ts < afterTs) continue;
		if (items.length >= size) break;

		items.push({
			title: clean(String(r.title || "")),
			url,
			body: clean(String(r.content || "")),
			date: published ? published.slice(0, 10) : "",
			score: Math.round(((r.score as number) || 0) * 1000) / 1000,
			engine: String(r.engine || ""),
		});
	}
	return items;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function webSearchExtension(pi: ExtensionAPI) {
	const searxngUrl = process.env.SEARXNG_URL ?? "https://search.dbamford.co.uk";

	pi.registerTool({
		name: "search_hn",
		label: "Search HN",
		description: "Search Hacker News stories and comments via Algolia",
		promptSnippet: "Search Hacker News for technical discussions",
		parameters: Type.Object({
			query: Type.String(),
			size: Type.Optional(Type.Number({ default: 10 })),
			type: Type.Optional(StringEnum(["story", "comment", "ask", "show"], { default: "story" })),
			sort: Type.Optional(StringEnum(["relevance", "date"], { default: "relevance" })),
			after: Type.Optional(Type.String()),
			minScore: Type.Optional(Type.Number()),
		}),
		async execute(_id, params) {
			const items = await searchHN(params.query, params.size ?? 10, params.type ?? "story", params.sort ?? "relevance", params.after, params.minScore);
			const text = items.length === 0 ? "No results." : items.map(i =>
				`${i.title || "Untitled"} (${i.score} pts, ${i.comments} cmts)\n  ${i.url}\n  By ${i.author} on ${i.date}`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: items.length, items } };
		},
	});

	pi.registerTool({
		name: "get_hn_comments",
		label: "HN Comments",
		description: "Fetch HN comments for a post",
		parameters: Type.Object({
			postId: Type.String(),
			size: Type.Optional(Type.Number({ default: 20 })),
		}),
		async execute(_id, params) {
			const comments = await getHNComments(params.postId, params.size ?? 20);
			const text = comments.length === 0 ? "No comments." : comments.map(c =>
				`@${c.author}: ${String(c.body).slice(0, 200)}${String(c.body).length > 200 ? "..." : ""}`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: comments.length, comments } };
		},
	});

	pi.registerTool({
		name: "search_reddit",
		label: "Search Reddit",
		description: "Search Reddit posts",
		promptSnippet: "Search Reddit for discussions",
		parameters: Type.Object({
			query: Type.String(),
			size: Type.Optional(Type.Number({ default: 10 })),
			sort: Type.Optional(StringEnum(["top", "new", "relevance", "hot", "rising"], { default: "relevance" })),
			time: Type.Optional(StringEnum(["hour", "day", "week", "month", "year", "all"], { default: "all" })),
			subreddit: Type.Optional(Type.String()),
			minScore: Type.Optional(Type.Number()),
		}),
		async execute(_id, params) {
			const items = await searchReddit(params.query, params.size ?? 10, params.sort ?? "relevance", params.time ?? "all", params.subreddit, params.minScore);
			const text = items.length === 0 ? "No results." : items.map(i =>
				`${i.title} (${i.score} upvotes)\n  ${i.url}\n  u/${i.author} on ${i.date}`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: items.length, items } };
		},
	});

	pi.registerTool({
		name: "get_reddit_comments",
		label: "Reddit Comments",
		description: "Fetch Reddit comments for a post",
		parameters: Type.Object({
			postId: Type.String(),
			size: Type.Optional(Type.Number({ default: 20 })),
		}),
		async execute(_id, params) {
			const comments = await getRedditComments(params.postId, params.size ?? 20);
			const text = comments.length === 0 ? "No comments." : comments.map(c =>
				`u/${c.author}: ${String(c.body).slice(0, 200)}...`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: comments.length, comments } };
		},
	});

	pi.registerTool({
		name: "search_github",
		label: "Search GitHub",
		description: "Search GitHub issues",
		promptSnippet: "Search GitHub issues for bugs/discussions",
		parameters: Type.Object({
			query: Type.String(),
			size: Type.Optional(Type.Number({ default: 10 })),
			repo: Type.Optional(Type.String()),
			state: Type.Optional(StringEnum(["open", "closed", "all"], { default: "open" })),
			after: Type.Optional(Type.String()),
			minScore: Type.Optional(Type.Number()),
		}),
		async execute(_id, params) {
			const items = await searchGitHub(params.query, params.size ?? 10, params.repo, params.state ?? "open", params.after, params.minScore);
			const text = items.length === 0 ? "No results." : items.map(i =>
				`#${i.id}: ${i.title} [${i.state}]\n  ${i.url} | ${i.comments} comments`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: items.length, items } };
		},
	});

	pi.registerTool({
		name: "search_web",
		label: "Search Web",
		description: "Web search via SearXNG",
		promptSnippet: "Search the web for general info",
		parameters: Type.Object({
			query: Type.String(),
			size: Type.Optional(Type.Number({ default: 10 })),
			categories: Type.Optional(Type.String()),
			timeRange: Type.Optional(StringEnum(["day", "week", "month", "year"])),
			after: Type.Optional(Type.String()),
		}),
		async execute(_id, params) {
			const items = await searchSearXNG(params.query, params.size ?? 10, searxngUrl, params.categories, params.timeRange, params.after);
			const text = items.length === 0 ? "No results." : items.map(i =>
				`${i.title}\n  ${i.url}\n  ${String(i.body).slice(0, 150)}...`
			).join("\n\n");
			return { content: [{ type: "text", text }], details: { count: items.length, items } };
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		ctx.ui.notify("Web search tools ready", "info");
	});
}
