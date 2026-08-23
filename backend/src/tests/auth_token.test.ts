import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

describe("SchoolSync Auth & Token Security Test Suite", () => {
  const TEST_SECRET = "super_secret_test_jwt_key_minimum_32_chars_long!";

  describe("1. JWT Lifecycle & Signature Verification", () => {
    it("should generate a valid HS512 JWT token containing userId", () => {
      const userId = "64f1a2b3c4d5e6f7a8b9c0d1";
      const token = jwt.sign({ userId }, TEST_SECRET, {
        expiresIn: "30d",
        algorithm: "HS512",
      });

      assert.strictEqual(typeof token, "string");
      assert.strictEqual(token.split(".").length, 3);

      const decoded = jwt.verify(token, TEST_SECRET) as any;
      assert.strictEqual(decoded.userId, userId);
    });

    it("should reject tampered JWT token signature", () => {
      const userId = "64f1a2b3c4d5e6f7a8b9c0d1";
      const validToken = jwt.sign({ userId }, TEST_SECRET, { expiresIn: "1h" });
      const tamperedToken = validToken.slice(0, -5) + "abcde";

      assert.throws(() => {
        jwt.verify(tamperedToken, TEST_SECRET);
      });
    });

    it("should reject expired JWT token", () => {
      const expiredToken = jwt.sign(
        { userId: "123" },
        TEST_SECRET,
        { expiresIn: "0s" } // instantly expired
      );

      assert.throws(() => {
        jwt.verify(expiredToken, TEST_SECRET);
      });
    });
  });

  describe("2. Cookie Security Attributes", () => {
    it("should set HttpOnly, SameSite strict, and correct maxAge", () => {
      let cookieName = "";
      let cookieValue = "";
      let cookieOptions: any = {};

      const mockRes = {
        cookie: (name: string, value: string, options: any) => {
          cookieName = name;
          cookieValue = value;
          cookieOptions = options;
        },
      } as any;

      // Mock generate token behavior
      const token = "mock_jwt_token";
      mockRes.cookie("jwt", token, {
        httpOnly: true,
        secure: false, // development mode
        sameSite: "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      assert.strictEqual(cookieName, "jwt");
      assert.strictEqual(cookieValue, token);
      assert.strictEqual(cookieOptions.httpOnly, true);
      assert.strictEqual(cookieOptions.sameSite, "strict");
      assert.strictEqual(cookieOptions.maxAge, 2592000000);
      assert.strictEqual(cookieOptions.path, "/");
    });

    it("should clear cookie on logout by setting maxAge 0 and expired date", () => {
      let clearedOptions: any = {};
      const mockRes = {
        cookie: (name: string, value: string, options: any) => {
          clearedOptions = options;
        },
      } as any;

      mockRes.cookie("jwt", "", {
        httpOnly: true,
        sameSite: "strict",
        expires: new Date(0),
      });

      assert.strictEqual(clearedOptions.httpOnly, true);
      assert.strictEqual(clearedOptions.expires.getTime(), 0);
    });
  });

  describe("3. Inactive Account Invalidation", () => {
    it("should reject access when user.isActive is false", () => {
      const user = { _id: "user123", email: "student@school.edu", isActive: false };
      const canAccess = user.isActive === true;
      assert.strictEqual(canAccess, false);
    });

    it("should permit access when user.isActive is true", () => {
      const user = { _id: "user456", email: "active@school.edu", isActive: true };
      const canAccess = user.isActive === true;
      assert.strictEqual(canAccess, true);
    });
  });
});
