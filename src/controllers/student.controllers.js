import { asyncHandler } from '../utils/asyncHandler.js'
import { Student } from '../models/student.model.js';
import { Attendance } from '../models/attendance.model.js';
import { Course } from '../models/course.model.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Lecture } from '../models/lecture.model.js';
import { Teacher } from '../models/teacher.model.js';
import crypto from 'crypto'
import { sendEmail } from '../utils/sendEmail.js'

const generateAccessToken = async (userId, expiry_date_check) => {
    const student = await Student.findById(userId);
    const accessToken = await student.generateAccessToken(expiry_date_check);
    return { accessToken };
};

const loginStudent = asyncHandler(async (req, res) => {
    const { studentId, password, checkbox } = req.body;

    if (!studentId || studentId.length === 0 || !password || password.length === 0) {
        return res.status(400).json(new ApiError(400, "Please fill in all required fields."));
    }

    const student = await Student.findOne({ studentId });

    if (!student) {
        return res.status(404).json(new ApiError(404, "Invalid Student ID. Please try again."));
    }

    if (student.status === 'Disabled') {
        return res.status(403).json(new ApiError(403, "Your account has been disabled. Please contact the administrator for assistance."));
    }

    const passwordValid = await student.isPasswordCorrect(password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "The password you entered is incorrect."));
    }

    const { accessToken } = await generateAccessToken(student._id, checkbox);

    const loggedInStudent = await Student.findById(student._id).select("-password");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(
            new ApiResponse(200, {
                user: {
                    loggedInStudentId: loggedInStudent._id,
                    accessToken
                }
            }, "Login successful. Welcome back!")
        );
});

const logoutStudent = asyncHandler(async (req, res) => {
    const student = req?.user;

    if (!student) {
        return res.status(401).json(new ApiError(401, "You are not authorized to perform this action."));
    }

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(200, { logoutStudentId: student._id }, "You have been logged out successfully.")
        );
});

const currentStudent = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, { student: req?.user }, "Student profile retrieved successfully.")
        );
});

const calculateCourseAttendance = asyncHandler(async (req, res) => {
    const { studentId, collegeRollNo, semester, degreeTitle, shift, section } = req.body;

    if (!studentId || !collegeRollNo || !semester || !degreeTitle) {
        return res
            .status(400)
            .json(new ApiError(400, "Please fill in all required fields."));
    }

    const courses = await Course.find({
        degreeTitle,
        semester
    }).select("courseName courseCode");

    if (!courses.length) {
        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    courseAttendance: [],
                    overAllAttendance: {
                        classConducted: "0/0",
                        totalClassConducted: "0",
                        percentage: 0
                    }
                },
                "No courses were found for the selected criteria."
            )
        );
    }

    const attendanceData = await Attendance.aggregate([
        {
            $match: {
                studentId,
                collegeRollNo,
                semester,
                degreeTitle
            }
        },

        {
            $group: {
                _id: "$courseCode",

                presentCount: {
                    $sum: {
                        $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0]
                    }
                },

                absentCount: {
                    $sum: {
                        $cond: [{ $eq: ["$attendance", "Absent"] }, 1, 0]
                    }
                },

                totalRecords: { $sum: 1 }
            }
        },

        {
            $project: {
                _id: 0,
                courseCode: "$_id",
                presentCount: 1,
                absentCount: 1,

                leaveCount: {
                    $subtract: [
                        "$totalRecords",
                        {
                            $add: ["$presentCount", "$absentCount"]
                        }
                    ]


                }
            }
        },

        {
            $project: {
                courseCode: 1,
                presentCount: 1,

                totalCount: {
                    $subtract: [
                        {
                            $add: ["$presentCount", "$absentCount"]
                        },
                        0
                    ]
                }
            }
        }
    ]);

    const courseAttendance = await Promise.all(
        courses.map(async (course) => {

            const attendance = attendanceData.find(
                (a) => a.courseCode === course.courseCode
            );

            const lecture = await Lecture.find({
                courseCode: course.courseCode,
                degreeTitle,
                semester,
                section,
                shift
            }).select("teacherId");

            let teacherNames = [];

            for (const l of lecture) {

                const teacher = await Teacher.findOne({
                    teacherId: l?.teacherId
                }).select("fullName");

                if (teacher?.fullName) {
                    teacherNames.push(teacher.fullName);
                }
            }

            if (!attendance) {
                return {
                    courseName: course.courseName,
                    courseCode: course.courseCode,
                    teacherName:
                        teacherNames.length === 0
                            ? null
                            : teacherNames.join(" + "),
                    percentage: 0,
                    classConducted: "0/0"
                };
            }

            const percentage = parseInt(
                (attendance.presentCount / attendance.totalCount) * 100
            );

            return {
                courseName: course.courseName,
                courseCode: course.courseCode,
                teacherName:
                    teacherNames.length === 0
                        ? null
                        : teacherNames.join(" + "),
                percentage: isNaN(percentage) ? 0 : percentage,
                classConducted: `${attendance.presentCount}/${attendance.totalCount}`
            };
        })
    );

    const classC = courseAttendance.reduce(
        (sum, item) => sum + parseInt(item.classConducted.split("/")[0]),
        0
    );

    const totalC = courseAttendance.reduce(
        (sum, item) => sum + parseInt(item.classConducted.split("/")[1]),
        0
    );

    const totalPercentage = parseInt((classC / totalC) * 100);

    const overAllAttendance = {
        classConducted: `${classC}/${totalC}`,
        totalClassConducted: `${totalC}`,
        percentage: isNaN(totalPercentage) ? 0 : totalPercentage
    };

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                courseAttendance,
                overAllAttendance
            },
            "Attendance report generated successfully."
        )
    );
});

