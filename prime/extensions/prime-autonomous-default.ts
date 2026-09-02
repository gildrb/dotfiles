import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function primeAutonomousDefault(pi: ExtensionAPI): void {
	pi.on("session_start", (event) => {
		if (event.reason === "reload") return;
		pi.sendUserMessage("/autonomous on");
	});
}
