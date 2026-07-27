// Deletes src-tauri/target/release/data before a release build, so a portable
// build never ships whatever test apps/icons/sessions accumulated in that
// folder from earlier `tauri build`/manual runs of the release exe. Debug
// data (target/debug/data) is untouched — dev iteration keeps its state.
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const releaseDataDir = path.join(projectRoot, "src-tauri", "target", "release", "data");

await rm(releaseDataDir, { recursive: true, force: true });
console.log(`Cleaned ${releaseDataDir}`);
