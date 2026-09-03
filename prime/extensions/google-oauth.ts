/**
 * Google account OAuth for Prime Agent.
 *
 * OAuth, account setup, and model discovery live in dotfiles. Prime Agent only
 * provides the generic Cloud Code Assist transport (`google-gemini-cli`).
 */

import { createHash, randomBytes } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { Api, Model, OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ProviderModelConfig } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "google-antigravity";
// These installed-app credentials are embedded in Google's distributed Antigravity
// client. The client secret is therefore public application metadata, not a user secret.
const CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const CALLBACK_HOST = "127.0.0.1";
const CALLBACK_PATH = "/";
const CONTROL_ENDPOINT = "https://cloudcode-pa.googleapis.com";
const MODEL_ENDPOINTS = [
	"https://daily-cloudcode-pa.googleapis.com",
	"https://daily-cloudcode-pa.sandbox.googleapis.com",
	CONTROL_ENDPOINT,
] as const;
const SCOPES = [
	"https://www.googleapis.com/auth/cloud-platform",
	"https://www.googleapis.com/auth/userinfo.email",
	"https://www.googleapis.com/auth/aicode",
];
const VERSION_MANIFEST_URL =
	"https://antigravity-hub-auto-updater-974169037036.us-central1.run.app/manifest/latest-arm64-mac.yml";
const DEFAULT_ANTIGRAVITY_VERSION = "2.12.0";
const REQUEST_TIMEOUT_MS = 15_000;
const VERSION_REQUEST_TIMEOUT_MS = 5_000;
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;
const ONBOARD_TIMEOUT_MS = 30_000;
const TOKEN_EXPIRY_SKEW_MS = 5 * 60 * 1000;
const MAX_DISCOVERED_MODELS = 100;
const NON_CHAT_MODEL_IDS = new Set(["tab_flash_lite_preview", "tab_jump_flash_lite_preview"]);

export type GoogleAccountModel = ProviderModelConfig & { baseUrl: string };

type GoogleCredentials = OAuthCredentials & {
	projectId: string;
	email?: string;
	models?: GoogleAccountModel[];
	userAgent?: string;
};

type CallbackWaiter = {
	server: Server;
	redirectUri: string;
	waitForCode: () => Promise<string>;
};

type LoadCodeAssistResponse = {
	cloudaicompanionProject?: string | { id?: string };
	currentTier?: { id?: string } | null;
	paidTier?: { id?: string } | null;
	allowedTiers?: Array<{ id?: string; isDefault?: boolean }>;
	ineligibleTiers?: Array<{
		tierId?: string;
		reasonMessage?: string;
		validationUrl?: string;
	}>;
};

type OnboardOperation = {
	name?: string;
	done?: boolean;
	error?: { code?: number; message?: string };
	response?: { cloudaicompanionProject?: string | { id?: string } };
};

const FREE_MODEL_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0,
};

function loginCancelled(): Error {
	return new Error("Login cancelled");
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw loginCancelled();
}

function abortableWait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		throwIfAborted(signal);
		const onAbort = () => {
			clearTimeout(timer);
			reject(loginCancelled());
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

async function request(
	url: string,
	init: RequestInit,
	signal?: AbortSignal,
	timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
	throwIfAborted(signal);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const onAbort = () => controller.abort();
	signal?.addEventListener("abort", onAbort, { once: true });
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} catch (error) {
		if (signal?.aborted) throw loginCancelled();
		if (controller.signal.aborted) {
			throw new Error(`Google request timed out after ${timeoutMs}ms`);
		}
		throw error;
	} finally {
		clearTimeout(timeout);
		signal?.removeEventListener("abort", onAbort);
	}
}

