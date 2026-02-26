import { Jellyfin, Api } from "@jellyfin/sdk";
import { config } from "./config";
import {getUserApi} from "@jellyfin/sdk/lib/utils/api";
import {AuthenticateUserByName, UserApiAuthenticateUserByNameRequest} from "@jellyfin/sdk/lib/generated-client";

let api: Api | null = null;
let userId: string | null = null;


const jellyfin = new Jellyfin({
    clientInfo: {
        name: "Jellyfin Integration Layer",
        version: "1.0.0",
    },
    deviceInfo:{
        name: "Integration Server",
        id: config.deviceId,
    },
});

export async function getApi(): Promise<Api> {

    if (api?.accessToken) return api;

    api = jellyfin.createApi(config.serverUrl);

    // const auth = await api authenticateUserByName(
    //     config.username,
    //     config.password
    // );

    const authDetails: AuthenticateUserByName = {
        Username: config.username,
        Pw: config.password
    }

    const authRequest: UserApiAuthenticateUserByNameRequest = {
        authenticateUserByName: authDetails
    }

    const auth = await getUserApi(api).authenticateUserByName(
        authRequest
    )

    userId = auth.data.User?.Id ?? null;

    if (!userId) throw new Error("Authentication failed - no user ID returned");

    console.log(`Authenticated as ${auth.data.User?.Name} on ${config.serverUrl}`);

    return api;
}

export async function getUserId(): Promise<string> {
    if (!userId) await getApi();
    return userId!
}