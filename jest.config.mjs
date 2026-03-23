/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
};

export default config;
