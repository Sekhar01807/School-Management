import { type Response } from "express";
import AcademicYear from "../models/academicYear.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";

// @desc    Create a new Academic Year
// @route   POST /api/academic-years/create
// @access  Private/Admin
export const createAcademicYear = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, fromYear, toYear, isCurrent } = req.body;

    if (!name || !fromYear || !toYear) {
      res.status(400).json({ message: "Name, start date, and end date are required." });
      return;
    }

    if (new Date(fromYear) >= new Date(toYear)) {
      res.status(400).json({ message: "Start date must be before end date." });
      return;
    }

    const existingYear = await AcademicYear.findOne({
      $or: [
        { name: name.trim() },
        { fromYear: new Date(fromYear), toYear: new Date(toYear) },
      ],
    });

    if (existingYear) {
      res.status(400).json({ message: "Academic Year with this name or date range already exists." });
      return;
    }

    // If setting as current, reset all others first
    if (isCurrent) {
      await AcademicYear.updateMany({}, { isCurrent: false });
    }

    const academicYear = await AcademicYear.create({
      name: name.trim(),
      fromYear: new Date(fromYear),
      toYear: new Date(toYear),
      isCurrent: isCurrent || false,
    });

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Created academic year: ${academicYear.name}`,
      });
    }

    res.status(201).json(academicYear);
  } catch (error) {
    console.error("Create academic year error:", error);
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

    const query: any = {};
    if (search) {
      const sanitized = escapeRegex(search.trim());
      query.name = { $regex: sanitized, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [total, years] = await Promise.all([
      AcademicYear.countDocuments(query),
      AcademicYear.find(query)
        .sort({ isCurrent: -1, fromYear: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({
      years,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Get academic years error:", error);
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
    const currentYear = await AcademicYear.findOne({ isCurrent: true });
    if (!currentYear) {
      // Fallback: pick the latest academic year if none marked active
      const latestYear = await AcademicYear.findOne().sort({ fromYear: -1 });
      if (!latestYear) {
        res.status(404).json({ message: "No active academic year found. Please create one." });
        return;
      }
      res.status(200).json(latestYear);
      return;
    }

    res.status(200).json(currentYear);
  } catch (error) {
    console.error("Get current academic year error:", error);
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
    const yearId = req.params.id;
    const { name, fromYear, toYear, isCurrent } = req.body;

    const currentDoc = await AcademicYear.findById(yearId);
    if (!currentDoc) {
      res.status(404).json({ message: "Academic Year not found" });
      return;
    }

    if (fromYear && toYear && new Date(fromYear) >= new Date(toYear)) {
      res.status(400).json({ message: "Start date must be before end date." });
      return;
    }

    // If isCurrent is true, reset all other years
    if (isCurrent) {
      await AcademicYear.updateMany({ _id: { $ne: yearId } }, { isCurrent: false });
    }

    const updatedYear = await AcademicYear.findByIdAndUpdate(
      yearId,
      {
        name: name ? name.trim() : currentDoc.name,
        fromYear: fromYear ? new Date(fromYear) : currentDoc.fromYear,
        toYear: toYear ? new Date(toYear) : currentDoc.toYear,
        isCurrent: isCurrent !== undefined ? isCurrent : currentDoc.isCurrent,
      },
      { new: true, runValidators: true }
    );

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Updated academic year: ${updatedYear?.name}`,
      });
    }

    res.status(200).json(updatedYear);
  } catch (error) {
    console.error("Update academic year error:", error);
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
    const year = await AcademicYear.findById(req.params.id);
    if (!year) {
      res.status(404).json({ message: "Academic Year not found" });
      return;
    }

    // Prevent deletion if it's the current active academic year
    if (year.isCurrent) {
      res.status(400).json({
        message: "Cannot delete the active academic year. Please set another year as active first.",
      });
      return;
    }

    await year.deleteOne();

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Deleted academic year: ${year.name}`,
      });
    }

    res.status(200).json({ message: "Academic Year deleted successfully" });
  } catch (error) {
    console.error("Delete academic year error:", error);
    res.status(500).json({ message: "Server error while deleting academic year" });
  }
};
