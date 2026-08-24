import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { logger } from "../utils/logger.ts";

describe("SchoolSync Structured Production Logger Test Suite", () => {
  it("should have info, success, warn, error, and debug methods", () => {
    assert.strictEqual(typeof logger.info, "function");
    assert.strictEqual(typeof logger.success, "function");
    assert.strictEqual(typeof logger.warn, "function");
    assert.strictEqual(typeof logger.error, "function");
    assert.strictEqual(typeof logger.debug, "function");
  });

  it("should safely accept messages with and without context and metadata without throwing", () => {
    assert.doesNotThrow(() => {
      logger.info("Test server initialized", "SERVER", { port: 5000 });
      logger.warn("Slow query detected", "DATABASE", { durationMs: 450 });
      logger.error("Failed to connect", "REDIS", new Error("Connection refused"));
      logger.success("Seeding completed", "SEED");
      logger.debug("Parsing request payload", "DEBUG");
    });
  });
});
