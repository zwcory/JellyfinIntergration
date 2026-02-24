import { getApi, getUserId } from "../client";
import { getItemsApi } from "@jellyfin/sdk/lib/utils/api/items-api";
import { getLibraryApi } from "@jellyfin/sdk/lib/utils/api/library-api";
import { BaseItemKind } from "@jellyfin/sdk/lib/generated-client/models"

export async function getRecentlyAdded(limit = 20){
    const api = await getApi();
    const uid = await getUserId();
    const itemsApi = getItemsApi(api);

    const { data } = await itemsApi.getItems({
        userId: uid,
        sortBy: ["DateCreated"],
        sortOrder: ["Descending"],
        recursive: true,
        limit,
        includeItemTypes: [BaseItemKind.Movie, BaseItemKind.Episode, BaseItemKind.Video]
    });

    return data.Items ?? [];
}

export async function searchLibrary(query: string, limit = 10) {
    const api = await getApi();
    const uid = await getUserId();
    const itemsApi = getItemsApi(api);

    const {data} = await itemsApi.getItems({
        userId: uid,
        searchTerm: query,
        recursive: true,
        limit,
    })

    return data.Items ?? [];
}

export async function getLibraries() {
    const api = await getApi();
    const uid = await getUserId();
    const libraryApi = getLibraryApi(api);

    const {data} = await libraryApi.getMediaFolders();
    return data.Items ?? [];
}