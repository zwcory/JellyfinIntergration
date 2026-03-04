import { getApi} from "../client";
import {getUserApi} from "@jellyfin/sdk/lib/utils/api";
import {clearTimeout} from "node:timers";
import axios, { AxiosError } from "axios";
import {createRetrier} from "../utils/retry";

export async function getUsers(){
    const api = await getApi();
    const { data } = await getUserApi(api).getUsers();
    return data ?? [];
}


const INITIAL_DELAY = 5000;
const MAX_DELAY = 10 * 60 * 1000;
const RETRYABLE_CODES = new Set([429,500,503,504]);
const RETRYABLE_NETWORK_CODES = new Set([
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "ERR_NETWORK",
]);

function logAndClassify(error: unknown): boolean {
    if(!axios.isAxiosError(error)) {
        console.error("Unexpected Error: ", error);
        return false;
    }

    if (error.response) {
        const status = error.response.status;
        switch (status){
            case 400:
                console.error("Bad request");
                break;
            case 401:
                console.error("Unauthorized");
                break;
            case 403:
                console.error("Forbidden");
                break;
            case 404:
                console.error("Not found");
                break;
            case 429:
                console.error("Too Many Requests");
                break;
            case 500:
                console.error("Server Error");
                break;
            case 503:
                console.error("Service Unavailable");
                break;
            case 504:
                console.error("Gateway Timeout");
                break;
            default:
                console.error(`Unexpected status: ${status}`);
        }
        return RETRYABLE_CODES.has(status);
    }

    if (error.code && RETRYABLE_NETWORK_CODES.has(error.code)) {
        console.error(`Server unreachable (${error.code})`);
        return true;
    }

    console.error("Axios error:", error.message);
    return false;
}


const retrier = createRetrier();

export async function testConnection(): Promise<boolean> {
    try {
        return await retrier.attempt(async () => {
            console.log("Testing Connection...");
            try {
                const users = await getUsers();
                console.log(`Connected! ${users.length} users`);
                return true;
            } catch (error) {
                console.log("Connection Failed!");
                const shouldRetry = logAndClassify(error);
                if (!shouldRetry) throw error; // breaks out of retry loop
                return false; // signals "retry"
            }
        });
    } catch {
        console.log("Non-retryable error. Giving up.");
        return false;
    }
}
