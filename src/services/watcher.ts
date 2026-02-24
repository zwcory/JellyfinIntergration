import chokidar, { type FSWatcher } from "chokidar";

interface WatcherOptions {
    // Directories to watch
    paths : string[];
    // File extensions to care about
    extensions?: string[];
    // Milliseconds to wait before considering a file "stable" (transfer complete)
    stabilityThreshold?: number;
    // Ignore dotfiles and common junk files
    ignoreJunk?: boolean;
}

interface WatcherCallbacks {
    onAdd?: (filePath: string) => void | Promise<void>;
    onRemove?: (filePath: string) => void | Promise<void>;
    onChange?: (filePath: string) => void | Promise<void>;
    onReady?: () => void | Promise<void>;
    onError?: (error: string) => void | Promise<void>;
}

let watcher: FSWatcher | null = null;

function matchesExtension(filePath: string, extensions?: string[]): boolean {
    if (!extensions || extensions.length === 0) return true;
    const lower = filePath.toLowerCase();
    return extensions.some((ext) => lower.endsWith(ext));
}

export function startWatcher(
    options: WatcherOptions,
    callbacks: WatcherCallbacks
): FSWatcher {
    if (watcher) {
        console.warn("Watcher already running — closing previous instance");
        watcher.close();
    }

    const {
        paths,
        extensions,
        stabilityThreshold = 5000,
        ignoreJunk = true,
    } = options;

    watcher = chokidar.watch(paths, {
        // Don't fire events for existing files on startup
        ignoreInitial: true,
        // Wait for file writes to finish before firing "add"
        awaitWriteFinish: {
            stabilityThreshold,
            pollInterval: 1000,
        },
        // Ignore dotfiles and OS junk
        ignored: ignoreJunk
            ? /(^|[\/\\])\.|Thumbs\.db|\.DS_Store/
            : undefined,
        // Watch subdirectories recursively
        persistent: true,
        // Helps with network/mounted drives
        usePolling: false,
    });

    watcher.on("add", (filePath) => {
        if (!matchesExtension(filePath, extensions)) return;
        console.log(`File added: ${filePath}`);
        callbacks.onAdd?.(filePath);
    });

    watcher.on("unlink", (filePath) => {
        if (!matchesExtension(filePath, extensions)) return;
        console.log(`File removed: ${filePath}`);
        callbacks.onRemove?.(filePath);
    });

    watcher.on("change", (filePath) => {
        if (!matchesExtension(filePath, extensions)) return;
        console.log(`File changed: ${filePath}`);
        callbacks.onChange?.(filePath);
    });

    watcher.on("ready", () => {
        console.log("Watcher ready and scanning for changes");
        callbacks.onReady?.();
    });

    watcher.on("error", (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Watcher error:", message);
        callbacks.onError?.(message);
    });

    return watcher;
}

export async function stopWatcher(): Promise<void> {
    if (watcher) {
        await watcher.close();
        watcher = null;
        console.log("Watcher stopped");
    }
}