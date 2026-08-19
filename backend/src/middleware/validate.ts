import { type Request, type Response, type NextFunction } from "express";
import type { Validator } from "../validators/schemas.ts";

export const validateBody = <T>(validator: Validator<T>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validator(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: result.errors,
      });
      return;
    }

    // Assign sanitized & normalized data to req.body
    req.body = result.data;
    next();
  };
};
