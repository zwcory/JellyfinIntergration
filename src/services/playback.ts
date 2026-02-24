import { getApi, getUserId } from "../client";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models";

export async function getContinueWatching(limit  = 10) {
    const api = await getApi();
    const uid = await getUserId();
    const itemsApi = getItemsApi(api);

    const {data} = await itemsApi.getResumeItems({
        userId : uid,
        limit,
        mediaTypes: ["Video"],
    });

    return data.Items ?? [];
}

export async function getNextUp(limit = 10) {
    // For TV shows, next unwatched episode in a series a user has started

    const api = await getApi();
    const uid = await getUserId();

    // Use the TvShowsApi
    const {getTvShowsApi} = await import (
        "@jellyfin/sdk/lib/utils/api/tv-shows-api"
        );
    const tvApi = getTvShowsApi(api);

    const {data} = await tvApi.getNextUp({
        userId: uid,
        limit,
    });

    return data.Items ?? []
}