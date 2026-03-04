// tests/services/watcher.test.ts
import { EventEmitter } from "events";

jest.mock("chokidar", () => ({
    __esModule: true,
    default: {
        watch: jest.fn(),
    },
}));

import chokidar from "chokidar";
import { startWatcher, stopWatcher } from "../../src/services/watcher";

function createMockWatcher() {
    const emitter = new EventEmitter();
    return Object.assign(emitter, {
        close: jest.fn().mockResolvedValue(undefined),
    });
}

const mockWatch = chokidar.watch as jest.Mock;

describe("watcher", () => {
    let mockWatcher: ReturnType<typeof createMockWatcher>;

    beforeEach(() => {
        mockWatcher = createMockWatcher();
        mockWatch.mockReturnValue(mockWatcher);
    });

    afterEach(async () => {
        await stopWatcher();
    });

    it("fires onAdd for matching extensions", () => {
        const onAdd = jest.fn();
        startWatcher(
            { paths: ["/fake"], extensions: [".mp4"] },
            { onAdd }
        );

        mockWatcher.emit("add", "/fake/movie.mp4");
        expect(onAdd).toHaveBeenCalledWith("/fake/movie.mp4");
    });

    it("ignores non-matching extensions", () => {
        const onAdd = jest.fn();
        startWatcher(
            { paths: ["/fake"], extensions: [".mp4"] },
            { onAdd }
        );

        mockWatcher.emit("add", "/fake/readme.txt");
        expect(onAdd).not.toHaveBeenCalled();
    });

    it("fires onRemove for matching extensions", () => {
        const onRemove = jest.fn();
        startWatcher(
            { paths: ["/fake"], extensions: [".mkv"] },
            { onRemove }
        );

        mockWatcher.emit("unlink", "/fake/movie.mkv");
        expect(onRemove).toHaveBeenCalledWith("/fake/movie.mkv");
    });

    it("fires onReady", () => {
        const onReady = jest.fn();
        startWatcher({ paths: ["/fake"] }, { onReady });

        mockWatcher.emit("ready");
        expect(onReady).toHaveBeenCalled();
    });

    it("fires onError with message string", () => {
        const onError = jest.fn();
        startWatcher({ paths: ["/fake"] }, { onError });

        mockWatcher.emit("error", new Error("disk failure"));
        expect(onError).toHaveBeenCalledWith("disk failure");
    });

    it("closes previous watcher when starting a new one", () => {
        startWatcher({ paths: ["/fake"] }, {});
        const firstWatcher = mockWatcher;

        mockWatcher = createMockWatcher();
        mockWatch.mockReturnValue(mockWatcher);

        startWatcher({ paths: ["/other"] }, {});
        expect(firstWatcher.close).toHaveBeenCalled();
    });
});