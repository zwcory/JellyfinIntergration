# Jellyfin Integration Layer

A TypeScript-based integration layer for [Jellyfin](https://jellyfin.org/) media servers. Provides library querying, file system watching with automatic scan triggers, webhook event handling, and connection management with resilient retry logic.

> **Note:** The Jellyfin SDK does not currently support the WebSocket API. Parts of this project (webhook handling, event-driven architecture) are designed with future WebSocket support in mind and serve as a foundation for when that functionality becomes available in the SDK, and are currently making use of the Webhook Jellyfin Plugin.

---

## Features

- **Authenticated Jellyfin client** — wraps the official `@jellyfin/sdk` with automatic credential-based authentication
- **Library services** — query recently added items, search the library, and list media folders
- **Playback services** — fetch "Continue Watching" and "Next Up" data
- **File system watcher** — monitors media directories for new, changed, or removed video files and triggers debounced library scans
- **Webhook server** — receives and routes Jellyfin webhook events (`ItemAdded`, `ItemDeleted`, `PlaybackStart`, etc.)
- **Connection resilience** — exponential-backoff retry logic for initial connection and ongoing health monitoring

## Project Structure

```text
src/
├── client.ts              # Jellyfin SDK client & authentication
├── config.ts              # Environment variable configuration
├── index.ts               # Entry point: file watcher mode
├── integration.ts         # Entry point: webhook + health monitor mode
└── services/
    ├── library.ts         # Recently added, search, library listing
    ├── playback.ts        # Continue watching, next up
    ├── users.ts           # User listing, connection testing w/ retry
    ├── watcher.ts         # Chokidar-based file system watcher
    └── webhook.ts         # Express webhook server
```

## Prerequisites

- **Node.js** ≥ 18
- **TypeScript** ≥ 5.x
- A running **Jellyfin** server
- *(Webhook mode only)* The [Jellyfin Webhook Plugin](https://github.com/jellyfin/jellyfin-plugin-webhook) installed and configured

## Installation

```bash
git clone <repo-url>
cd jellyfin-integration-layer
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
JELLYFIN_URL=http://<jellyfin-server-ip>:8096
JELLYFIN_USERNAME=your_username
JELLYFIN_PASSWORD=your_password
JELLYFIN_PORT=8096
DEVICE_ID=jellyfin-integration-default
```

| Variable | Required | Default | Description |
|---|---|---|---|
| `JELLYFIN_URL` | ✅ | — | Full URL to your Jellyfin server |
| `JELLYFIN_USERNAME` | ✅ | — | Jellyfin account username |
| `JELLYFIN_PASSWORD` | ✅ | — | Jellyfin account password |
| `JELLYFIN_PORT` | ✅ | — | Jellyfin server port |
| `DEVICE_ID` | ❌ | `jellyfin-integration-default` | Unique device identifier for this client |

### Jellyfin Webhook Plugin Setup

1. Install the **Webhook** plugin from the Jellyfin plugin catalog
2. Navigate to **Dashboard → Plugins → Webhook**
3. Click **Add Generic Destination** and configure:

| Setting | Value |
|---|---|
| **Webhook Name** | Any display name (e.g. `Integration layer`) |
| **Webhook Url** | `http://<your-server-ip>:3000/webhook` |
| **Status** | ✅ Enable |

4. **Notification Types** — check the events you want to receive. Supported events:
   - ✅ Item Added
   - ✅ Item Deleted
   - ✅ Playback Start
   - Any others will be logged as unhandled

5. **User Filter** — leave all users **unchecked** to receive events for all users. Checking specific users restricts events to only those users.

6. **Item Types** — check whichever types you want (Movies, Episodes, Season, Series, etc.)

7. **Template** — paste this Handlebars template into the Template field:

```handlebars
{
    "Event": "{{NotificationType}}",
    "Item": {
        "Name": "{{{Name}}}",
        "Type": "{{ItemType}}",
        "Path": "{{Path}}"
    },
    "Server": "{{{ServerName}}}",
    "User": "{{{NotificationUsername}}}",
    "UserId": "{{UserId}}"
}
```

> **Important:** The template is required. Without it, the plugin sends an empty body and the webhook server cannot process events. Triple braces (`{{{  }}}`) are used for fields that may contain special characters to prevent HTML escaping.

#### Debugging Webhooks

If webhooks aren't firing, enable debug logging in your Jellyfin `logging.json`:

```json
{
    "Serilog": {
        "MinimumLevel": {
            "Default": "Information",
            "Override": {
                "Microsoft": "Warning",
                "System": "Warning",
                "Jellyfin.Plugin.Webhook": "Debug"
            }
        }
    }
}
```

## Usage

### Local Mode — File Watcher

Watches configured media directories for video file changes and automatically triggers Jellyfin library scans (debounced at 30 seconds).

```bash
npm run local
```

**What it does:**

1. Authenticates with Jellyfin
2. Prints current libraries and recently added items
3. Watches `../JellyfinMedia/movies` and `../JellyfinMedia/tv` for video files (`.mkv`, `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`, `.ts`)
4. Triggers a debounced library scan on file add/remove
5. Gracefully shuts down on `SIGINT` / `SIGTERM`

### Webhook Mode — Event-Driven Integration

Starts an HTTP server that receives Jellyfin webhook events and monitors the server connection with periodic health checks.

```bash
npm run webhooks
```

**What it does:**

1. Waits for Jellyfin to become reachable (with exponential backoff)
2. Starts an Express server on port `3000` listening for `POST /webhook`
3. Routes events: `ItemAdded`, `ItemDeleted`, `PlaybackStart`
4. Runs a health check every 120 seconds; reconnects automatically if the connection drops

### Build & Run Compiled

```bash
npm run build
npm start
```

## API Overview

### Client (`client.ts`)

| Function | Returns | Description |
|---|---|---|
| `getApi()` | `Promise<Api>` | Returns an authenticated Jellyfin API instance (lazy-initialised) |
| `getUserId()` | `Promise<string>` | Returns the authenticated user's ID |

### Library Service (`services/library.ts`)

| Function | Returns | Description |
|---|---|---|
| `getRecentlyAdded(limit?)` | `Promise<BaseItemDto[]>` | Fetch recently added movies, episodes, and videos |
| `searchLibrary(query, limit?)` | `Promise<BaseItemDto[]>` | Search across the entire library |
| `getLibraries()` | `Promise<BaseItemDto[]>` | List all media folders / libraries |

### Playback Service (`services/playback.ts`)

| Function | Returns | Description |
|---|---|---|
| `getContinueWatching(limit?)` | `Promise<BaseItemDto[]>` | Items the user has partially watched |
| `getNextUp(limit?)` | `Promise<BaseItemDto[]>` | Next unwatched episodes in started series |

### Users Service (`services/users.ts`)

| Function | Returns | Description |
|---|---|---|
| `getUsers()` | `Promise<UserDto[]>` | List public users |
| `testConnection(delay?)` | `Promise<boolean>` | Test server reachability with exponential-backoff retry |

### Watcher (`services/watcher.ts`)

| Function | Description |
|---|---|
| `startWatcher(options, callbacks)` | Start watching directories for file changes |
| `stopWatcher()` | Gracefully stop the file watcher |

### Webhook Server (`services/webhook.ts`)

| Function | Description |
|---|---|
| `startWebhookServer(port, callbacks)` | Start an Express server routing Jellyfin webhook events |

**Handled events:**

| Webhook Event | Callback |
|---|---|
| `ItemAdded` | `onItemAdded` |
| `ItemDeleted` | `onItemDeleted` |
| `PlaybackStart` | `onPlaybackStart` |

## Dependencies

| Package | Purpose |
|---|---|
| `@jellyfin/sdk` | Official Jellyfin TypeScript SDK |
| `axios` | HTTP client (used by SDK and connection testing) |
| `chokidar` | Cross-platform file system watching |
| `dotenv` | `.env` file loading |
| `express` | Webhook HTTP server |

## License

MIT
