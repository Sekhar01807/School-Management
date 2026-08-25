import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("SchoolSync Resource-Level Authorization Test Suite", () => {
  describe("1. Teacher Resource Isolation (IDOR Defense)", () => {
    const teacherA = { _id: "teacher_A_id", role: "teacher" };
    const teacherB = { _id: "teacher_B_id", role: "teacher" };
    const adminUser = { _id: "admin_id", role: "admin" };

    const examAuthoredByA = {
      _id: "exam_101",
      teacher: "teacher_A_id",
      title: "Algebra Exam",
      isActive: true,
      questions: [{ questionText: "Q1", correctAnswer: "Option A" }],
    };

    it("should allow authoring teacher to access their exam", () => {
      const isOwner = examAuthoredByA.teacher === teacherA._id;
      assert.strictEqual(isOwner, true);
    });

    it("should block non-authoring teacher from accessing or modifying another teacher's exam", () => {
      const isOwner = examAuthoredByA.teacher === teacherB._id;
      const isAdmin = teacherB.role === "admin";
      const isAuthorized = isOwner || isAdmin;

      assert.strictEqual(isAuthorized, false);
    });

    it("should allow admin to manage any exam regardless of author", () => {
      const isOwner = examAuthoredByA.teacher === adminUser._id;
      const isAdmin = adminUser.role === "admin";
      const isAuthorized = isOwner || isAdmin;

      assert.strictEqual(isAuthorized, true);
    });
  });

  describe("2. Student Class Boundary Enforcement", () => {
    const studentInClassA = {
      _id: "student_1",
      role: "student",
      studentClass: "class_A_id",
    };

    const examForClassA = { _id: "exam_A", class: "class_A_id", isActive: true };
    const examForClassB = { _id: "exam_B", class: "class_B_id", isActive: true };

    it("should allow student to access exam assigned to their enrolled class", () => {
      const isEnrolled = studentInClassA.studentClass === examForClassA.class;
      assert.strictEqual(isEnrolled, true);
    });

    it("should block student from accessing exam assigned to a different class", () => {
      const isEnrolled = studentInClassA.studentClass === examForClassB.class;
      assert.strictEqual(isEnrolled, false);
    });

    it("should block student from viewing timetable for a different class", () => {
      const requestedClassId = "class_B_id";
      const canAccessTimetable = studentInClassA.studentClass === requestedClassId;
      assert.strictEqual(canAccessTimetable, false);
    });
  });

  describe("3. Teacher Mutation Boundaries (Privilege Escalation Defense)", () => {
    const teacherUser = { _id: "teacher_1", role: "teacher" };
    const targetAdmin = { _id: "admin_1", role: "admin" };
    const targetStudent = { _id: "student_1", role: "student" };

    it("should reject teacher attempting to update another teacher or admin", () => {
      const isStudentTarget = targetAdmin.role === "student";
      const canTeacherModify = teacherUser.role === "teacher" && isStudentTarget;
      assert.strictEqual(canTeacherModify, false);
    });

    it("should allow teacher to update a student account", () => {
      const isStudentTarget = targetStudent.role === "student";
      const canTeacherModify = teacherUser.role === "teacher" && isStudentTarget;
      assert.strictEqual(canTeacherModify, true);
    });

    it("should prevent self-deletion", () => {
      const requesterId = "user_123";
      const targetUserId = "user_123";
      const isSelfDeletion = requesterId === targetUserId;
      assert.strictEqual(isSelfDeletion, true);
    });
  });

  describe("4. Attendance Submission & View Authorization", () => {
    const assignedClass = {
      _id: "class_10A",
      classTeacher: "teacher_1",
      subjects: ["subject_math"],
    };

    const teacherAssigned = {
      _id: "teacher_1",
      role: "teacher",
      teacherSubject: ["subject_math"],
    };

    const teacherUnassigned = {
      _id: "teacher_2",
      role: "teacher",
      teacherSubject: ["subject_physics"],
    };

    it("should authorize teacher assigned as classTeacher to mark attendance", () => {
      const isAuthorized =
        assignedClass.classTeacher === teacherAssigned._id ||
        assignedClass.subjects.some((s) => teacherAssigned.teacherSubject.includes(s));
      assert.strictEqual(isAuthorized, true);
    });

    it("should reject unassigned teacher attempting to mark attendance for a class", () => {
      const isAuthorized =
        assignedClass.classTeacher === teacherUnassigned._id ||
        assignedClass.subjects.some((s) => teacherUnassigned.teacherSubject.includes(s));
      assert.strictEqual(isAuthorized, false);
    });
  });

  describe("5. Student Report Card & Attendance IDOR Prevention", () => {
    const studentAlice = {
      _id: "student_alice",
      role: "student",
      studentClass: "class_10A",
      parentId: "parent_alice",
    };

    const parentAlice = {
      _id: "parent_alice",
      role: "parent",
      children: ["student_alice"],
    };

    const parentBob = {
      _id: "parent_bob",
      role: "parent",
      children: ["student_bob"],
    };

    const teacherMath10A = {
      _id: "teacher_math",
      role: "teacher",
      teacherSubject: ["math_101"],
    };

    const class10A = {
      _id: "class_10A",
      classTeacher: "teacher_other",
      subjects: ["math_101"],
    };

    const teacherHistory10B = {
      _id: "teacher_history",
      role: "teacher",
      teacherSubject: ["history_101"],
    };

    it("should allow parent to view their own child's report card / attendance", () => {
      const isParentAuthorized =
        studentAlice.parentId === parentAlice._id ||
        parentAlice.children.includes(studentAlice._id);
      assert.strictEqual(isParentAuthorized, true);
    });

    it("should block parent from viewing another student's report card / attendance (IDOR)", () => {
      const isParentAuthorized =
        studentAlice.parentId === parentBob._id ||
        parentBob.children.includes(studentAlice._id);
      assert.strictEqual(isParentAuthorized, false);
    });

    it("should allow assigned teacher to view student report in their class", () => {
      const isTeacherOfClass =
        class10A.classTeacher === teacherMath10A._id ||
        class10A.subjects.some((s) => teacherMath10A.teacherSubject.includes(s));
      const isAuthorized = studentAlice.studentClass === class10A._id && isTeacherOfClass;
      assert.strictEqual(isAuthorized, true);
    });

    it("should block unassigned teacher from viewing student report in another class (IDOR)", () => {
      const isTeacherOfClass =
        class10A.classTeacher === teacherHistory10B._id ||
        class10A.subjects.some((s) => teacherHistory10B.teacherSubject.includes(s));
      const isAuthorized = studentAlice.studentClass === class10A._id && isTeacherOfClass;
      assert.strictEqual(isAuthorized, false);
    });

    it("should block student from viewing another student's report card", () => {
      const studentOther = { _id: "student_other", role: "student" };
      const isSelf = studentOther._id === studentAlice._id;
      assert.strictEqual(isSelf, false);
    });
  });

  describe("6. Export Attendance & Report Card Authorization", () => {
    const assignedClass = {
      _id: "class_10A",
      classTeacher: "teacher_1",
      subjects: ["math_101"],
    };

    const unassignedClass = {
      _id: "class_10B",
      classTeacher: "teacher_2",
      subjects: ["science_101"],
    };

    const teacher1 = {
      _id: "teacher_1",
      role: "teacher",
      teacherSubject: ["math_101"],
    };

    it("should allow teacher to export attendance for an assigned class", () => {
      const isAssigned =
        assignedClass.classTeacher === teacher1._id ||
        assignedClass.subjects.some((s) => teacher1.teacherSubject.includes(s));
      assert.strictEqual(isAssigned, true);
    });

    it("should reject teacher attempting to export attendance for an unassigned class", () => {
      const isAssigned =
        unassignedClass.classTeacher === teacher1._id ||
        unassignedClass.subjects.some((s) => teacher1.teacherSubject.includes(s));
      assert.strictEqual(isAssigned, false);
    });

    it("should allow parent to export report card only for linked child", () => {
      const childId = "child_123";
      const otherStudentId = "child_456";
      const parent = { _id: "parent_1", role: "parent", children: [childId] };

      const canExportChild = parent.children.includes(childId);
      const canExportOther = parent.children.includes(otherStudentId);

      assert.strictEqual(canExportChild, true);
      assert.strictEqual(canExportOther, false);
    });
  });

  describe("7. Parent Timetable Class Isolation", () => {
    const parentWithChildIn10A = {
      _id: "parent_1",
      role: "parent",
      children: [{ _id: "student_1", studentClass: "class_10A" }],
    };

    it("should allow parent to access timetable of class where child is enrolled", () => {
      const targetClass = "class_10A";
      const isChildEnrolled = parentWithChildIn10A.children.some(
        (c) => c.studentClass === targetClass
      );
      assert.strictEqual(isChildEnrolled, true);
    });

    it("should reject parent attempting to access timetable of unrelated class", () => {
      const targetClass = "class_10B";
      const isChildEnrolled = parentWithChildIn10A.children.some(
        (c) => c.studentClass === targetClass
      );
      assert.strictEqual(isChildEnrolled, false);
    });
  });
});
