import express from "express";
import type { Server } from "http";

interface WebhookPayload {
    Event?: string;
    Item?: {
        Name?: string;
        Type?: string;
        Path?: string;
    };
    [key: string]: unknown;
}


interface WebhookCallbacks {
    onItemAdded?: (payload: WebhookPayload) => void | Promise<void>;
    onItemDeleted?: (payload: WebhookPayload) => void | Promise<void>;
    onPlaybackStart?: (payload: WebhookPayload) => void | Promise<void>;
    // onUserLogin?: (payload: WebhookPayload) => void | Promise<void>;
}


export function startWebhookServer(
    port: number,
    callbacks: WebhookCallbacks
): { app: ReturnType<typeof express>;  server: Server} {
        const app = express();

    app.use(express.json({ type: "*/*" }));

    app.post("/webhook", (req, res) => {
        const payload: WebhookPayload = req.body;
        console.log(`Event is: ${payload.Event}`);

        switch (payload.Event) {
            case "ItemAdded":
                void callbacks.onItemAdded?.(payload);
                break;
            case "ItemDeleted":
                void callbacks.onItemDeleted?.(payload);
                break;
            case "PlaybackStart":
                void callbacks.onPlaybackStart?.(payload);
                break;
            default:
                console.log(`Unhandled event: ${payload.Event}`);
        }

        res.sendStatus(200);
    });

    const server = app.listen(port, () => {
        console.log(`Webhook server listening on port ${port}`);
    });

    return {app , server};
}
