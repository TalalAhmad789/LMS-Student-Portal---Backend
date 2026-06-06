import { asyncHandler } from '../utils/asyncHandler.js'
import { Teacher } from '../models/teacher.model.js'
import { Student } from '../models/student.model.js';
import { Lecture } from '../models/lecture.model.js'
import { Course } from '../models/course.model.js'
import { Timetable } from '../models/timetable.model.js';
import Admin from '../models/admin.model.js';
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { Attendance } from '../models/attendance.model.js';

const generateAccessToken = (userId, expiry_date_check) => {
    const accessToken = jwt.sign(
        { _id: userId },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: expiry_date_check ? "30d" : process.env.ACCESS_TOKEN_EXPIRY
        }
    );
    return { accessToken };
};

// ─── Student Controllers ──────────────────────────────────────────────────────

const registerStudent = asyncHandler(async (req, res) => {
    const { fullName, degreeTitle, collegeRollNo, cnic, sessionStartDate, sessionEndDate } = req.body;

    if (!fullName || !degreeTitle || !collegeRollNo || !cnic || !sessionStartDate || !sessionEndDate ||
        fullName.length === 0 || degreeTitle.length === 0 || collegeRollNo.length === 0 ||
        cnic.length === 0 || sessionStartDate.length === 0 || sessionEndDate.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const startDate = sessionStartDate.split("-")[0];
    const studentId = `${startDate}-${degreeTitle}-${collegeRollNo}`;

    const studentExist = await Student.findOne({
        $or: [{ cnic }, { studentId }, { collegeRollNo }]
    });

    if (studentExist) {
        return res.status(409).json(new ApiError(409, "Student already registered!"));
    }

    const student = await Student.create({
        fullName, degreeTitle, collegeRollNo, cnic,
        sessionStartDate, sessionEndDate,
        studentId, password: cnic, semester: 1
    });

    const studentCreated = await Student.findById(student._id);

    if (!studentCreated) {
        return res.status(500).json(new ApiError(500, "Something went wrong while registering student!"));
    }

    return res.status(201).json(
        new ApiResponse(201, { userId: studentCreated._id }, "Student registered successfully!")
    );
});

const getStudent = asyncHandler(async (req, res) => {
    const students = await Student.find().sort("collegeRollNo");

    if (!students.length) {
        return res.status(404).json(new ApiError(404, "No students found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { students }, "Students fetched successfully!")
    );
});

const deleteStudent = asyncHandler(async (req, res) => {
    const deletedStudent = await Student.findByIdAndDelete(req.params.id);

    if (!deletedStudent) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting student!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Student deleted successfully!")
    );
});

const updateStudent = asyncHandler(async (req, res) => {
    const id = req.params.id;

    const {
        fullName, degreeTitle, collegeRollNo, cnic, address, registrationNumber,
        universityRollNumber, shift, section, semester, sessionStartDate, sessionEndDate,
        status, studentId, stoCount, Background, hsscDegree, hsscMarks, dob, email, phone, mobile
    } = req.body;

    const updatedStudent = await Student.findByIdAndUpdate(id, {
        $set: {
            fullName, degreeTitle, collegeRollNo, cnic, address, registrationNumber,
            universityRollNumber, shift, section, semester, sessionStartDate, sessionEndDate,
            status, studentId, stoCount, Background, hsscDegree, hsscMarks, dob, email, phone, mobile
        }
    }, { new: true });

    if (!updatedStudent) {
        return res.status(500).json(new ApiError(500, "Something went wrong while updating student!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Student updated successfully!")
    );
});

const resetStudentPassword = asyncHandler(async (req, res) => {
    const { id } = req.body;
    const student = await Student.findById(id);

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student not found!"));
    }

    student.password = student.cnic;
    student.save();

    return res.status(200).json(new ApiResponse(200, "Student password reset successfully!"));
})

// ─── Teacher Controllers ──────────────────────────────────────────────────────

const registerTeacher = asyncHandler(async (req, res) => {
    const { fullName, specification, cnic, email } = req.body;

    if (!fullName || !specification || !cnic || !email ||
        fullName.length === 0 || specification.length === 0 || cnic.length === 0 || email.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const teacherId = `${fullName.split(" ")[0]}-${cnic}`;

    const teacherExist = await Teacher.findOne({
        $or: [{ cnic }, { teacherId }]
    });

    if (teacherExist) {
        return res.status(409).json(new ApiError(409, "Teacher already registered!"));
    }

    const teacher = await Teacher.create({
        fullName, specification, cnic, teacherId, password: cnic, email
    });

    const teacherCreated = await Teacher.findById(teacher._id);

    if (!teacherCreated) {
        return res.status(500).json(new ApiError(500, "Something went wrong while registering teacher!"));
    }

    return res.status(201).json(
        new ApiResponse(201, { userId: teacherCreated._id }, "Teacher registered successfully!")
    );
});

const getTeacher = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find().select("-password");

    if (!teachers.length) {
        return res.status(404).json(new ApiError(404, "No teachers found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { teachers }, "Teachers fetched successfully!")
    );
});

const deleteTeacher = asyncHandler(async (req, res) => {
    const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!deletedTeacher) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting teacher!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Teacher deleted successfully!")
    );
});

const updateTeacher = asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { fullName, specification, cnic, status, teacherId, email } = req.body;

    const updatedTeacher = await Teacher.findByIdAndUpdate(id, {
        $set: { fullName, specification, cnic, status, teacherId, email }
    }, { new: true });

    if (!updatedTeacher) {
        return res.status(500).json(new ApiError(500, "Something went wrong while updating teacher!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Teacher updated successfully!")
    );
});

