import { type Response } from "express";
import { ClassService } from "../services/classService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Create a new Class
// @route   POST /api/classes/create
// @access  Private/Admin
export const createClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ClassService.createClass(
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while creating class" });
  }
};

// @desc    Get All Classes (Paginated & Searchable)
// @route   GET /api/classes
// @access  Private (Admin & Teacher)
export const getAllClasses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await ClassService.getAllClasses({ page, limit, search });
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching classes" });
  }
};

// @desc    Update Class
// @route   PUT /api/classes/update/:id or PATCH /api/classes/update/:id
// @access  Private/Admin
export const updateClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ClassService.updateClass(
      req.params.id as string,
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating class" });
  }
};

// @desc    Delete Class
// @route   DELETE /api/classes/delete/:id
// @access  Private/Admin
export const deleteClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await ClassService.deleteClass(
      req.params.id as string,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting class" });
  }
};
