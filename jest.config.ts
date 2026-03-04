import type { Config } from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    moduleFileExtensions: ["ts", "js", "json"],
    // By default Jest ignores all of node_modules.
    // This override says "ignore node_modules EXCEPT chokidar"
    transformIgnorePatterns: [
        "node_modules/(?!chokidar/)",
    ],
    // Tell ts-jest to handle both .ts and .js (for ESM packages)
    transform: {
        "^.+\\.tsx?$": "ts-jest",
        "^.+\\.jsx?$": "ts-jest",
    },
};

export default config;