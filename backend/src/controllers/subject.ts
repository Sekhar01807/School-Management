import { type Response } from "express";
import { SubjectService } from "../services/subjectService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Create a new Subject
// @route   POST /api/subjects/create
// @access  Private/Admin
export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await SubjectService.createSubject(
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while creating subject" });
  }
};

// @desc    Get all Subjects (Paginated & Searchable)
// @route   GET /api/subjects
// @access  Private (Admin & Teacher)
export const getAllSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await SubjectService.getAllSubjects({ page, limit, search });
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching subjects" });
  }
};

// @desc    Update Subject
// @route   PUT /api/subjects/update/:id or PATCH /api/subjects/update/:id
// @access  Private/Admin
export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await SubjectService.updateSubject(
      req.params.id,
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating subject" });
  }
};

// @desc    Delete Subject
// @route   DELETE /api/subjects/delete/:id
// @access  Private/Admin
export const deleteSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await SubjectService.deleteSubject(
      req.params.id,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting subject" });
  }
};
