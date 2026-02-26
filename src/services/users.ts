import { getApi} from "../client";
import {getUserApi} from "@jellyfin/sdk/lib/utils/api";
import {clearTimeout} from "node:timers";
import axios, { AxiosError } from "axios";

export async function getUsers(){
    const api = await getApi();


    const { data } = await getUserApi(api).getPublicUsers();

    return data ?? [];
}


const RETRY_DELAY = 10000;
const RETRYABLE_CODES = new Set([429,500,503,504]);
const RETRYABLE_NETWORK_CODES = new Set([
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ECONNRESET",
    "ENOTFOUND",
    "ERR_NETWORK",
]);

let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

function scheduleRetry(resolve: (val: boolean) => void) {
    console.log(`Retrying in ${RETRY_DELAY / 1000}s ...`);
    connectionTimeout = setTimeout(async () => {
        connectionTimeout = null;
        resolve(await testConnection());
    }, RETRY_DELAY)
}

export async function testConnection(): Promise<boolean>{
    if (connectionTimeout){
        clearTimeout(connectionTimeout);
        connectionTimeout = null;
    }
    console.log("Testing Connection...")
    try {
        const users = await getUsers()
        if (users!== null) {
            console.log(`Connected! ${users.length} users `)
            return true;
        }
    } catch (error: unknown) {
        console.log("Connection Failed!");
        let shouldRetry = false;
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // Server responded with an error status code
                const status = error.response.status;
                switch (status) {
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
                        console.error(`Too Many Requests`);
                        break;
                    case 500:
                        console.error(`Server Error`);
                        break;
                    case 503:
                        console.error(`Service Unavailable`);
                        break;
                    case 504:
                        console.error(`Gateway Timeout`);
                        break;
                    default:
                        console.error(`Unexpected status: ${status}`);
                }
                shouldRetry = RETRYABLE_CODES.has(status);
            } else if (error.code && RETRYABLE_NETWORK_CODES.has(error.code)) {
                // No response at all — network-level failure
                console.error(`Server unreachable (${error.code})`);
                shouldRetry = true;
            } else {
                console.error("Axios error:", error.message);
            }
        } else  {
            console.error("Unexpected error:", error);
        }

        if (shouldRetry) {
            return new Promise((resolve) => scheduleRetry(resolve));
        }

        console.log("Non-retryable error. Giving up.");
        return false;
    }
    return false;
}