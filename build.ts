import dts from "bun-plugin-dts";

const result = await Bun.build({
	entrypoints: ["./index.ts"],
	packages: "external",
	outdir: "./dist",
	target: "browser",
	plugins: [dts()],
});

if (!result.success) {
	console.error("Build failed");
	for (const message of result.logs) {
		// Bun will pretty print the message object
		console.error(message);
	}
}
