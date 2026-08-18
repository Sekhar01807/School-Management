import { type Response } from "express";
import { logActivity } from "../utils/activitieslog.ts";
import Subject from "../models/subject.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";

// @desc    Create a new Subject
// @route   POST /api/subjects/create
// @access  Private/Admin
export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, teacher, isActive } = req.body;

    const subjectExists = await Subject.findOne({ code: code?.trim() });
    if (subjectExists) {
      res.status(400).json({ message: "Subject with this code already exists." });
      return;
    }

    const newSubject = await Subject.create({
      name: name?.trim(),
      code: code?.trim(),
      isActive: isActive !== undefined ? isActive : true,
      teacher: Array.isArray(teacher) ? teacher : [],
    });

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Created subject: ${newSubject.name}`,
      });
    }

    res.status(201).json(newSubject);
  } catch (error) {
    console.error("Create subject error:", error);
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

    const query: any = {};
    if (search) {
      const sanitized = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { code: { $regex: sanitized, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, subjects] = await Promise.all([
      Subject.countDocuments(query),
      Subject.find(query)
        .populate("teacher", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({
      subjects,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Get subjects error:", error);
    res.status(500).json({ message: "Server error while fetching subjects" });
  }
};

// @desc    Update Subject (with duplicate code check)
// @route   PUT /api/subjects/update/:id or PATCH /api/subjects/update/:id
// @access  Private/Admin
export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const subjectId = req.params.id;
    const { name, code, teacher, isActive } = req.body;

    const existingSubject = await Subject.findById(subjectId);
    if (!existingSubject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    // Duplicate code check if code is being updated
    if (code && code.trim() !== existingSubject.code) {
      const duplicateCode = await Subject.findOne({
        _id: { $ne: subjectId },
        code: code.trim(),
      });
      if (duplicateCode) {
        res.status(400).json({ message: "Subject with this code already exists." });
        return;
      }
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      subjectId,
      {
        name: name ? name.trim() : existingSubject.name,
        code: code ? code.trim() : existingSubject.code,
        isActive: isActive !== undefined ? isActive : existingSubject.isActive,
        teacher: teacher !== undefined ? (Array.isArray(teacher) ? teacher : []) : existingSubject.teacher,
      },
      { new: true, runValidators: true }
    ).populate("teacher", "name email");

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Updated subject: ${updatedSubject?.name}`,
      });
    }

    res.json(updatedSubject);
  } catch (error) {
    console.error("Update subject error:", error);
    res.status(500).json({ message: "Server error while updating subject" });
  }
};

// @desc    Delete Subject
// @route   DELETE /api/subjects/delete/:id
// @access  Private/Admin
export const deleteSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deletedSubject = await Subject.findByIdAndDelete(req.params.id);

    if (!deletedSubject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Deleted subject: ${deletedSubject.name}`,
      });
    }

    res.json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Delete subject error:", error);
    res.status(500).json({ message: "Server error while deleting subject" });
  }
};
