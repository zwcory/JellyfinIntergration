import {clearTimeout} from "node:timers";

export interface RetryOptions {
    initialDelay?: number;
    maxDelay?: number;
}

const DEFAULT_INITIAL = 5000;
const DEFAULT_MAX = 10 * 60 * 1000;

export function createRetrier(options: RetryOptions = {}) {
    const initialDelay = options.initialDelay ?? DEFAULT_INITIAL;
    const maxDelay = options.maxDelay ?? DEFAULT_MAX;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    async function attempt(
        fn: () => Promise<boolean>,
        delay: number = initialDelay
    ): Promise<boolean> {
        cancel();

        const result = await fn();
        if (result) return true;

        const nextDelay = Math.min(delay * 2, maxDelay);
        console.log(`Retrying in ${delay / 1000}s...`);

        return new Promise((resolve) => {
            timeout = setTimeout(async () => {
                timeout = null;
                resolve(await attempt(fn, nextDelay));
            }, delay);
        });
    }

    function cancel() {
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    }


    return { attempt , cancel };
}