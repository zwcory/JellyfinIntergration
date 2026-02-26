import express from "express";

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
    onItemRemoved?: (payload: WebhookPayload) => void | Promise<void>;
    onPlaybackStart?: (payload: WebhookPayload) => void | Promise<void>;
    onUserLogin?: (payload: WebhookPayload) => void | Promise<void>;
}


export function startWebhookServer(
    port: number,
    callbacks: WebhookCallbacks
) {
    const app = express();
    app.use(express.json());

    app.post("/webhook", (req, res) => {
        const payload: WebhookPayload = req.body;
        console.log(`Webhook received: ${payload.Event}`);

        switch (payload.Event) {
            case "ItemAdded":
                void callbacks.onItemAdded?.(payload);
                break;
            case "ItemRemoved":
                void callbacks.onItemRemoved?.(payload);
                break;
            case "PlaybackStart":
                void callbacks.onPlaybackStart?.(payload);
                break;
            default:
                console.log(`Unhandled event: ${payload.Event}`);
        }

        res.sendStatus(200);
    });

    app.listen(port, () => {
        console.log(`Webhook server listening on port ${port}`);
    });

    return app;
}
