import { AxiosError, AxiosHeaders } from "axios";

// Mock client before importing users
jest.mock("../../src/client", () => ({
    getApi: jest.fn(),
}));

jest.mock("@jellyfin/sdk/lib/utils/api", () => ({
    getUserApi: jest.fn(),
}));

import { testConnection, getUsers } from "../../src/services/users";
import { getApi } from "../../src/client";
import { getUserApi } from "@jellyfin/sdk/lib/utils/api";

const mockGetApi = getApi as jest.Mock;
const mockGetUserApi = getUserApi as jest.Mock;

function mockUsersResponse(users: any[]) {
    mockGetApi.mockResolvedValue({});
    mockGetUserApi.mockReturnValue({
        getUsers: jest.fn().mockResolvedValue({ data: users }),
    });
}

function mockUsersError(error: Error) {
    mockGetApi.mockResolvedValue({});
    mockGetUserApi.mockReturnValue({
        getUsers: jest.fn().mockRejectedValue(error),
    });
}

function makeAxiosError(status: number): AxiosError {
    return new AxiosError("fail", String(status), undefined, undefined, {
        status,
        data: {},
        headers: {},
        statusText: "",
        config: { headers: new AxiosHeaders() },
    });
}

describe("testConnection", () => {
    jest.useFakeTimers();

    afterEach(() => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    it("returns true when users are fetched", async () => {
        mockUsersResponse([{ Id: "1", Name: "admin" }]);
        const result = await testConnection();
        expect(result).toBe(true);
    });

    it("returns false on 401", async () => {
        mockUsersError(makeAxiosError(401));
        const result = await testConnection();
        expect(result).toBe(false);
    });

    it("returns false on 403", async () => {
        mockUsersError(makeAxiosError(403));
        const result = await testConnection();
        expect(result).toBe(false);
    });

    it("retries on 503 then succeeds", async () => {
        // First call fails, second succeeds
        mockGetApi.mockResolvedValue({});
        const getUsersMock = jest
            .fn()
            .mockRejectedValueOnce(makeAxiosError(503))
            .mockResolvedValueOnce({ data: [{ Id: "1" }] });

        mockGetUserApi.mockReturnValue({ getUsers: getUsersMock });

        const promise = testConnection();
        await jest.advanceTimersByTimeAsync(5000);

        expect(await promise).toBe(true);
        expect(getUsersMock).toHaveBeenCalledTimes(2);
    });

    it("logs the correct error message per status code", async () => {
        const spy = jest.spyOn(console, "error").mockImplementation();
        mockUsersError(makeAxiosError(404));

        await testConnection();

        expect(spy).toHaveBeenCalledWith("Not found");
        spy.mockRestore();
    });
});