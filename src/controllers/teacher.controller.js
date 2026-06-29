import { asyncHandler } from '../utils/asyncHandler.js'
import { Teacher } from '../models/teacher.model.js'
import { Student } from '../models/student.model.js'
import { Lecture } from '../models/lecture.model.js'
import { Attendance } from '../models/attendance.model.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'

const generateAccessToken = async (userId, expiry_date_check) => {
    const teacher = await Teacher.findById(userId);
    const accessToken = await teacher.generateAccessToken(expiry_date_check);
    return { accessToken };
};

const loginTeacher = asyncHandler(async (req, res) => {
    const { teacherId, password, checkbox } = req.body;

    if (!teacherId || teacherId.length === 0 || !password || password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const teacher = await Teacher.findOne({ teacherId });

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "No account found with this Teacher ID."));
    }

    if (teacher.status === 'Disabled') {
        return res.status(403).json(new ApiError(403, "Your account has been disabled. Please contact the administrator for assistance."));
    }

    const passwordValid = await teacher.isPasswordCorrect(password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "Incorrect password. Please try again."));
    }

    const { accessToken } = await generateAccessToken(teacher._id, checkbox);

    const loggedInTeacher = await Teacher.findById(teacher._id).select("-password");

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {
                user: {
                    loggedInTeacherId: loggedInTeacher._id,
                    accessToken
                }
            }, "Logged in successfully.")
        );
});

const logoutTeacher = asyncHandler(async (req, res) => {
    const teacher = req?.user;

    if (!teacher) {
        return res.status(401).json(new ApiError(401, "Unauthorized. No active session found."));
    }

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(200, { logoutTeacherId: teacher._id }, "Logged out successfully.")
        );
});

const currentTeacher = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, { teacher: req?.user }, "Authenticated teacher details fetched successfully.")
        );
});

const uploadTeacherImage = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path;
    const id = req?.body?.id;

    if (!avatarFile) {
        return res.status(400).json(new ApiError(400, "No profile image provided. Please upload a valid image file."));
    }

    const avatar = await uploadOnCloudinary(avatarFile, "LMS_Portal/teachers/avatars");

    if (!avatar) {
        return res.status(502).json(new ApiError(502, "Failed to upload image to cloud storage. Please try again."));
    }

    const teacher = await Teacher.findById(id);

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "Teacher not found. Image upload aborted."));
    }

    const oldPublicId = teacher.profileImagePublicId;

    if (oldPublicId) {
        const deleteAvatar = await deleteFromCloudinary(oldPublicId);
        if (!deleteAvatar) {
            return res.status(502).json(new ApiError(502, "Failed to remove the existing profile image. Please try again."));
        }
    }

    await Teacher.findByIdAndUpdate(id, {
        $set: {
            profileImage: avatar.secure_url,
            profileImagePublicId: avatar.public_id
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { avatarUrl: avatar.secure_url }, "Profile image updated successfully.")
    );
});

const getTeacherLectures = asyncHandler(async (req, res) => {
    const teacher = req?.user;

    if (!teacher) {
        return res.status(401).json(new ApiError(401, "Unauthorized. No active session found."));
    }

    const lectures = await Lecture.find({ teacherId: teacher.teacherId });

    if (!lectures.length) {
        return res.status(404).json(new ApiError(404, "No lectures are currently assigned to this teacher."));
    }

    return res.status(200).json(
        new ApiResponse(200, { lectures }, `${lectures.length} lecture(s) fetched successfully.`)
    );
});

const getLectureEnrolledStudents = asyncHandler(async (req, res) => {
    const { degree, section, shift, semester } = req.query;

    if (!degree || !section || !shift || !semester ||
        degree.length === 0 || section.length === 0 || shift.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const lectureStudents = await Student.find({
        $and: [
            { degreeTitle: degree },
            { section },
            { shift },
            { semester }
        ]
    }).select('-password -cnic');

    if (!lectureStudents.length) {
        return res.status(404).json(new ApiError(404, "No students found enrolled in this lecture."));
    }

    return res.status(200).json(
        new ApiResponse(200, { students: lectureStudents }, `${lectureStudents.length} student(s) fetched successfully.`)
    );
});

const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password, retype_password } = req.body;

    if (!current_password || !new_password || !retype_password ||
        current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    if (new_password !== retype_password) {
        return res.status(400).json(new ApiError(400, "New password and confirm password do not match."));
    }

    if (new_password === current_password) {
        return res.status(400).json(new ApiError(400, "New password must be different from the current password."));
    }

    const teacher = await Teacher.findById(req?.user?._id);

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "Teacher session is invalid. Please log in again."));
    }

    const isPasswordCorrect = await teacher.isPasswordCorrect(current_password);

    if (!isPasswordCorrect) {
        return res.status(401).json(new ApiError(401, "Current password is incorrect."));
    }

    teacher.password = new_password;
    await teacher.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully. Please use your new password on next login.")
    );
});

