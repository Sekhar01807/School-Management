import { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { Validator, ValidationResult } from "../validators/schemas.ts";

export type SchemaOrValidator<T> = z.ZodType<T> | Validator<T>;

/**
 * Universal Request Body Validation Middleware
 * Accepts either a Zod schema (executing safeParse) or a legacy Validator function.
 * Sets sanitized & normalized data to req.body on success, returns 400 Bad Request with formatted errors on failure.
 */
export const validateBody = <T>(schemaOrValidator: SchemaOrValidator<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    let result: ValidationResult<T>;

    if (schemaOrValidator instanceof z.ZodType) {
      const parsed = schemaOrValidator.safeParse(req.body);
      if (parsed.success) {
        result = { success: true, data: parsed.data };
      } else {
        const errors = parsed.error.issues.map((err: any) => {
          if (err.path && err.path.length > 0) {
            return `${err.path.join(".")}: ${err.message}`;
          }
          return err.message;
        });
        result = { success: false, errors };
      }
    } else if (typeof schemaOrValidator === "function") {
      result = schemaOrValidator(req.body);
    } else {
      return next();
    }

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.errors || ["Invalid request payload."],
      });
      return;
    }

    // Assign sanitized & normalized data to req.body
    req.body = result.data;
    next();
  };
};
