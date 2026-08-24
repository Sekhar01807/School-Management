import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validateBody } from "../middleware/validate.ts";
import { sanitizeMiddleware } from "../middleware/sanitize.ts";
import { authorize } from "../middleware/auth.ts";

describe("SchoolSync Middleware Pipeline Test Suite", () => {
  describe("1. validateBody Middleware with Zod Schemas", () => {
    const testSchema = z.object({
      username: z.string().min(3),
      age: z.number().int().positive(),
    });

    it("should allow request and enrich req.body when payload satisfies schema", () => {
      let nextCalled = false;
      let statusCode = 200;
      let jsonResponse: any = null;

      const req = {
        body: { username: "alex123", age: 20 },
      } as any;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonResponse = data;
        },
      } as any;

      const next = () => {
        nextCalled = true;
      };

      const middleware = validateBody(testSchema);
      middleware(req, res, next);

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.body.username, "alex123");
      assert.strictEqual(req.body.age, 20);
      assert.strictEqual(jsonResponse, null);
    });

    it("should return 400 Bad Request with descriptive errors when payload fails schema", () => {
      let nextCalled = false;
      let statusCode = 200;
      let jsonResponse: any = null;

      const req = {
        body: { username: "al", age: -5 },
      } as any;

      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonResponse = data;
        },
      } as any;

      const next = () => {
        nextCalled = true;
      };

      const middleware = validateBody(testSchema);
      middleware(req, res, next);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 400);
      assert.strictEqual(jsonResponse.message, "Validation failed");
      assert.ok(jsonResponse.errors.length >= 2);
    });
  });

  describe("2. sanitizeMiddleware (NoSQL Injection Defense)", () => {
    it("should recursively strip prohibited MongoDB operator keys ($gt, $where, etc.) from req.body and req.query", () => {
      let nextCalled = false;

      const req = {
        body: {
          username: "admin",
          password: { $gt: "" }, // NoSQL injection attempt
          nested: {
            $where: "sleep(5000)",
            validField: "safe value",
          },
        },
        query: {
          role: { $ne: null },
          search: "biology",
        },
        params: {},
      } as any;

      const res = {} as any;
      const next = () => {
        nextCalled = true;
      };

      sanitizeMiddleware(req, res, next);

      assert.strictEqual(nextCalled, true);
      assert.strictEqual((req.body.password as any).$gt, undefined);
      assert.strictEqual((req.body.nested as any).$where, undefined);
      assert.strictEqual(req.body.nested.validField, "safe value");
      assert.strictEqual((req.query.role as any).$ne, undefined);
      assert.strictEqual(req.query.search, "biology");
    });
  });

  describe("3. authorize Role Guard Middleware", () => {
    it("should allow request when user role is in allowed roles list", () => {
      let nextCalled = false;
      const req = { user: { role: "teacher" } } as any;
      const res = {} as any;
      const next = () => {
        nextCalled = true;
      };

      const middleware = authorize(["admin", "teacher"] as any);
      middleware(req, res, next);

      assert.strictEqual(nextCalled, true);
    });

    it("should return 403 Forbidden when user role is not authorized", () => {
      let nextCalled = false;
      let statusCode = 200;
      let jsonResponse: any = null;

      const req = { user: { role: "student" } } as any;
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        json: (data: any) => {
          jsonResponse = data;
        },
      } as any;
      const next = () => {
        nextCalled = true;
      };

      const middleware = authorize(["admin", "teacher"] as any);
      middleware(req, res, next);

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 403);
      assert.ok(jsonResponse.message.includes("not authorized"));
    });
  });
});
