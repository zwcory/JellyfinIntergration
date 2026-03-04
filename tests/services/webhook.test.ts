import request from "supertest";
import type { Server } from "http";
import { startWebhookServer } from "../../src/services/webhook";

describe("webhook server", () => {
    let server: Server;

    afterEach((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });

    it("calls onItemAdded for ItemAdded event", async () => {
        const onItemAdded = jest.fn();
        ({ server } = startWebhookServer(0, { onItemAdded }));

        await request(server)
            .post("/webhook")
            .send({
                Event: "ItemAdded",
                Item: { Name: "Test Movie", Type: "Movie" },
            })
            .expect(200);

        expect(onItemAdded).toHaveBeenCalledWith(
            expect.objectContaining({ Event: "ItemAdded" })
        );
    });

    it("calls onPlaybackStart for PlaybackStart event", async () => {
        const onPlaybackStart = jest.fn();
        ({ server } = startWebhookServer(0, { onPlaybackStart }));

        await request(server)
            .post("/webhook")
            .send({ Event: "PlaybackStart" })
            .expect(200);

        expect(onPlaybackStart).toHaveBeenCalled();
    });

    it("calls onItemDeleted for ItemDeleted event", async () => {
        const onItemDeleted = jest.fn();
        ({ server } = startWebhookServer(0, { onItemDeleted }));

        await request(server)
            .post("/webhook")
            .send({ Event: "ItemDeleted" })
            .expect(200);

        expect(onItemDeleted).toHaveBeenCalled();
    });

    it("handles unknown events without error", async () => {
        ({ server } = startWebhookServer(0, {}));

        await request(server)
            .post("/webhook")
            .send({ Event: "UnknownEvent" })
            .expect(200);
    });

    it("does not call wrong callback", async () => {
        const onItemAdded = jest.fn();
        const onPlaybackStart = jest.fn();
        ({ server } = startWebhookServer(0, {
            onItemAdded,
            onPlaybackStart,
        }));

        await request(server)
            .post("/webhook")
            .send({ Event: "PlaybackStart" })
            .expect(200);

        expect(onItemAdded).not.toHaveBeenCalled();
        expect(onPlaybackStart).toHaveBeenCalled();
    });
});