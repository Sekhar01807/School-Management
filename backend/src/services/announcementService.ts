import Announcement, {
  type IAnnouncement,
  type AnnouncementAudience,
  type AnnouncementPriority,
} from "../models/announcement.ts";
import ActivitiesLog from "../models/activitieslog.ts";
import User, { type IUser } from "../models/user.ts";
import { EmailService } from "./emailService.ts";

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  audience?: AnnouncementAudience[];
  targetClass?: string | null;
  priority?: AnnouncementPriority;
  expiryDate?: Date | string | null;
}

export const createAnnouncement = async (
  input: CreateAnnouncementInput,
  creator: IUser
) => {
  const announcement = await Announcement.create({
    title: input.title,
    content: input.content,
    audience: input.audience || ["all"],
    targetClass: input.targetClass || null,
    priority: input.priority || "medium",
    expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
    createdBy: creator._id,
    isActive: true,
  });

  await ActivitiesLog.create({
    user: creator._id,
    action: `Published Announcement: "${input.title}"`,
    details: `Priority: ${input.priority || "medium"}, Audience: ${(input.audience || ["all"]).join(", ")}`,
  });

  // If priority is urgent or high, asynchronously broadcast email
  if (input.priority === "urgent" || input.priority === "high") {
    const audience = input.audience || ["all"];
    let userQuery: any = { isActive: true };

    if (!audience.includes("all")) {
      const roleFilters: string[] = [];
      if (audience.includes("teacher")) roleFilters.push("teacher");
      if (audience.includes("student")) roleFilters.push("student");

      if (roleFilters.length > 0) {
        userQuery.role = { $in: roleFilters };
      }
      if (input.targetClass) {
        userQuery.studentClass = input.targetClass;
      }
    }

    User.find(userQuery)
      .select("email")
      .then((users) => {
        const emails = users.map((u) => u.email).filter(Boolean);
        if (emails.length > 0) {
          EmailService.sendUrgentAnnouncementEmail(
            emails,
            input.title,
            input.content,
            creator.name
          ).catch((err) => console.error("Error broadcasting urgent announcement emails:", err));
        }
      })
      .catch((err) => console.error("Error querying users for announcement broadcast:", err));
  }

  return await announcement.populate([
    { path: "createdBy", select: "name role" },
    { path: "targetClass", select: "name" },
  ]);
};

export const getAnnouncementsForUser = async (user: IUser) => {
  const now = new Date();
  const baseQuery: any = {
    isActive: true,
    $or: [{ expiryDate: null }, { expiryDate: { $gte: now } }],
  };

  if (user.role === "admin") {
    // Admin sees all announcements, active and recent
    return await Announcement.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name role")
      .populate("targetClass", "name");
  }

  const audienceConditions: any[] = [{ audience: "all" }];

  if (user.role === "teacher") {
    audienceConditions.push({ audience: "teacher" });
    audienceConditions.push({ createdBy: user._id });
  } else if (user.role === "student") {
    audienceConditions.push({ audience: "student" });
    if (user.studentClass) {
      audienceConditions.push({
        audience: "class",
        targetClass: user.studentClass,
      });
    }
  }

  const query = {
    ...baseQuery,
    $or: audienceConditions,
  };

  return await Announcement.find(query)
    .sort({ createdAt: -1 })
    .populate("createdBy", "name role")
    .populate("targetClass", "name");
};

export const updateAnnouncement = async (
  id: string,
  updates: Partial<CreateAnnouncementInput> & { isActive?: boolean },
  user: IUser
) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Announcement not found");
  }

  // Only Admin or author can update
  if (user.role !== "admin" && announcement.createdBy.toString() !== user._id.toString()) {
    throw new Error("Not authorized to update this announcement");
  }

  Object.assign(announcement, updates);
  if (updates.expiryDate !== undefined) {
    announcement.expiryDate = updates.expiryDate ? new Date(updates.expiryDate) : null;
  }

  await announcement.save();
  return await announcement.populate([
    { path: "createdBy", select: "name role" },
    { path: "targetClass", select: "name" },
  ]);
};

export const deleteAnnouncement = async (id: string, user: IUser) => {
  const announcement = await Announcement.findById(id);
  if (!announcement) {
    throw new Error("Announcement not found");
  }

  if (user.role !== "admin" && announcement.createdBy.toString() !== user._id.toString()) {
    throw new Error("Not authorized to delete this announcement");
  }

  await announcement.deleteOne();
  return { message: "Announcement deleted successfully" };
};