function safeErrorDetail(raw: string): string {
	let detail = raw;
	try {
		const parsed = JSON.parse(raw) as { error?: { message?: unknown } };
		if (typeof parsed.error?.message === "string") detail = parsed.error.message;
	} catch {
		// Keep a bounded plain-text error when the response is not JSON.
	}
	return detail
		.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]")
		.replace(/(access_token|refresh_token|id_token)(["'\s:=]+)[^"'\s,}]+/gi, "$1$2[redacted]")
		.replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
		.slice(0, 1000);
}

async function responseJson(response: Response, label: string): Promise<Record<string, unknown>> {
	if (!response.ok) {
		const detail = safeErrorDetail(await response.text());
		throw new Error(`${label} failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
	}
	let value: unknown;
	try {
		value = await response.json();
	} catch {
		throw new Error(`${label} returned invalid JSON`);
	}
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${label} returned an invalid response`);
	}
	return value as Record<string, unknown>;
}

function base64Url(bytes: Buffer): string {
	return bytes.toString("base64url");
}

export function createPkce(): { verifier: string; challenge: string } {
	const verifier = base64Url(randomBytes(32));
	const challenge = base64Url(createHash("sha256").update(verifier).digest());
	return { verifier, challenge };
}

function parseManualRedirect(input: string, expectedState: string, redirectUri: string): string {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		throw new Error("Paste the complete Google redirect URL");
	}
	const expected = new URL(redirectUri);
	if (
		url.origin !== expected.origin ||
		url.pathname !== expected.pathname ||
		url.username ||
		url.password ||
		url.hash
	) {
		throw new Error("Untrusted Google redirect URL");
	}
	const states = url.searchParams.getAll("state");
	if (states.length !== 1 || states[0] !== expectedState) {
		throw new Error("OAuth state mismatch");
	}
	const error = url.searchParams.get("error");
	if (error) throw new Error(`Google authentication failed: ${error}`);
	const codes = url.searchParams.getAll("code");
	if (codes.length !== 1 || !codes[0]) {
		throw new Error("Google redirect URL is missing an authorization code");
	}
	return codes[0];
}

async function startCallbackServer(expectedState: string, signal?: AbortSignal): Promise<CallbackWaiter> {
	throwIfAborted(signal);
	return await new Promise((resolve, reject) => {
		let settled = false;
		let resolveCode: (code: string) => void;
		let rejectCode: (error: Error) => void;
		const codePromise = new Promise<string>((resolveValue, rejectValue) => {
			resolveCode = resolveValue;
			rejectCode = rejectValue;
		});
		// Abort can win before listen() completes. Attach a handler immediately so
		// that rejection cannot become an unhandled promise.
		void codePromise.catch(() => {});
		let authTimeout: ReturnType<typeof setTimeout> | undefined;
		const finish = (action: () => void) => {
			if (settled) return;
			settled = true;
			if (authTimeout) clearTimeout(authTimeout);
			action();
		};
		authTimeout = setTimeout(() => finish(() => rejectCode(new Error("Google sign-in timed out"))), AUTH_TIMEOUT_MS);
		const server = createServer((incoming, outgoing) => {
			if (incoming.method !== "GET") {
				outgoing.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
				outgoing.end("Method not allowed");
				return;
			}
			const url = new URL(incoming.url ?? "/", `http://${CALLBACK_HOST}`);
			if (url.pathname !== CALLBACK_PATH) {
				outgoing.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
				outgoing.end("Not found");
				return;
			}
			const states = url.searchParams.getAll("state");
			const codes = url.searchParams.getAll("code");
			const errors = url.searchParams.getAll("error");
			if (
				errors.length > 0 ||
				states.length !== 1 ||
				states[0] !== expectedState ||
				codes.length !== 1 ||
				!codes[0]
			) {
				outgoing.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
				outgoing.end("Google authentication did not complete.");
				if (errors[0]) {
					finish(() => rejectCode(new Error(`Google authentication failed: ${errors[0]}`)));
				}
				return;
			}
			outgoing.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
			outgoing.end("Google authentication completed. You can close this window.");
			finish(() => resolveCode(codes[0]!));
		});
		const onAbort = () => finish(() => rejectCode(loginCancelled()));
		signal?.addEventListener("abort", onAbort, { once: true });
		server.once("error", (error) => {
			if (authTimeout) clearTimeout(authTimeout);
			signal?.removeEventListener("abort", onAbort);
			reject(error);
		});
		server.listen(0, CALLBACK_HOST, () => {
			const address = server.address();
			if (!address || typeof address === "string") {
				server.close();
				reject(new Error("Google callback server did not receive a local port"));
				return;
			}
			resolve({
				server,
				redirectUri: `http://${CALLBACK_HOST}:${address.port}${CALLBACK_PATH}`,
				waitForCode: async () => {
					try {
						return await codePromise;
					} finally {
						signal?.removeEventListener("abort", onAbort);
					}
				},
			});
		});
	});
}

function closeServer(server: Server): Promise<void> {
	if (!server.listening) return Promise.resolve();
	return new Promise((resolve) => server.close(() => resolve()));
}

function antigravityUserAgent(version: string): string {
	return `antigravity/hub/${version} (aidev_client; os_type=darwin; arch=arm64; cl=963137146)`;
}

async function discoverUserAgent(signal?: AbortSignal): Promise<string> {
	try {
		const response = await request(
			VERSION_MANIFEST_URL,
			{ headers: { "Cache-Control": "no-cache", "User-Agent": "electron-builder" } },
			signal,
			VERSION_REQUEST_TIMEOUT_MS,
		);
		if (response.ok) {
			const match = /^\s*version\s*:\s*([0-9]+\.[0-9]+\.[0-9]+)\s*$/m.exec(await response.text());
			if (match?.[1]) return antigravityUserAgent(match[1]);
		}
	} catch {
		throwIfAborted(signal);
	}
	return antigravityUserAgent(DEFAULT_ANTIGRAVITY_VERSION);
}

function googleHeaders(accessToken: string, userAgent: string): Record<string, string> {
	return {
		Authorization: `Bearer ${accessToken}`,
		"Content-Type": "application/json",
		"User-Agent": userAgent,
	};
}

function projectIdFrom(value: unknown): string | undefined {
	if (typeof value === "string" && value.length > 0) return value;
	if (value && typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;
		if (typeof id === "string" && id.length > 0) return id;
	}
	return undefined;
}

async function postControl(
	path: string,
	accessToken: string,
	userAgent: string,
	body: Record<string, unknown>,
	signal?: AbortSignal,
	timeoutMs?: number,
): Promise<Record<string, unknown>> {
	return responseJson(
		await request(
			`${CONTROL_ENDPOINT}${path}`,
			{
				method: "POST",
				headers: googleHeaders(accessToken, userAgent),
				body: JSON.stringify(body),
			},
			signal,
			timeoutMs,
		),
		path,
	);
}

async function loadCodeAssist(
	accessToken: string,
	userAgent: string,
	projectId?: string,
	signal?: AbortSignal,
): Promise<LoadCodeAssistResponse> {
	const body: Record<string, unknown> = {
		metadata: { ideType: "ANTIGRAVITY" },
	};
	if (projectId) body.cloudaicompanionProject = projectId;
	return (await postControl(
		"/v1internal:loadCodeAssist",
		accessToken,
		userAgent,
		body,
		signal,
	)) as LoadCodeAssistResponse;
}

async function discoverProject(
	accessToken: string,
	userAgent: string,
	onProgress?: (message: string) => void,
	signal?: AbortSignal,
): Promise<string> {
	onProgress?.("Checking Google account access...");
	let status = await loadCodeAssist(accessToken, userAgent, undefined, signal);
	const initialProject = projectIdFrom(status.cloudaicompanionProject);
	if (initialProject && status.paidTier == null) {
		status = await loadCodeAssist(accessToken, userAgent, initialProject, signal);
	}
	const ineligible = status.ineligibleTiers?.find((tier) => tier.tierId === "free-tier" && tier.reasonMessage);
	if (!status.currentTier && ineligible) {
		throw new Error(`${ineligible.reasonMessage}${ineligible.validationUrl ? `\n${ineligible.validationUrl}` : ""}`);
	}
	let onboardedProject: string | undefined;
	if (!status.currentTier) {
		onProgress?.("Provisioning Google AI access...");
		const deadline = Date.now() + ONBOARD_TIMEOUT_MS;
		let operation = (await postControl(
			"/v1internal:onboardUser",
			accessToken,
			userAgent,
			{ tierId: "free-tier", metadata: { ideType: "ANTIGRAVITY" } },
			signal,
			Math.max(1, deadline - Date.now()),
		)) as OnboardOperation;
		while (!operation.done) {
			throwIfAborted(signal);
			if (!operation.name || Date.now() >= deadline) {
				throw new Error("Google account provisioning timed out");
			}
			await abortableWait(1000, signal);
			operation = (await responseJson(
				await request(
					`${CONTROL_ENDPOINT}/v1internal/${operation.name}`,
					{ method: "GET", headers: googleHeaders(accessToken, userAgent) },
					signal,
					Math.max(1, deadline - Date.now()),
				),
				"Google account provisioning",
			)) as OnboardOperation;
		}
		if (operation.error) {
			throw new Error(
				`Google account provisioning failed: ${operation.error.message ?? operation.error.code ?? "unknown error"}`,
			);
		}
		onboardedProject = projectIdFrom(operation.response?.cloudaicompanionProject);
	}
	onProgress?.("Loading Google project...");
	status = await loadCodeAssist(accessToken, userAgent, undefined, signal);
	const projectId = projectIdFrom(status.cloudaicompanionProject) ?? onboardedProject;
	if (!projectId) throw new Error("Google did not return an account project");
	return projectId;
}

function cleanModelString(value: unknown, fallback: string): string {
	return typeof value === "string" &&
		value.length > 0 &&
		value.length <= 200 &&
		!/[\u0000-\u001f\u007f-\u009f]/.test(value)
		? value
		: fallback;
}

function positiveLimit(value: unknown, fallback: number, maximum: number): number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? Math.min(value, maximum) : fallback;
}