const fetchSpecificAttendance = asyncHandler(async (req, res) => {
    const { date, studentId, collegeRollNo, degreeTitle, semester } = req.body;

    const filteredAttendance = await Attendance.aggregate([
        {
            $match: {
                studentId,
                collegeRollNo,
                degreeTitle,
                semester
            }
        },
        {
            $match: {
                $expr: {
                    $eq: [
                        {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt"
                            }
                        },
                        date
                    ]
                }
            }
        },
        {
            $lookup: {
                from: "courses",
                localField: "courseCode",
                foreignField: "courseCode",
                as: "courseDetails"
            }
        },
        {
            $addFields: {
                courseDetails: { $first: "$courseDetails" }
            }
        },
        {
            $project: {
                _id: 0,
                courseCode: 1,
                courseName: "$courseDetails.courseName",
                attendance: 1
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, { attendance: filteredAttendance }, "Attendance records retrieved successfully."))
})

const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password, retype_password } = req.body;

    if (!current_password || !new_password || !retype_password ||
        current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
        return res.status(400).json(new ApiError(400, "Please fill in all required fields."));
    }

    if (new_password !== retype_password) {
        return res.status(400).json(new ApiError(400, "The new password and confirmation password do not match."));
    }

    const student = await Student.findById(req?.user?._id);

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student record could not be found."));
    }

    const isPasswordCorrect = await student.isPasswordCorrect(current_password);

    if (!isPasswordCorrect) {
        return res.status(400).json(new ApiError(400, "The current password you entered is incorrect."));
    }

    student.password = new_password;
    await student.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Your password has been updated successfully.")
    );
});

const uploadStudentImage = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path;
    const id = req?.body?.id;

    if (!avatarFile) {
        return res.status(400).json(new ApiError(400, "Please select a profile image to upload."));
    }

    const avatar = await uploadOnCloudinary(avatarFile, "LMS_Portal/students/avatars");

    if (!avatar) {
        return res.status(400).json(new ApiError(400, "Failed to upload the profile image. Please try again later."));
    }

    const student = await Student.findById(id);

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student record could not be found."));
    }

    const oldPublicId = student.profileImagePublicId;

    if (oldPublicId) {
        const deleteAvatar = await deleteFromCloudinary(oldPublicId);
        if (!deleteAvatar) {
            return res.status(400).json(new ApiError(400, "Unable to remove the previous profile image. Please try again."));
        }
    }

    await Student.findByIdAndUpdate(id, {
        $set: {
            profileImage: avatar.secure_url,
            profileImagePublicId: avatar.public_id
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { avatarUrl: avatar.secure_url }, "Profile image updated successfully.")
    );
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { studentId, email } = req.body;

    if (!studentId || !email || studentId.length === 0 || email.length === 0) {
        return res.status(400).json(new ApiError(400, "Please fill in all required fields."))
    }

    const student = await Student.findOne({
        $and: [
            { studentId },
            { email }
        ]
    })

    if (!student) {
        return res.status(400).json(new ApiError(400, "Invalid Student ID or email address."))
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    student.resetPasswordToken = hashedToken;

    student.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await student.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`

    await sendEmail(
        student.email,
        "Reset Password",
        `
            <h2>Password Reset</h2>

            <p>
                Click the button below to reset your password.
            </p>

            <a href="${resetUrl}">
                Reset Password
            </a>
            `
    )

    return res.status(200).json(new ApiResponse(200, {}, "Password reset instructions have been sent to your email address."));

})

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length === 0) {
        return res.status(400).json(new ApiError(400, "Please enter a new password."))
    }

    const student = await Student.findOne({
        resetPasswordToken: token,
        resetPasswordExpire: {
            $gt: Date.now()
        }
    })

    if (!student) {
        return res.status(400).json(new ApiError(400, "This password reset link is invalid or has expired. Please request a new one."))
    }

    const existPassword = await student.isPasswordCorrect(password);

    if (existPassword) {
        return res.status(400).json(new ApiError(400, "For security reasons, please choose a password you have not used before."))
    }

    student.password = password;
    student.resetPasswordToken = undefined;
    student.resetPasswordExpire = undefined;
    await student.save();

    return res.status(200).json(new ApiResponse(200, {}, "Your password has been reset successfully. You can now log in with your new password."))

})

export {
    logoutStudent,
    loginStudent,
    currentStudent,
    changePassword,
    uploadStudentImage,
    calculateCourseAttendance,
    fetchSpecificAttendance,
    forgotPassword,
    resetPassword
};