const submitAttendance = asyncHandler(async (req, res) => {
    const studentAtdList = req.body;

    if (!studentAtdList || !Array.isArray(studentAtdList) || studentAtdList.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const attendance = await Attendance.insertMany(studentAtdList);

    if (!attendance) {
        return res.status(500).json(new ApiError(500, "Failed to save attendance records. Please try again."));
    }

    return res.status(201).json(
        new ApiResponse(201, { recordsSubmitted: studentAtdList.length }, `Attendance submitted successfully for ${studentAtdList.length} student(s).`)
    );
});

const getAttendance = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, courseCode, shift, section } = req.query;

    if (!degreeTitle || !semester || !courseCode || !shift || !section) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const attendance = await Attendance.aggregate([
        {
            $match: {
                degreeTitle,
                semester: Number(semester),
                courseCode,
                shift,
                section
            }
        },
        {
            $group: {
                _id: "$lectureAttendanceId",
                totalStudents: { $sum: 1 },
                presentCount: { $sum: { $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0] } },
                createdAt: { $first: "$createdAt" }
            }
        },
        {
            $project: {
                _id: 0,
                lectureAttendanceId: "$_id",
                Attendance: {
                    $concat: [
                        { $toString: "$presentCount" },
                        "/",
                        { $toString: "$totalStudents" }
                    ]
                },
                date: { $dateToString: { format: "%m/%d/%Y", date: "$createdAt" } },
                time: { $dateToString: { format: "%H:%M:%S", date: "$createdAt" } }
            }
        },
        { $sort: { date: -1 } }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { attendance },
            attendance.length
                ? `${attendance.length} attendance record(s) fetched successfully.`
                : "No attendance records found for the selected criteria."
        )
    );
});

const getStudentAttendance = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, shift, section, courseCode, lectureAttendanceId } = req.query;

    if (!degreeTitle || !semester || !shift || !section || !courseCode || !lectureAttendanceId) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const attendanceRecords = await Attendance.find({
        degreeTitle,
        semester,
        shift,
        section,
        courseCode,
        lectureAttendanceId
    });

    if (!attendanceRecords.length) {
        return res.status(404).json(new ApiError(404, "No attendance records found for the specified lecture."));
    }

    return res.status(200).json(
        new ApiResponse(200, { attendance: attendanceRecords }, `${attendanceRecords.length} student attendance record(s) fetched successfully.`)
    );
});

const updateStudentAttendance = asyncHandler(async (req, res) => {
    const studentsData = req.body;

    if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required."));
    }

    const lectureAttendanceId = studentsData[0].lectureAttendanceId;

    if (!lectureAttendanceId) {
        return res.status(400).json(new ApiError(400, "Lecture attendance ID is missing. Please provide a valid session reference."));
    }

    for (const student of studentsData) {
        await Attendance.updateOne(
            {
                degreeTitle: student.degreeTitle,
                courseCode: student.courseCode,
                semester: student.semester,
                shift: student.shift,
                section: student.section,
                lectureAttendanceId,
                studentId: student.studentId
            },
            { $set: { attendance: student.attendance } }
        );
    }

    return res.status(200).json(
        new ApiResponse(200, { recordsUpdated: studentsData.length }, `Attendance updated successfully for ${studentsData.length} student(s).`)
    );
});

export {
    loginTeacher,
    logoutTeacher,
    currentTeacher,
    getTeacherLectures,
    getLectureEnrolledStudents,
    submitAttendance,
    getAttendance,
    getStudentAttendance,
    updateStudentAttendance,
    uploadTeacherImage,
    changePassword
};