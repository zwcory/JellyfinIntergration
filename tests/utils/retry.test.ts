import { createRetrier } from "../../src/utils/retry";

jest.useFakeTimers();

describe("createRetrier", () => {
    afterEach(() => {
        jest.clearAllTimers();
    });

    it("returns true immediately when fn succeeds", async () => {
        const fn = jest.fn().mockResolvedValue(true);
        const { attempt } = createRetrier();

        const result = await attempt(fn);

        expect(result).toBe(true);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries with exponential backoff", async () => {
        const fn = jest
            .fn()
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);

        const { attempt } = createRetrier({
            initialDelay: 1000,
            maxDelay: 60000,
        });

        const promise = attempt(fn);

        // first retry after 1s
        await jest.advanceTimersByTimeAsync(1000);
        // second retry after 2s (doubled)
        await jest.advanceTimersByTimeAsync(2000);

        expect(await promise).toBe(true);
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("caps delay at maxDelay", async () => {
        let callCount = 0;
        const fn = jest.fn().mockImplementation(() => {
            callCount++;
            return Promise.resolve(callCount >= 4);
        });

        const { attempt } = createRetrier({
            initialDelay: 3000,
            maxDelay: 5000,
        });

        const promise = attempt(fn);

        await jest.advanceTimersByTimeAsync(3000); // 3s
        await jest.advanceTimersByTimeAsync(5000); // capped at 5s, not 6s
        await jest.advanceTimersByTimeAsync(5000); // still capped

        expect(await promise).toBe(true);
    });

    it("cancel stops pending retries", async () => {
        const fn = jest.fn().mockResolvedValue(false);
        const { attempt, cancel } = createRetrier({
            initialDelay: 1000,
        });

        attempt(fn);

        // flush the microtask so fn()'s promise resolves
        // and the setTimeout is actually scheduled
        await Promise.resolve();

        cancel();

        await jest.advanceTimersByTimeAsync(10000);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("propagates exceptions from fn", async () => {
        const fn = jest.fn().mockRejectedValue(new Error("fatal"));
        const { attempt } = createRetrier();

        await expect(attempt(fn)).rejects.toThrow("fatal");
    });
});