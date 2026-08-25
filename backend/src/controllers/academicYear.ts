import { type Response } from "express";
import { AcademicYearService } from "../services/academicYearService.ts";
import type { AuthRequest } from "../middleware/auth.ts";

// @desc    Create a new Academic Year
// @route   POST /api/academic-years/create
// @access  Private/Admin
export const createAcademicYear = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await AcademicYearService.createAcademicYear(
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while creating academic year" });
  }
};

// @desc    Get all Academic Years (Paginated & Searchable)
// @route   GET /api/academic-years
// @access  Private/Admin
export const getAllAcademicYears = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;

    const result = await AcademicYearService.getAllAcademicYears({ page, limit, search });
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching academic years" });
  }
};

// @desc    Get the current active Academic Year
// @route   GET /api/academic-years/current
// @access  Private
export const getCurrentAcademicYear = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await AcademicYearService.getCurrentAcademicYear();
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching current academic year" });
  }
};

// @desc    Update Academic Year
// @route   PUT /api/academic-years/update/:id or PATCH /api/academic-years/update/:id
// @access  Private/Admin
export const updateAcademicYear = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await AcademicYearService.updateAcademicYear(
      req.params.id as string,
      req.body,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating academic year" });
  }
};

// @desc    Delete Academic Year
// @route   DELETE /api/academic-years/delete/:id
// @access  Private/Admin
export const deleteAcademicYear = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const result = await AcademicYearService.deleteAcademicYear(
      req.params.id as string,
      req.user?._id?.toString()
    );
    res.status(result.status).json(result.data);
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting academic year" });
  }
};
