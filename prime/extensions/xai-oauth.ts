/**
 * xAI (Grok) OAuth device-code login for Prime Agent.
 *
 * Prime Agent's vendored pi-ai fork (0.8.0) predates upstream's xAI OAuth
 * flow, so this extension re-registers the built-in `xai` provider with an
 * OAuth provider, ported from pi's pi-ai xai/device-code implementation
 * (pi 0.84.2). Registering `oauth` on the existing provider only adds the
 * /login flow; the built-in grok models are untouched.
 */

import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const XAI_CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828";
const XAI_SCOPE = "openid profile email offline_access grok-cli:access api:access";
const XAI_DEVICE_CODE_URL = "https://auth.x.ai/oauth2/device/code";
const XAI_TOKEN_URL = "https://auth.x.ai/oauth2/token";
// Refresh slightly before the reported expiry to avoid using a token that dies mid-request.
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 3600;

// RFC 8628 section 3.2: if the authorization server omits `interval`, poll every 5 seconds.
const DEFAULT_POLL_INTERVAL_SECONDS = 5;
// RFC 8628 section 3.5: `slow_down` means the polling interval must increase by 5 seconds.
const SLOW_DOWN_INTERVAL_INCREMENT_MS = 5000;
const MINIMUM_INTERVAL_MS = 1000;

type DeviceCode = {
	deviceCode: string;
	userCode: string;
	verificationUri: string;
	verificationUriComplete?: string;
	intervalSeconds?: number;
	expiresInSeconds: number;
};

type FormResponse = {
	ok: boolean;
	status: number;
	body: Record<string, unknown>;
};

function requiredString(body: Record<string, unknown>, field: string): string {
	const value = body[field];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Invalid xAI OAuth response field: ${field}`);
	}
	return value;
}

function positiveNumber(body: Record<string, unknown>, field: string): number {
	const value = body[field];
	if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
		throw new Error(`Invalid xAI OAuth response field: ${field}`);
	}
	return value;
}

// The verification URI is opened in the user's browser; force it to be an https URL
// so a malicious response cannot make `open` launch something else.
function validateVerificationUri(raw: string): string {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new Error("Untrusted verification URI in xAI OAuth response");
	}
	if (url.protocol !== "https:") {
		throw new Error("Untrusted verification URI in xAI OAuth response");
	}
	return url.href;
}

async function postForm(url: string, fields: Record<string, string>, signal?: AbortSignal): Promise<FormResponse> {
	let response: Response;
	try {
		response = await fetch(url, {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams(fields),
			signal,
		});
	} catch (error) {
		if (signal?.aborted) {
			throw new Error("Login cancelled");
		}
		throw error;
	}

	let body: Record<string, unknown>;
	try {
		const parsed = await response.json();
		body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		if (signal?.aborted) {
			throw new Error("Login cancelled");
		}
		throw new Error(`xAI OAuth returned invalid JSON (HTTP ${response.status})`);
	}

	return { ok: response.ok, status: response.status, body };
}

function requestFailure(action: string, response: FormResponse): Error {
	const error = typeof response.body.error === "string" ? response.body.error : undefined;
	const description =
		typeof response.body.error_description === "string" ? response.body.error_description : undefined;
	const detail = [error, description].filter(Boolean).join(": ");
	return new Error(`xAI OAuth ${action} failed (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
}

function parseDeviceCode(body: Record<string, unknown>): DeviceCode {
	// RFC 8628 allows interval 0 (no minimum wait); fall back to the poller's
	// default instead of failing on non-positive or malformed values.
	const interval = body.interval;
	const intervalSeconds =
		typeof interval === "number" && Number.isFinite(interval) && interval > 0 ? interval : undefined;
	const verificationUriComplete =
		typeof body.verification_uri_complete === "string" && body.verification_uri_complete.length > 0
			? validateVerificationUri(body.verification_uri_complete)
			: undefined;
	return {
		deviceCode: requiredString(body, "device_code"),
		userCode: requiredString(body, "user_code"),
		verificationUri: validateVerificationUri(requiredString(body, "verification_uri")),
		verificationUriComplete,
		intervalSeconds,
		expiresInSeconds: positiveNumber(body, "expires_in"),
	};
}

function credentialsFromTokenResponse(
	body: Record<string, unknown>,
	previousRefreshToken?: string,
): OAuthCredentials {
	const access = requiredString(body, "access_token");
	// xAI may omit refresh_token on refresh when the token is not rotated.
	const refresh =
		body.refresh_token === undefined && previousRefreshToken
			? previousRefreshToken
			: requiredString(body, "refresh_token");
	const expiresInSeconds =
		body.expires_in === undefined ? DEFAULT_TOKEN_LIFETIME_SECONDS : positiveNumber(body, "expires_in");
	return {
		type: "oauth",
		access,
		refresh,
		expires: Date.now() + expiresInSeconds * 1000 - REFRESH_SKEW_MS,
	};
}

async function requestDeviceCode(signal?: AbortSignal): Promise<DeviceCode> {
	const response = await postForm(
		XAI_DEVICE_CODE_URL,
		{
			client_id: XAI_CLIENT_ID,
			scope: XAI_SCOPE,
			referrer: "pi",
		},
		signal,
	);
	if (!response.ok) {
		throw requestFailure("device authorization", response);
	}
	return parseDeviceCode(response.body);
}

function abortableSleep(ms: number, signal: AbortSignal | undefined, cancelMessage: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(new Error(cancelMessage));
			return;
		}
		const onAbort = () => {
			clearTimeout(timeout);
			reject(new Error(cancelMessage));
		};
		const timeout = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}

