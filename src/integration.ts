import { startWebhookServer } from "./services/webhook";
import { getRecentlyAdded, getLibraries } from "./services/library";
import { config } from "./config";
import {testConnection} from "./services/users";

async function main() {
    let connected = false;
    const port = config.serverPort;
    const portNumber: number = (port as unknown) as number

    connected = await testConnection();

    if (connected){
        startWebhookServer(portNumber , {
            onItemAdded: (payload) => {
                console.log(`New Item: ${payload.Item?.Name} (${payload.Item?.Type})`);
            },
            onPlaybackStart: (payload) => {
                console.log(`Playback Started: ${payload.Item?.Name} (${payload.Item?.Type})`);
            },
            onItemRemoved: (payload) => {
                console.log(`Item removed: ${payload.Item?.Name} (${payload.Item?.Type})`);
                try {
                    const recentlyAdded = getRecentlyAdded()
                } catch (e: any){
                    console.log(`Error in try block ${e}`);
                } finally {
                    console.log("Waiting for new changes:");
                }
            },
            onUserLogin:(payload) => {
                console.log(`User Logged In: ${payload.Item?.Name} (${payload.Item?.Type})`);
            },
        })
    } else {
        console.log("Failed to establish connection via webhooks");
    }

}

main().catch(console.error);