export function parseDiscoveredModels(payload: unknown, baseUrl: string): GoogleAccountModel[] | null {
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
	const rawModels = (payload as { models?: unknown }).models;
	if (!rawModels || typeof rawModels !== "object" || Array.isArray(rawModels)) {
		return null;
	}
	const models: GoogleAccountModel[] = [];
	for (const [id, raw] of Object.entries(rawModels)) {
		if (models.length >= MAX_DISCOVERED_MODELS) break;
		if (
			!/^[a-z0-9][a-z0-9._/-]*$/.test(id) ||
			NON_CHAT_MODEL_IDS.has(id) ||
			id.length > 200 ||
			!raw ||
			typeof raw !== "object" ||
			Array.isArray(raw)
		) {
			continue;
		}
		const details = raw as Record<string, unknown>;
		if (details.isInternal === true) continue;
		const contextWindow = positiveLimit(details.maxTokens, 1_048_576, 4_000_000);
		const maxTokens = Math.min(positiveLimit(details.maxOutputTokens, 65_536, 262_144), contextWindow);
		models.push({
			id,
			name: cleanModelString(details.displayName, id),
			api: "google-gemini-cli",
			baseUrl,
			reasoning: details.supportsThinking === true,
			input: details.supportsImages === true ? ["text", "image"] : ["text"],
			cost: FREE_MODEL_COST,
			contextWindow,
			maxTokens,
		});
	}
	models.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	return models;
}

