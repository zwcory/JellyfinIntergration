import "dotenv/config";

export const config = {
    serverUrl: process.env.JELLYFIN_URL!,
    username: process.env.JELLYFIN_USERNAME!,
    password: process.env.JELLYFIN_PASSWORD!,
    deviceId: process.env.DEVICE_ID ?? "jellyfin-integration-default",
    serverPort: process.env.JELLYFIN_PORT!,
} as const;