const resetTeacherPassword = asyncHandler(async (req, res) => {
    const { id } = req.body;
    const teacher = await Teacher.findById(id);

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "Teacher not found!"));
    }

    teacher.password = teacher.cnic;
    teacher.save();

    return res.status(200).json(new ApiResponse(200, "Teacher password reset successfully!"));
})

// ─── Admin Controllers ──────────────────────────────────────────────────────

const getAdmin = asyncHandler(async (req, res) => {
    const admins = await Admin.find({ isSuperAdmin: false }).select("-password");

    if (!admins.length) {
        return res.status(404).json(new ApiError(404, "No admins found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { admins }, "Admins fetched successfully!")
    );
});

const registerAdmin = asyncHandler(async (req, res) => {
    const { fullName, email, cnic } = req.body;

    if (!fullName || !email || !cnic ||
        fullName.length === 0 || email.length === 0 || cnic.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const adminExist = await Admin.findOne({
        $or: [{ email }, { cnic }]
    });

    if (adminExist) {
        return res.status(409).json(new ApiError(409, "Admin already registered!"));
    }

    const admin = await Admin.create({ fullName, email, cnic, password: cnic });

    const adminCreated = await Admin.findById(admin._id);

    if (!adminCreated) {
        return res.status(500).json(new ApiError(500, "Something went wrong while registering admin!"));
    }

    return res.status(201).json(
        new ApiResponse(201, { userId: adminCreated._id }, "Admin registered successfully!")
    );
});

const updateAdmin = asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { fullName, cnic, email, status } = req.body;

    const updatedAdmin = await Admin.findByIdAndUpdate(id, {
        $set: { fullName, cnic, email, status }
    }, { new: true });

    if (!updatedAdmin) {
        return res.status(500).json(new ApiError(500, "Something went wrong while updating admin!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Admin updated successfully!")
    );
});

const uploadAdminImage = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path;
    const id = req?.body?.id;

    if (!avatarFile) {
        return res.status(400).json(new ApiError(400, "Avatar image is not provided!"));
    }

    const avatar = await uploadOnCloudinary(avatarFile, "LMS_Portal/admins/avatars");

    if (!avatar) {
        return res.status(400).json(new ApiError(400, "Failed to upload avatar image to Cloudinary!"));
    }

    const admin = await Admin.findById(id);

    if (!admin) {
        return res.status(404).json(new ApiError(404, "Admin not found!"));
    }

    const oldPublicId = admin.profileImagePublicId;

    if (oldPublicId) {
        const deleteAvatar = await deleteFromCloudinary(oldPublicId);
        if (!deleteAvatar) {
            return res.status(400).json(new ApiError(400, "Something went wrong while deleting the old image!"));
        }
    }

    await Admin.findByIdAndUpdate(id, {
        $set: {
            profileImage: avatar.secure_url,
            profileImagePublicId: avatar.public_id
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { avatarUrl: avatar.secure_url }, "Profile image uploaded successfully!")
    );
});

const deleteAdmin = asyncHandler(async (req, res) => {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);

    if (!deletedAdmin) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting admin!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Admin deleted successfully!")
    );
});

const currentAdmin = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, { admin: req?.user }, "User fetched successfully!")
    );
});

