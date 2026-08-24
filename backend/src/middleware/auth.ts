import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

import User, { type IUser, type userRoles } from "../models/user.ts";

export interface AuthRequest extends Request {
  user?: IUser;
}

// Protect routes middleware
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token;

  // check for token in cookies //not token but jwt
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        return res.status(401).json({ message: "User not found or session invalid" });
      }

      if (!user.isActive) {
        return res.status(403).json({ message: "Account is deactivated. Please contact an administrator." });
      }

      req.user = user as IUser;
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Optional protect middleware: populates req.user if a valid token is present, otherwise continues without error
export const protectOptional = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  let token;
  if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
      const user = await User.findById(decoded.userId).select("-password");
      if (user && user.isActive) {
        req.user = user as IUser;
      }
    } catch (error) {
      // Ignore token verification errors for optional auth
    }
  }
  next();
};

/**
 * Accepts a list of allowed roles (e.g. 'admin', 'teacher')
 * usage: router.post('/', protect, authorize('admin'), createClass)
 */

export const authorize = (roles: userRoles[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is not authorized to access this route`,
      });
    }

    // user has permission to proceed
    next();
  };
};