export async function discoverGoogleModels(
	accessToken: string,
	projectId: string,
	signal?: AbortSignal,
	userAgent = antigravityUserAgent(DEFAULT_ANTIGRAVITY_VERSION),
): Promise<GoogleAccountModel[] | null> {
	for (const endpoint of MODEL_ENDPOINTS) {
		try {
			const payload = await responseJson(
				await request(
					`${endpoint}/v1internal:fetchAvailableModels`,
					{
						method: "POST",
						headers: googleHeaders(accessToken, userAgent),
						body: JSON.stringify({ project: projectId }),
					},
					signal,
				),
				"Google model discovery",
			);
			const models = parseDiscoveredModels(payload, endpoint);
			if (models) return models;
		} catch (error) {
			throwIfAborted(signal);
			if (endpoint === MODEL_ENDPOINTS.at(-1)) throw error;
		}
	}
	return null;
}

async function getEmail(accessToken: string, signal?: AbortSignal): Promise<string | undefined> {
	try {
		const payload = await responseJson(
			await request(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } }, signal),
			"Google user info",
		);
		return typeof payload.email === "string" ? payload.email : undefined;
	} catch {
		throwIfAborted(signal);
		return undefined;
	}
}

function credentialsFromToken(payload: Record<string, unknown>, previous?: GoogleCredentials): GoogleCredentials {
	if (typeof payload.access_token !== "string" || !payload.access_token) {
		throw new Error("Google token response is missing access_token");
	}
	const refresh =
		typeof payload.refresh_token === "string" && payload.refresh_token ? payload.refresh_token : previous?.refresh;
	if (!refresh) throw new Error("Google token response is missing refresh_token");
	const lifetime = typeof payload.expires_in === "number" && payload.expires_in > 0 ? payload.expires_in : 3600;
	return {
		refresh,
		access: payload.access_token,
		expires: Date.now() + lifetime * 1000 - TOKEN_EXPIRY_SKEW_MS,
		projectId: previous?.projectId ?? "",
		email: previous?.email,
		models: previous?.models,
		userAgent: previous?.userAgent,
	};
}

async function exchangeToken(fields: Record<string, string>, signal?: AbortSignal): Promise<Record<string, unknown>> {
	return responseJson(
		await request(
			TOKEN_URL,
			{
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
					...fields,
				}),
			},
			signal,
		),
		"Google token exchange",
	);
}