const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password, checkbox } = req.body;

    if (!email || !password || email.length === 0 || password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const admin = await Admin.findOne({ email });

    if (!admin) {
        return res.status(401).json(new ApiError(401, "Invalid credentials!"));
    }

    if (admin.status === 'Disabled') {
        return res.status(403).json(new ApiError(403, "Your access is denied!"));
    }

    const passwordValid = await admin.isPasswordCorrect(password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "Invalid credentials!"));
    }

    const { accessToken } = generateAccessToken(admin._id, checkbox);

    const loggedInAdmin = await Admin.findById(admin._id).select("-password");

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
                    loggedInAdminId: loggedInAdmin._id,
                    accessToken
                }
            }, "Login successful!")
        );
});

const registerSuperAdmin = asyncHandler(async (req, res) => {
    const admin = await Admin.create({
        fullName: process.env.SUPER_ADMIN_NAME,
        email: process.env.SUPER_ADMIN_EMAIL,
        isSuperAdmin: true,
        cnic: process.env.SUPER_ADMIN_CNIC,
        password: process.env.SUPER_ADMIN_PASSWORD
    });

    return res.status(201).json(
        new ApiResponse(201, {}, "Super admin registered successfully!")
    );
});

const logoutAdmin = asyncHandler(async (req, res) => {
    const admin = req?.user;

    if (!admin) {
        return res.status(401).json(new ApiError(401, "Unauthorized request!"));
    }

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .json(
            new ApiResponse(200, { logoutAdminId: admin._id }, "Logout successful!")
        );
});

const resetAdminPassword = asyncHandler(async (req, res) => {
    const { id } = req.body;
    const admin = await Admin.findById(id);

    if (!admin) {
        return res.status(404).json(new ApiError(404, "Admin not found!"));
    }

    admin.password = admin.cnic;
    admin.save();

    return res.status(200).json(new ApiResponse(200, "Admin password reset successfully!"));
})

const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password, retype_password } = req.body;

    if (!current_password || !new_password || !retype_password ||
        current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    if (new_password !== retype_password) {
        return res.status(400).json(new ApiError(400, "Passwords don't match!"));
    }

    const admin = await Admin.findById(req?.user?._id);

    if (!admin) {
        return res.status(404).json(new ApiError(404, "Admin not found!"));
    }

    const isPasswordCorrect = await admin.isPasswordCorrect(current_password);

    if (!isPasswordCorrect) {
        return res.status(400).json(new ApiError(400, "Current password is incorrect!"));
    }

    admin.password = new_password;
    await admin.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully!")
    );
});

// ─── Attendance Calculation Controllers ────────────────────────────────────────────────────

