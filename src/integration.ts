import { startWebhookServer } from "./services/webhook";
import { getRecentlyAdded } from "./services/library";
import { testConnection } from "./services/users";

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForConnection(): Promise<void> {
    const INITIAL_DELAY = 5000;
    const MAX_DELAY = 10 * 60 * 1000;
    let delay = INITIAL_DELAY;

    while (true) {
        const connected = await testConnection();
        if (connected) return;

        console.log(`Retrying in ${delay / 1000}s...`);
        await sleep(delay);
        delay = Math.min(delay * 2, MAX_DELAY);
    }
}

async function monitorConnection(): Promise<void> {
    const HEALTH_CHECK_INTERVAL = 120_000; // check every 120s

    while(true) {
        await sleep(HEALTH_CHECK_INTERVAL);

        const connected = await testConnection();
        if (!connected) {
            console.log("Lost connection to Jellyfin. Waiting to reconnect...");
            await waitForConnection();
            console.log("Reconnected!");
        }
    }
}

async function main() {
    // Step 1: Wait until Jellyfin is reachable
    console.log("Waiting for Jellyfin connection...");
    await waitForConnection();
    console.log("Connected to Jellyfin!");

    // Step 2: Start webhook server
    const {app, server} = startWebhookServer(3000, {
        onItemAdded: async (payload) => {
            console.log(
                `New Item: ${payload.Item?.Name} (${payload.Item?.Type})`
            );
            try {
                const recentlyAdded = await getRecentlyAdded();
                console.log(`Recently added items: ${recentlyAdded}`);
            } catch (e) {
                console.error(`Error fetching recently added: ${e}`);
            }
        },
        onPlaybackStart: (payload) => {
            console.log(
                `Playback Started: ${payload.Item?.Name} (${payload.Item?.Type})`
            );
        },
        onItemDeleted: (payload) => {
            console.log(
                `Item removed: ${payload.Item?.Name} (${payload.Item?.Type})`
            );
        },
        // onUserLogin: (payload) => {
        //     console.log(
        //         `User Logged In: ${payload.Item?.Name} (${payload.Item?.Type})`
        //     );
        // },
    });

    // Step 3: Periodically check connection is still alive
    await monitorConnection();
}

main().catch(console.error);