export async function loginGoogle(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
	const { verifier, challenge } = createPkce();
	const state = base64Url(randomBytes(32));
	callbacks.onProgress?.("Starting Google sign-in...");
	const callback = await startCallbackServer(state, callbacks.signal);
	try {
		const authUrl = new URL(AUTH_URL);
		authUrl.search = new URLSearchParams({
			client_id: CLIENT_ID,
			response_type: "code",
			redirect_uri: callback.redirectUri,
			scope: SCOPES.join(" "),
			code_challenge: challenge,
			code_challenge_method: "S256",
			state,
			access_type: "offline",
			prompt: "consent",
		}).toString();
		callbacks.onAuth({
			url: authUrl.href,
			instructions: "Complete the Google sign-in in your browser.",
		});
		callbacks.onProgress?.("Waiting for Google authorization...");
		const browserCode = callback.waitForCode();
		const manualCode = callbacks
			.onManualCodeInput?.()
			.then((value) => parseManualRedirect(value, state, callback.redirectUri));
		const code = await (manualCode ? Promise.race([browserCode, manualCode]) : browserCode);
		const tokenPayload = await exchangeToken(
			{
				code,
				grant_type: "authorization_code",
				redirect_uri: callback.redirectUri,
				code_verifier: verifier,
			},
			callbacks.signal,
		);
		const credentials = credentialsFromToken(tokenPayload);
		credentials.email = await getEmail(credentials.access, callbacks.signal);
		callbacks.onProgress?.("Checking the current Antigravity client version...");
		credentials.userAgent = await discoverUserAgent(callbacks.signal);
		credentials.projectId = await discoverProject(
			credentials.access,
			credentials.userAgent,
			callbacks.onProgress,
			callbacks.signal,
		);
		callbacks.onProgress?.("Discovering models available to this account...");
		const accountModels = await discoverGoogleModels(
			credentials.access,
			credentials.projectId,
			callbacks.signal,
			credentials.userAgent,
		);
		if (!accountModels || accountModels.length === 0) {
			throw new Error("Google returned no account-available models");
		}
		credentials.models = accountModels;
		return credentials;
	} finally {
		await closeServer(callback.server);
	}
}

export async function refreshGoogle(credentials: OAuthCredentials): Promise<OAuthCredentials> {
	const previous = credentials as GoogleCredentials;
	if (!previous.projectId) throw new Error("Google credentials are missing projectId");
	const tokenPayload = await exchangeToken({
		refresh_token: previous.refresh,
		grant_type: "refresh_token",
	});
	const refreshed = credentialsFromToken(tokenPayload, previous);
	refreshed.userAgent = await discoverUserAgent();
	try {
		refreshed.models =
			(await discoverGoogleModels(refreshed.access, refreshed.projectId, undefined, refreshed.userAgent)) ??
			previous.models;
	} catch {
		refreshed.models = previous.models;
	}
	return refreshed;
}

function validStoredModels(value: unknown): GoogleAccountModel[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const models: GoogleAccountModel[] = [];
	for (const entry of value.slice(0, MAX_DISCOVERED_MODELS)) {
		if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
		const stored = entry as Record<string, unknown>;
		const id = stored.id;
		if (
			typeof id !== "string" ||
			!/^[a-z0-9][a-z0-9._/-]*$/.test(id) ||
			NON_CHAT_MODEL_IDS.has(id) ||
			id.length > 200
		) {
			continue;
		}
		const baseUrl = MODEL_ENDPOINTS.find((endpoint) => endpoint === stored.baseUrl);
		const contextWindow = positiveLimit(stored.contextWindow, 1_048_576, 4_000_000);
		const maxTokens = Math.min(positiveLimit(stored.maxTokens, 65_536, 262_144), contextWindow);
		models.push({
			id,
			name: cleanModelString(stored.name, id),
			api: "google-gemini-cli",
			baseUrl: baseUrl ?? MODEL_ENDPOINTS[0],
			reasoning: stored.reasoning === true,
			input: Array.isArray(stored.input) && stored.input.includes("image") ? ["text", "image"] : ["text"],
			cost: FREE_MODEL_COST,
			contextWindow,
			maxTokens,
		});
	}
	return models;
}

export function applyAccountModels(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[] {
	const discovered = validStoredModels(credentials.models);
	if (!discovered) return models;
	return [
		...models.filter((model) => model.provider !== PROVIDER_ID),
		...discovered.map((model) => ({ ...model, provider: PROVIDER_ID }) as Model<Api>),
	];
}

export default function (pi: ExtensionAPI) {
	pi.registerProvider(PROVIDER_ID, {
		name: "Google",
		baseUrl: MODEL_ENDPOINTS[0],
		api: "google-gemini-cli",
		models: [],
		oauth: {
			name: "Google (Gemini subscription)",
			usesCallbackServer: true,
			login: loginGoogle,
			refreshToken: refreshGoogle,
			getApiKey: (credentials) => {
				const google = credentials as GoogleCredentials;
				return JSON.stringify({
					token: google.access,
					projectId: google.projectId,
					userAgent: google.userAgent,
				});
			},
			modifyModels: applyAccountModels,
		},
	});
}
