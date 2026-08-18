import { type Response } from "express";
import Class from "../models/class.ts";
import { logActivity } from "../utils/activitieslog.ts";
import type { AuthRequest } from "../middleware/auth.ts";
import { escapeRegex } from "../utils/escapeRegex.ts";

// @desc    Create a new Class
// @route   POST /api/classes/create
// @access  Private/Admin
export const createClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, academicYear, classTeacher, capacity, subjects } = req.body;

    const existingClass = await Class.findOne({ name, academicYear });
    if (existingClass) {
      res.status(400).json({
        message: "Class with this name already exists for the specified academic year.",
      });
      return;
    }

    const newClass = await Class.create({
      name,
      academicYear,
      classTeacher: classTeacher || null,
      capacity: capacity || 40,
      subjects: Array.isArray(subjects) ? subjects : [],
    });

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Created new class: ${newClass.name}`,
      });
    }

    res.status(201).json(newClass);
  } catch (error) {
    console.error("Create class error:", error);
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

    const query: any = {};
    if (search) {
      const sanitized = escapeRegex(search.trim());
      query.name = { $regex: sanitized, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [total, classes] = await Promise.all([
      Class.countDocuments(query),
      Class.find(query)
        .populate("academicYear", "name isCurrent")
        .populate("classTeacher", "name email")
        .populate("subjects", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({
      classes,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    console.error("Get all classes error:", error);
    res.status(500).json({ message: "Server error while fetching classes" });
  }
};

// @desc    Update Class (Fixed duplicate check)
// @route   PUT /api/classes/update/:id or PATCH /api/classes/update/:id
// @access  Private/Admin
export const updateClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const classId = req.params.id;
    const { name, academicYear, classTeacher, capacity, subjects } = req.body;

    const currentClass = await Class.findById(classId);
    if (!currentClass) {
      res.status(404).json({ message: "Class not found" });
      return;
    }

    const checkName = name || currentClass.name;
    const checkYear = academicYear || currentClass.academicYear;

    // Targeted duplicate check: only duplicate if another class has the same name + academicYear
    const duplicate = await Class.findOne({
      _id: { $ne: classId },
      name: checkName,
      academicYear: checkYear,
    });

    if (duplicate) {
      res.status(400).json({
        message: "A class with this name already exists in the selected academic year.",
      });
      return;
    }

    const updatePayload: any = {
      name: checkName,
      academicYear: checkYear,
      capacity: capacity !== undefined ? capacity : currentClass.capacity,
    };

    if (classTeacher !== undefined) {
      updatePayload.classTeacher = classTeacher || null;
    }

    if (subjects !== undefined) {
      updatePayload.subjects = Array.isArray(subjects) ? subjects : [];
    }

    const updatedClass = await Class.findByIdAndUpdate(classId, updatePayload, {
      new: true,
      runValidators: true,
    })
      .populate("academicYear", "name isCurrent")
      .populate("classTeacher", "name email")
      .populate("subjects", "name code");

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Updated class: ${updatedClass?.name}`,
      });
    }

    res.status(200).json(updatedClass);
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({ message: "Server error while updating class" });
  }
};

// @desc    Delete Class
// @route   DELETE /api/classes/delete/:id
// @access  Private/Admin
export const deleteClass = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deletedClass = await Class.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      res.status(404).json({ message: "Class not found" });
      return;
    }

    if (req.user) {
      await logActivity({
        userId: req.user._id.toString(),
        action: `Deleted class: ${deletedClass.name}`,
      });
    }

    res.json({ message: "Class removed successfully" });
  } catch (error: any) {
    console.error("Delete class error:", error);
    res.status(500).json({ message: "Server error while deleting class" });
  }
};
