/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "vitest.config.ts",
  },
  mutate: ["src/lib/supervision.ts"],
  concurrency: 4,
  maxConcurrentTestRunners: 4,
  timeoutMS: 5000,
  timeoutFactor: 2,
  reporters: ["clear-text", "html", "progress"],
  htmlReporter: {
    fileName: "reports/mutation/mutation.html",
  },
};

export default config;