async function pollForTokens(device: DeviceCode, callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
	const signal = callbacks.signal;
	const deadline = Date.now() + device.expiresInSeconds * 1000;
	let intervalMs = Math.max(
		MINIMUM_INTERVAL_MS,
		Math.floor((device.intervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS) * 1000),
	);

	// The device code was just issued; wait one interval before the first poll.
	await abortableSleep(Math.min(intervalMs, deadline - Date.now()), signal, "Login cancelled");

	while (Date.now() < deadline) {
		if (signal?.aborted) {
			throw new Error("Login cancelled");
		}

		const response = await postForm(
			XAI_TOKEN_URL,
			{
				grant_type: "urn:ietf:params:oauth:grant-type:device_code",
				client_id: XAI_CLIENT_ID,
				device_code: device.deviceCode,
			},
			signal,
		);

		if (response.ok) {
			return credentialsFromTokenResponse(response.body);
		}

		const error = response.body.error;
		if (error === "authorization_pending") {
			// keep polling
		} else if (error === "slow_down") {
			// RFC 8628 section 3.5: honor a server-provided interval, else add 5s.
			const interval = response.body.interval;
			intervalMs =
				typeof interval === "number" && Number.isFinite(interval) && interval > 0
					? Math.max(MINIMUM_INTERVAL_MS, Math.floor(interval * 1000))
					: Math.max(MINIMUM_INTERVAL_MS, intervalMs + SLOW_DOWN_INTERVAL_INCREMENT_MS);
		} else if (error === "access_denied" || error === "authorization_denied") {
			throw new Error("xAI device authorization was denied");
		} else if (error === "expired_token") {
			throw new Error("xAI device code expired");
		} else {
			throw requestFailure("device token polling", response);
		}

		const remainingMs = deadline - Date.now();
		if (remainingMs <= 0) {
			break;
		}
		await abortableSleep(Math.min(intervalMs, remainingMs), signal, "Login cancelled");
	}

	throw new Error("Device flow timed out");
}

async function loginXai(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials> {
	const device = await requestDeviceCode(callbacks.signal);
	callbacks.onAuth({
		url: device.verificationUriComplete ?? device.verificationUri,
		instructions: `Approve the sign-in in your browser. Confirmation code: ${device.userCode}`,
	});
	callbacks.onProgress?.("Waiting for approval in your browser...");
	return pollForTokens(device, callbacks);
}

async function refreshXaiToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
	const response = await postForm(XAI_TOKEN_URL, {
		grant_type: "refresh_token",
		client_id: XAI_CLIENT_ID,
		refresh_token: credentials.refresh,
	});
	if (!response.ok) {
		throw requestFailure("token refresh", response);
	}
	return credentialsFromTokenResponse(response.body, credentials.refresh);
}

export default function (pi: ExtensionAPI) {
	// oauth-only registration: the built-in xai provider keeps its models
	// (grok-4.20-0309-reasoning); this only adds the account login flow.
	pi.registerProvider("xai", {
		oauth: {
			name: "xAI (Grok/X subscription)",
			login: loginXai,
			refreshToken: refreshXaiToken,
			getApiKey: (credentials) => credentials.access,
		},
	});
}
