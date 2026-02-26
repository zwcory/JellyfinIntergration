import {
    getRecentlyAdded,
    getLibraries,
} from "./services/library";
import { startWatcher, stopWatcher } from "./services/watcher";
import { getApi } from "./client";

const MEDIA_PATHS = [
    "../JellyfinMedia/movies",
    "../JellyfinMedia/tv",
];

const VIDEO_EXTENSIONS = [
    ".mkv",
    ".mp4",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".m4v",
    ".ts",
];

async function triggerLibraryScan() {
    const api = await getApi();

    // POST to /Library/Refresh triggers a full library scan
    await api.axiosInstance.post(
        `${api.basePath}/Library/Refresh`,
        null,
        {
            headers: {
                Authorization: `MediaBrowser Token="${api.accessToken}"`,
            },
        }
    );

    console.log("Library scan triggered");
}

// Simple debounce to avoid spamming scans when many files arrive at once
let scanTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedScan(delayMs = 30000) {
    if (scanTimeout) clearTimeout(scanTimeout);

    scanTimeout = setTimeout(async () => {
        try {
            await triggerLibraryScan();
        } catch (err) {
            console.error("Failed to trigger library scan:", err);
        }
        scanTimeout = null;
    }, delayMs);

    console.log(`Library scan scheduled in ${delayMs / 1000}s`);
}

async function main() {
    // --- Existing demo output ---
    const libraries = await getLibraries();
    console.log("\n Libraries:");
    libraries.forEach((lib) =>
        console.log(`  - ${lib.Name} (${lib.CollectionType})`)
    );

    const recent = await getRecentlyAdded(5);
    console.log("\n Recently Added:");
    recent.forEach((item) => console.log(`  - [${item.Type}] ${item.Name}`));

    // --- Start file watcher ---
    console.log("\n--- Starting file watcher ---\n");

    startWatcher(
        {
            paths: MEDIA_PATHS,
            extensions: VIDEO_EXTENSIONS,
            stabilityThreshold: 5000,
        },
        {
            onAdd: (filePath) => {
                console.log(`New media detected: ${filePath}`);
                debouncedScan();
            },
            onRemove: (filePath) => {
                console.log(`Media removed: ${filePath}`);
                debouncedScan();
            },
            onReady: () => {
                console.log("Watching for media changes...");
            },
        }
    );

    // Keep the process alive and handle graceful shutdown
    const shutdown = async () => {
        console.log("\nShutting down...");
        if (scanTimeout) clearTimeout(scanTimeout);
        await stopWatcher();
        process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

main().catch(console.error);