const calculateAttendanceByClass = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, section, shift } = req.body;

    if (!section || !shift || !degreeTitle || !semester ||
        section.length === 0 || shift.length === 0 || degreeTitle.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const current_date = Date.now();
    const timeStamps = new Date(current_date);
    const year = String(timeStamps.getFullYear());

    const classAttendance = await Attendance.aggregate([
        {
            $match: {
                degreeTitle,
                semester: Number(semester),
                section,
                shift
            }
        },
        {
            $match: {
                $expr: {
                    $eq: [
                        {
                            $dateToString: {
                                format: "%Y",
                                date: "$createdAt"
                            }
                        },
                        year
                    ]
                }
            }
        },
        {
            $group: {
                _id: {
                    collegeRollNo: "$collegeRollNo",
                    courseCode: "$courseCode"
                },

                fullName: { $first: "$fullName" },

                presentCount: {
                    $sum: {
                        $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0]
                    }
                },

                totalCount: {
                    $sum: {
                        $cond: [
                            {
                                $in: ["$attendance", ["Present", "Absent"]]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                attendancePercentage: {
                    $toInt: {
                        $multiply: [
                            {
                                $divide: [
                                    "$presentCount",
                                    "$totalCount"
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        },
        {
            $group: {
                _id: "$_id.collegeRollNo",

                fullName: { $first: "$fullName" },

                coursePercentage: {
                    $push: {
                        courseCode: "$_id.courseCode",
                        percentage: "$attendancePercentage"
                    }
                },

                totalPresent: { $sum: "$presentCount" },
                totalLectures: { $sum: "$totalCount" }
            }
        },
        {
            $addFields: {
                overallPercentage: {
                    $toInt: {
                        $multiply: [
                            {
                                $divide: [
                                    "$totalPresent",
                                    "$totalLectures"
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        },

        {
            $project: {
                _id: 0,

                collegeRollNo: "$_id",
                fullName: 1,

                coursePercentage: 1,
                overallPercentage: 1
            }
        },
        {
            $sort: { collegeRollNo: 1 }
        }
    ])

    if (!classAttendance.length) {
        return res.status(200).json(new ApiResponse(200, { attendance: [] }, "No attendance found!"))
    }

    console.log(classAttendance)

    return res.status(200).json(new ApiResponse(200, { attendance: classAttendance }, "Attendance is found!"))
})

const calculateAttendanceByStudent = asyncHandler(async (req, res) => {
    const { studentId, collegeRollNo, semester, degreeTitle } = req.body;

    if (!studentId || !collegeRollNo || !degreeTitle || !semester ||
        studentId.length === 0 || collegeRollNo.length === 0 || degreeTitle.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const student = await Student.findOne({
        studentId,
        collegeRollNo,
    })

    if (!student) {
        return res.status(404).json(new ApiError(404, "No student found!"))
    }

    const filteredAttendance = await Attendance.aggregate([
        {
            $match: {
                studentId,
                collegeRollNo,
                degreeTitle,
                semester: Number(semester)
            }
        },
        {
            $group: {
                _id: "$courseCode",

                fullName: { $first: "$fullName" },
                collegeRollNo: { $first: "$collegeRollNo" },
                studentId: { $first: "$studentId" },
                semester: { $first: "$semester" },
                degreeTitle: { $first: "$degreeTitle" },

                presentCount: {
                    $sum: {
                        $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0]
                    }
                },

                totalCount: {
                    $sum: {
                        $cond: [{ $in: ["$attendance", ["Present", "Absent"]] }, 1, 0]
                    }
                }
            }
        },
        {
            $addFields: {
                attendancePercentage: {
                    $toInt: {
                        $multiply: [
                            {
                                $divide: [
                                    "$presentCount",
                                    "$totalCount"
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        },
        {
            $group: {
                _id: "$collegeRollNo",

                fullName: { $first: "$fullName" },
                studentId: { $first: "$studentId" },
                semester: { $first: "$semester" },
                degreeTitle: { $first: "$degreeTitle" },

                coursePercentage: {
                    $push: {
                        courseCode: "$_id",
                        percentage: "$attendancePercentage",
                        presentCount: "$presentCount",
                        totalCount: "$totalCount"
                    }
                },

                totalPresentCount: {
                    $sum: "$presentCount"
                },

                totalClassCount: {
                    $sum: "$totalCount"
                }
            }
        },
        {
            $addFields: {
                overallPercentage: {
                    $toInt: {
                        $multiply: [
                            {
                                $divide: [
                                    "$totalPresentCount",
                                    "$totalClassCount"
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        },
        {
            $project: {
                _id: 0,
                collegeRollNo: "$_id",
                studentId: 1,
                fullName: 1,
                semester: 1,
                degreeTitle: 1,
                coursePercentage: 1,
                totalPresentCount: 1,
                totalClassCount: 1,
                overallPercentage: 1
            }
        }
    ])

    if (!filteredAttendance.length) {
        return res.status(200).json(new ApiResponse(200, { attendance: [] }, "No attendance found!"))
    }

    console.log(filteredAttendance)

    return res.status(200).json(new ApiResponse(200, { attendance: filteredAttendance }, "Attendance is found!"))
})

const calculateSOStudentAttendance = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, shift, section } = req.body;

    if (!section || !shift || !degreeTitle || !semester ||
        section.length === 0 || shift.length === 0 || degreeTitle.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const current_date = Date.now();
    const timeStamps = new Date(current_date);
    const year = String(timeStamps.getFullYear());

    const filteredAttendance = await Attendance.aggregate([
        {
            $match: {
                degreeTitle,
                semester: Number(semester),
                shift,
                section
            }
        },
        {
            $match: {
                $expr: {
                    $eq: [
                        {
                            $dateToString: {
                                format: "%Y",
                                date: "$createdAt"
                            }
                        },
                        year
                    ]
                }
            }
        },
        {
            $group: {
                _id: "$collegeRollNo",

                fullName: { $first: "$fullName" },

                totalPresentCount: {
                    $sum: {
                        $cond: [
                            {
                                $eq: ["$attendance", "Present"]
                            },
                            1,
                            0
                        ]
                    }
                },

                totalClassCount: {
                    $sum: {
                        $cond: [
                            {
                                $in: ["$attendance", ["Present", "Absent"]]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        {
            $addFields: {
                overallPercentage: {
                    $toInt: {
                        $multiply: [
                            {
                                $divide: [
                                    "$totalPresentCount",
                                    "$totalClassCount"
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        },
        {
            $match: {
                overallPercentage: { $lt: 50 }
            }
        },
        {
            $project: {
                _id: 0,
                collegeRollNo: "$_id",
                totalPresentCount: 1,
                totalClassCount: 1,
                overallPercentage: 1,
                fullName: 1
            }
        },
        {
            $sort: { collegeRollNo: 1 }
        }
    ])

    if (!filteredAttendance.length) {
        return res.status(200).json(new ApiResponse(200, { attendance: [] }, "Attendance not found!"))
    }

    return res.status(200).json(new ApiResponse(200, { attendance: filteredAttendance }, "Attendance is found!"))
})

const fetchStudentsForPromotion = asyncHandler(async (req, res) => {

    const { degreeTitle, semester } = req.body;

    if (!degreeTitle || !semester || degreeTitle.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const students = await Student.find({
        degreeTitle,
        semester
    }).select("_id studentId collegeRollNo fullName degreeTitle semester shift section").sort("collegeRollNo");

    if (!students.length) {
        return res.status(404).json(new ApiError(404, "No students found!"))
    }

    return res.status(200).json(new ApiResponse(200, { students: students }, "Students found successfully!"))

})

const promoteAndSaveStdAttendance = asyncHandler(async (req, res) => {
    // 1- Get a prevoios attedance records
    // 2- Save into studentHistory Field
    // 3- Increment semester by 1
    // 4- Delete previous attendance that have already saved in studentHistory
    // 5- Return a response
    const studentList = req.body;

    for (const std of studentList) {
        const filteredAttendance = await Attendance.aggregate([
            {
                $match: {
                    studentId: std.studentId,
                    collegeRollNo: std.collegeRollNo,
                    degreeTitle: std.degreeTitle,
                    semester: std.semester
                }
            },
            {
                $group: {
                    _id: "$courseCode",

                    fullName: { $first: "$fullName" },
                    collegeRollNo: { $first: "$collegeRollNo" },
                    studentId: { $first: "$studentId" },
                    semester: { $first: "$semester" },
                    degreeTitle: { $first: "$degreeTitle" },

                    presentCount: {
                        $sum: {
                            $cond: [{ $eq: ["$attendance", "Present"] }, 1, 0]
                        }
                    },

                    totalCount: {
                        $sum: {
                            $cond: [{ $in: ["$attendance", ["Present", "Absent"]] }, 1, 0]
                        }
                    }
                }
            },
            {
                $addFields: {
                    attendancePercentage: {
                        $toInt: {
                            $multiply: [
                                {
                                    $divide: [
                                        "$presentCount",
                                        "$totalCount"
                                    ]
                                },
                                100
                            ]
                        }
                    }
                }
            },
            {
                $group: {
                    _id: "$collegeRollNo",

                    fullName: { $first: "$fullName" },
                    studentId: { $first: "$studentId" },
                    semester: { $first: "$semester" },
                    degreeTitle: { $first: "$degreeTitle" },

                    coursePercentage: {
                        $push: {
                            courseCode: "$_id",
                            percentage: "$attendancePercentage",
                            presentCount: "$presentCount",
                            totalCount: "$totalCount"
                        }
                    },

                    totalPresentCount: {
                        $sum: "$presentCount"
                    },

                    totalClassCount: {
                        $sum: "$totalCount"
                    }
                }
            },
            {
                $addFields: {
                    overallPercentage: {
                        $toInt: {
                            $multiply: [
                                {
                                    $divide: [
                                        "$totalPresentCount",
                                        "$totalClassCount"
                                    ]
                                },
                                100
                            ]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    semester: 1,
                    coursePercentage: 1,
                    totalPresentCount: 1,
                    totalClassCount: 1,
                    overallPercentage: 1
                }
            }
        ])
        console.log(filteredAttendance)

        const student = await Student.findByIdAndUpdate(
            std._id,
            {
                $push: {
                    studentHistory: {
                        $each: filteredAttendance
                    }
                },
                $inc: {
                    semester: 1
                }
            },
            {
                new: true
            }
        );

        const deletePreAttendance = await Attendance.deleteMany({
            studentId: std.studentId,
            collegeRollNo: std.collegeRollNo,
            degreeTitle: std.degreeTitle,
            semester: std.semester
        })
        console.log(deletePreAttendance)
    }
    return res.status(200).json(new ApiResponse(200, "Students promoted successfully!"))
})

export {
    getStudent,
    deleteStudent,
    updateStudent,
    registerStudent,
    getTeacher,
    deleteTeacher,
    updateTeacher,
    registerTeacher,
    loginAdmin,
    currentAdmin,
    logoutAdmin,
    registerSuperAdmin,
    registerAdmin,
    getAdmin,
    deleteAdmin,
    updateAdmin,
    resetStudentPassword,
    resetTeacherPassword,
    resetAdminPassword,
    uploadAdminImage,
    changePassword,
    calculateAttendanceByClass,
    calculateAttendanceByStudent,
    calculateSOStudentAttendance,
    fetchStudentsForPromotion,
    promoteAndSaveStdAttendance
};