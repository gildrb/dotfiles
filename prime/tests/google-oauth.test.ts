import { test } from "bun:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import registerGoogle, {
	applyAccountModels,
	createPkce,
	discoverGoogleModels,
	loginGoogle,
	parseDiscoveredModels,
	refreshGoogle,
} from "../extensions/google-oauth.ts";

test("Google OAuth registers, authenticates, discovers models, and refreshes safely", async () => {
	const extensionSource = readFileSync(join(import.meta.dir, "../extensions/google-oauth.ts"), "utf8");
	assert.match(extensionSource, /https:\/\/www\.googleapis\.com\/auth\/aicode/);
	assert.doesNotMatch(extensionSource, /experimentsandconfigs|auth\/cclog/);
	assert.match(extensionSource, /AUTH_TIMEOUT_MS/);
	assert.match(extensionSource, /MAX_DISCOVERED_MODELS/);

	const pkce = createPkce();
	assert.match(pkce.verifier, /^[A-Za-z0-9_-]{43}$/);
	assert.match(pkce.challenge, /^[A-Za-z0-9_-]{43}$/);
	assert.notEqual(pkce.verifier, pkce.challenge);

	let registeredProvider = "";
	let registeredConfig: any;
	registerGoogle({
		registerProvider(provider: string, config: unknown) {
			registeredProvider = provider;
			registeredConfig = config;
		},
	} as any);
	assert.equal(registeredProvider, "google-antigravity");
	assert.equal(registeredConfig.api, "google-gemini-cli");
	assert.equal(registeredConfig.oauth.name, "Google (Gemini subscription)");
	assert.equal(registeredConfig.oauth.usesCallbackServer, true);
	assert.deepEqual(registeredConfig.models, [], "the catalog comes from the authenticated account");

	const discovered = parseDiscoveredModels(
		{
			models: {
				"gemini-3.8-flash-high": {
					displayName: "Gemini 3.8 Flash (High)",
					supportsImages: true,
					supportsThinking: true,
					maxTokens: 900_000,
					maxOutputTokens: 40_000,
				},
				"gemini-internal": { isInternal: true },
				tab_flash_lite_preview: { displayName: "Tab completion" },
			},
		},
		"https://daily-cloudcode-pa.googleapis.com",
	);
	assert.deepEqual(discovered, [
		{
			id: "gemini-3.8-flash-high",
			name: "Gemini 3.8 Flash (High)",
			api: "google-gemini-cli",
			baseUrl: "https://daily-cloudcode-pa.googleapis.com",
			reasoning: true,
			input: ["text", "image"],
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			contextWindow: 900_000,
			maxTokens: 40_000,
		},
	]);
	assert.equal(parseDiscoveredModels({ models: [] }, "https://example.com"), null);
	assert.deepEqual(
		parseDiscoveredModels(
			{
				models: {
					"claude-sonnet-4-6": { displayName: "Claude Sonnet 4.6" },
					"gpt-oss-120b-medium": { displayName: "GPT-OSS 120B" },
				},
			},
			"https://daily-cloudcode-pa.googleapis.com",
		)?.map((model) => model.id),
		["claude-sonnet-4-6", "gpt-oss-120b-medium"],
	);
	const hardened = parseDiscoveredModels(
		{
			models: {
				"gemini-bad\n": { displayName: "bad" },
				"gemini-safe": {
					displayName: "Unsafe\nName",
					maxTokens: 99_000_000,
					maxOutputTokens: 88_000_000,
				},
			},
		},
		"https://daily-cloudcode-pa.googleapis.com",
	);
	assert.equal(hardened?.length, 1);
	assert.equal(hardened?.[0]?.name, "gemini-safe");
	assert.equal(hardened?.[0]?.contextWindow, 4_000_000);
	assert.equal(hardened?.[0]?.maxTokens, 262_144);

	const combined = applyAccountModels(
		[
			{ provider: "other", id: "keep" },
			{ provider: "google-antigravity", id: "old" },
		] as any,
		{
			access: "access",
			refresh: "refresh",
			expires: Date.now() + 1000,
			models: discovered,
		},
	);
	assert.deepEqual(
		combined.map((model) => [model.provider, model.id, model.name]),
		[
			["other", "keep", undefined],
			["google-antigravity", "gemini-3.8-flash-high", "Gemini 3.8 Flash (High)"],
		],
	);
	assert.deepEqual(
		applyAccountModels(combined, {
			access: "access",
			refresh: "refresh",
			expires: Date.now() + 1000,
			models: [],
		}).map((model) => model.id),
		["keep"],
	);

	const originalFetch = globalThis.fetch;
	try {
		let authUrl: URL | undefined;
		let tokenForm: URLSearchParams | undefined;
		let callbackRequest: Promise<Response> | undefined;
		let observedUserAgent: string | null = null;
		globalThis.fetch = async (input, init) => {
			const url = String(input);
			if (url.includes("antigravity-hub-auto-updater")) {
				return new Response("version: 2.12.0\n");
			}
			if (url === "https://oauth2.googleapis.com/token") {
				tokenForm = new URLSearchParams(String(init?.body));
				return Response.json({
					access_token: "oauth-access",
					refresh_token: "oauth-refresh",
					expires_in: 3600,
				});
			}
			if (url === "https://www.googleapis.com/oauth2/v3/userinfo") {
				return Response.json({ email: "person@example.com" });
			}
			if (url.endsWith("/v1internal:loadCodeAssist")) {
				observedUserAgent = new Headers(init?.headers).get("user-agent");
				return Response.json({
					cloudaicompanionProject: "account-project",
					currentTier: { id: "free-tier" },
					paidTier: null,
				});
			}
			if (url.endsWith("/v1internal:fetchAvailableModels")) {
				return Response.json({
					models: {
						"gemini-3.8-flash-high": {
							displayName: "Gemini 3.8 Flash (High)",
							supportsThinking: true,
						},
					},
				});
			}
			throw new Error(`unexpected OAuth request: ${url}`);
		};
		const loggedIn = await loginGoogle({
			onAuth(info) {
				authUrl = new URL(info.url);
				const state = authUrl.searchParams.get("state");
				assert.ok(state);
				const redirectUri = authUrl.searchParams.get("redirect_uri");
				assert.ok(redirectUri);
				callbackRequest = originalFetch(
					`${redirectUri}?code=authorization-code&state=${encodeURIComponent(state)}`,
				);
			},
			onPrompt: async () => "",
		});
		assert.equal((await callbackRequest)?.status, 200);
		assert.equal(loggedIn.projectId, "account-project");
		assert.equal(loggedIn.email, "person@example.com");
		assert.equal(
			loggedIn.userAgent,
			"antigravity/hub/2.12.0 (aidev_client; os_type=darwin; arch=arm64; cl=963137146)",
		);
		assert.equal(observedUserAgent, loggedIn.userAgent);
		assert.equal((loggedIn.models as Array<{ id: string }>)[0]?.id, "gemini-3.8-flash-high");
		assert.equal(authUrl?.origin, "https://accounts.google.com");
		assert.equal(authUrl?.searchParams.get("code_challenge_method"), "S256");
		assert.equal(authUrl?.searchParams.get("access_type"), "offline");
		assert.equal(authUrl?.searchParams.get("prompt"), "consent");
		assert.match(authUrl?.searchParams.get("scope") ?? "", /auth\/aicode/);
		const redirectUri = authUrl?.searchParams.get("redirect_uri") ?? "";
		assert.match(redirectUri, /^http:\/\/127\.0\.0\.1:\d+\/$/);
		assert.equal(tokenForm?.get("redirect_uri"), redirectUri);
		const verifier = tokenForm?.get("code_verifier");
		assert.ok(verifier);
		assert.equal(
			createHash("sha256").update(verifier).digest("base64url"),
			authUrl?.searchParams.get("code_challenge"),
		);
		assert.notEqual(verifier, authUrl?.searchParams.get("state"));
		const calls: string[] = [];
		globalThis.fetch = async (input) => {
			calls.push(String(input));
			if (calls.length === 1) return new Response("forbidden", { status: 403 });
			return Response.json({
				models: {
					"gemini-3.8-flash-medium": {
						displayName: "Gemini 3.8 Flash (Medium)",
						supportsThinking: true,
					},
				},
			});
		};
		const fallbackDiscovery = await discoverGoogleModels("secret-token", "project-1");
		assert.deepEqual(calls, [
			"https://daily-cloudcode-pa.googleapis.com/v1internal:fetchAvailableModels",
			"https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels",
		]);
		assert.equal(fallbackDiscovery?.[0]?.id, "gemini-3.8-flash-medium");
		assert.equal(fallbackDiscovery?.[0]?.baseUrl, "https://daily-cloudcode-pa.sandbox.googleapis.com");

		const savedModels = discovered!;
		let refreshCalls = 0;
		globalThis.fetch = async () => {
			refreshCalls += 1;
			if (refreshCalls === 1) {
				return Response.json({ access_token: "new-access", expires_in: 3600 });
			}
			return new Response("unavailable", { status: 503 });
		};
		const refreshed = await refreshGoogle({
			access: "old-access",
			refresh: "keep-refresh",
			expires: 0,
			projectId: "project-1",
			models: savedModels,
		});
		assert.equal(refreshed.access, "new-access");
		assert.equal(refreshed.refresh, "keep-refresh");
		assert.deepEqual(refreshed.models, savedModels);

		const controller = new AbortController();
		controller.abort();
		await assert.rejects(discoverGoogleModels("secret-token", "project-1", controller.signal), /Login cancelled/);

		globalThis.fetch = async () => Response.json({ expires_in: 3600 });
		await assert.rejects(
			refreshGoogle({
				access: "old-access",
				refresh: "keep-refresh",
				expires: 0,
				projectId: "project-1",
			}),
			/missing access_token/,
		);

		globalThis.fetch = async () => new Response("Bearer secret-token access_token=also-secret", { status: 400 });
		await assert.rejects(
			refreshGoogle({
				access: "old-access",
				refresh: "keep-refresh",
				expires: 0,
				projectId: "project-1",
			}),
			(error: unknown) =>
				error instanceof Error &&
				error.message.includes("[redacted]") &&
				!error.message.includes("secret-token") &&
				!error.message.includes("also-secret"),
		);
	} finally {
		globalThis.fetch = originalFetch;
	}
});
