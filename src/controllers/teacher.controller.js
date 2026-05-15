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
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const teacher = await Teacher.findOne({ teacherId });

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "Teacher not found!"));
    }

    if (teacher.status === 'Disabled') {
        return res.status(403).json(new ApiError(403, "Your access is denied!"));
    }

    const passwordValid = await teacher.isPasswordCorrect(password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "Invalid user credentials!"));
    }

    const { accessToken } = await generateAccessToken(teacher._id, checkbox);

    const loggedInTeacher = await Teacher.findById(teacher._id).select("-password");

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
                    loggedInTeacherId: loggedInTeacher._id,
                    accessToken
                }
            }, "Successfully logged in!")
        );
});

const logoutTeacher = asyncHandler(async (req, res) => {
    const teacher = req?.user;

    if (!teacher) {
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
            new ApiResponse(200, { logoutTeacherId: teacher._id }, "Logout successfully!")
        );
});

const currentTeacher = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, { teacher: req?.user }, "User fetched successfully!")
        );
});

const uploadTeacherImage = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path;
    const id = req?.body?.id;

    if (!avatarFile) {
        return res.status(400).json(new ApiError(400, "Avatar image is not provided!"));
    }

    const avatar = await uploadOnCloudinary(avatarFile, "LMS_Portal/teachers/avatars");

    if (!avatar) {
        return res.status(400).json(new ApiError(400, "Failed to upload avatar image to Cloudinary!"));
    }

    const teacher = await Teacher.findById(id);

    if (!teacher) {
        return res.status(404).json(new ApiError(404, "Teacher not found!"));
    }

    const oldPublicId = teacher.profileImagePublicId;

    if (oldPublicId) {
        const deleteAvatar = await deleteFromCloudinary(oldPublicId);
        if (!deleteAvatar) {
            return res.status(400).json(new ApiError(400, "Something went wrong while deleting the old image!"));
        }
    }

    await Teacher.findByIdAndUpdate(id, {
        $set: {
            profileImage: avatar.secure_url,
            profileImagePublicId: avatar.public_id
        }
    });

    return res.status(200).json(
        new ApiResponse(200, { avatarUrl: avatar.secure_url }, "Profile image uploaded successfully!")
    );
});

const getTeacherLectures = asyncHandler(async (req, res) => {
    const teacher = req?.user;

    if (!teacher) {
        return res.status(401).json(new ApiError(401, "Unauthorized request!"));
    }

    const lectures = await Lecture.find({ teacherId: teacher.teacherId });

    if (!lectures.length) {
        return res.status(404).json(new ApiError(404, "No lectures found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { lectures }, "Lectures fetched successfully!")
    );
});

const getLectureEnrolledStudents = asyncHandler(async (req, res) => {
    const { degree, section, shift, semester } = req.query;

    if (!degree || !section || !shift || !semester ||
        degree.length === 0 || section.length === 0 || shift.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
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
        return res.status(404).json(new ApiError(404, "No students found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { students: lectureStudents }, "Students fetched successfully!")
    );
});

const submitAttendance = asyncHandler(async (req, res) => {
    const studentAtdList = req.body;

    if (!studentAtdList || !Array.isArray(studentAtdList) || studentAtdList.length === 0) {
        return res.status(400).json(new ApiError(400, "Attendance submission failed — no data provided!"));
    }

    const attendance = await Attendance.insertMany(studentAtdList);

    if (!attendance) {
        return res.status(500).json(new ApiError(500, "Something went wrong while saving attendance!"));
    }

    return res.status(201).json(
        new ApiResponse(201, {}, "Student attendance uploaded successfully!")
    );
});

// This method returns date and time with group of student attendance
const getAttendance = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, courseCode, shift, section } = req.query;

    if (!degreeTitle || !semester || !courseCode || !shift || !section) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const lectureAttendance = await Attendance.find({
        degreeTitle,
        semester,
        courseCode,
        shift,
        section,
    }).distinct("lectureAttendanceId");

    if (!lectureAttendance.length) {
        return res.status(200).json(
            new ApiResponse(200, { attendance: [] }, "No attendance found.")
        );
    }

    const finalAttendance = await Promise.all(
        lectureAttendance.map(async (la) => {
            const records = await Attendance.find({
                degreeTitle,
                semester,
                courseCode,
                shift,
                section,
                lectureAttendanceId: la
            });

            const itemTimestamp = new Date(records[0].createdAt);
            const year = itemTimestamp.getFullYear();
            const month = itemTimestamp.getMonth() + 1;
            const date = itemTimestamp.getDate();

            const time = new Date(records[0].createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            let presentCount = 0;
            records.forEach((a) => {
                if (a.attendance === "Present") presentCount++;
            });

            return {
                Attendance: `${presentCount}/${records.length}`,
                date: `${month}/${date}/${year}`,
                time,
                lectureAttendanceId: la
            };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, { attendance: finalAttendance }, "Attendance fetched successfully!")
    );
});

// This method gets the list of students for update using mostly date and time
const getStudentAttendance = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, shift, section, courseCode, lectureAttendanceId } = req.query;

    if (!degreeTitle || !semester || !shift || !section || !courseCode || !lectureAttendanceId) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
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
        return res.status(404).json(new ApiError(404, "No attendance records found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { attendance: attendanceRecords }, "Attendance fetched successfully!")
    );
});

// This method actually updates attendance of a group of students
const updateStudentAttendance = asyncHandler(async (req, res) => {
    const studentsData = req.body;

    if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
        return res.status(400).json(new ApiError(400, "No student data provided!"));
    }

    const lectureAttendanceId = studentsData[0].lectureAttendanceId;

    if (!lectureAttendanceId) {
        return res.status(400).json(new ApiError(400, "lectureAttendanceId is missing!"));
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
            {
                $set: {
                    attendance: student.attendance
                }
            }
        );
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Attendance updated successfully!")
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
    uploadTeacherImage
};


// import { asyncHandler } from '../utils/asyncHandler.js'
// import { Teacher } from '../models/teacher.model.js'
// import { Student } from '../models/student.model.js'
// import { Lecture } from '../models/lecture.model.js'
// import { Attendance } from '../models/attendance.model.js'
// import { ApiResponse } from '../utils/ApiResponse.js';
// import { ApiError } from '../utils/ApiError.js';

// const generateAccessToken = async (userId, expiry_date_check) => {
//     const teacher = await Teacher.findById(userId);
//     const accessToken = await teacher.generateAccessToken(expiry_date_check);
//     return { accessToken };
// };

// const loginTeacher = asyncHandler(async (req, res) => {
//     const { teacherId, password, checkbox } = req.body;

//     if (!teacherId || teacherId.length === 0 || !password || password.length === 0) {
//         throw new ApiError(400, "All fields are required");
//     }

//     const teacher = await Teacher.findOne({ teacherId });

//     if (!teacher) {
//         throw new ApiError(404, "Teacher not found");
//     }

//     if (teacher.status === 'Disabled') {
//         throw new ApiError(403, "Your access is denied!");
//     }

//     const passwordValid = await teacher.isPasswordCorrect(password);

//     if (!passwordValid) {
//         throw new ApiError(401, "Invalid user credentials");
//     }

//     const { accessToken } = await generateAccessToken(teacher._id, checkbox);

//     const loggedInTeacher = await Teacher.findById(teacher._id).select("-password");

//     const options = {
//         httpOnly: true,
//         secure: true
//     };

//     return res
//         .status(200)
//         .cookie("accessToken", accessToken, options)
//         .json(
//             new ApiResponse(200, {
//                 user: {
//                     loggedInTeacherId: loggedInTeacher._id,
//                     accessToken
//                 }
//             }, "Successfully logged in!")
//         );
// });

// const logoutTeacher = asyncHandler(async (req, res) => {
//     const teacher = req?.user;

//     if (!teacher) {
//         throw new ApiError(401, "Unauthorized request");
//     }

//     const options = {
//         httpOnly: true,
//         secure: true
//     };

//     return res
//         .status(200)
//         .clearCookie("accessToken", options)
//         .json(
//             new ApiResponse(200, { logoutTeacherId: teacher._id }, "Logout successfully!")
//         );
// });

// const currentTeacher = asyncHandler(async (req, res) => {
//     return res
//         .status(200)
//         .json(
//             new ApiResponse(200, { teacher: req?.user }, "User fetched successfully!")
//         );
// });

// const getTeacherLectures = asyncHandler(async (req, res) => {
//     const teacher = req?.user;

//     if (!teacher) {
//         throw new ApiError(401, "Unauthorized request");
//     }

//     const lectures = await Lecture.find({ teacherId: teacher.teacherId });

//     if (!lectures.length) {
//         return res.status(404).json(
//             new ApiResponse(404, { lectures: [] }, "No lectures found!")
//         );
//     }

//     return res.status(200).json(
//         new ApiResponse(200, { lectures }, "Lectures fetched successfully!")
//     );
// });

// const getLectureEnrolledStudents = asyncHandler(async (req, res) => {
//     const { degree, section, shift, semester } = req.query;

//     if (!degree || !section || !shift || !semester ||
//         degree.length === 0 || section.length === 0 || shift.length === 0 || semester.length === 0) {
//         throw new ApiError(400, "All fields are required!");
//     }

//     const lectureStudents = await Student.find({
//         $and: [
//             { degreeTitle: degree },
//             { section },
//             { shift },
//             { semester }
//         ]
//     }).select('-password -cnic');

//     // Bug Fix 8: Student.find() never returns null, returns [] — must check .length
//     // Bug Fix 9: Was returning success: true on a "no record" response (wrong flag)
//     if (!lectureStudents.length) {
//         return res.status(404).json(
//             new ApiResponse(404, { students: [] }, "No students found!")
//         );
//     }

//     return res.status(200).json(
//         new ApiResponse(200, { students: lectureStudents }, "Students fetched successfully!")
//     );
// });

// const submitAttendance = asyncHandler(async (req, res) => {
//     const studentAtdList = req.body;

//     if (!studentAtdList || !Array.isArray(studentAtdList) || studentAtdList.length === 0) {
//         throw new ApiError(400, "Attendance submission failed — no data provided!");
//     }

//     const attendance = await Attendance.insertMany(studentAtdList);

//     if (!attendance) {
//         throw new ApiError(500, "Something went wrong while saving attendance!");
//     }

//     return res.status(201).json(
//         new ApiResponse(201, {}, "Student attendance uploaded successfully!")
//     );
// });

// // This method returns date and time with group of student attendance
// const getAttendance = asyncHandler(async (req, res) => {
//     const { degreeTitle, semester, courseCode, shift, section } = req.query;

//     if (!degreeTitle || !semester || !courseCode || !shift || !section) {
//         throw new ApiError(400, "All fields are required!");
//     }

//     const lectureAttendance = await Attendance.find({
//         degreeTitle,
//         semester,
//         courseCode,
//         shift,
//         section,
//     }).distinct("lectureAttendanceId");

//     if (!lectureAttendance.length) {
//         return res.status(200).json(
//             new ApiResponse(200, { attendance: [] }, "No attendance found.")
//         );
//     }

//     const finalAttendance = await Promise.all(
//         lectureAttendance.map(async (la) => {
//             const records = await Attendance.find({
//                 degreeTitle,
//                 semester,
//                 courseCode,
//                 shift,
//                 section,
//                 lectureAttendanceId: la
//             });

//             const itemTimestamp = new Date(records[0].createdAt);
//             const year = itemTimestamp.getFullYear();
//             const month = itemTimestamp.getMonth() + 1;
//             const date = itemTimestamp.getDate();

//             const time = new Date(records[0].createdAt).toLocaleTimeString('en-US', {
//                 hour: '2-digit',
//                 minute: '2-digit',
//                 second: '2-digit'
//             });

//             let presentCount = 0;
//             records.forEach((a) => {
//                 if (a.attendance === "Present") presentCount++;
//             });

//             return {
//                 Attendance: `${presentCount}/${records.length}`,
//                 date: `${month}/${date}/${year}`,
//                 time,
//                 lectureAttendanceId: la
//             };
//         })
//     );

//     return res.status(200).json(
//         new ApiResponse(200, { attendance: finalAttendance }, "Attendance fetched successfully!")
//     );
// });

// // This method gets the list of students for update using mostly date and time
// const getStudentAttendance = asyncHandler(async (req, res) => {
//     const { degreeTitle, semester, shift, section, courseCode, lectureAttendanceId } = req.query;

//     if (!degreeTitle || !semester || !shift || !section || !courseCode || !lectureAttendanceId) {
//         throw new ApiError(400, "All fields are required!");
//     }

//     const attendanceRecords = await Attendance.find({
//         degreeTitle,
//         semester,
//         shift,
//         section,
//         courseCode,
//         lectureAttendanceId
//     });

//     if (!attendanceRecords.length) {
//         return res.status(404).json(
//             new ApiResponse(404, { attendance: [] }, "No students found!")
//         );
//     }

//     return res.status(200).json(
//         new ApiResponse(200, { attendance: attendanceRecords }, "Attendance fetched successfully!")
//     );
// });

// // This method actually updates attendance of a group of students
// const updateStudentAttendance = asyncHandler(async (req, res) => {
//     const studentsData = req.body;

//     if (!studentsData || !Array.isArray(studentsData) || studentsData.length === 0) {
//         throw new ApiError(400, "No student data provided!");
//     }

//     const lectureAttendanceId = studentsData[0].lectureAttendanceId;

//     if (!lectureAttendanceId) {
//         throw new ApiError(400, "lectureAttendanceId is missing!");
//     }

//     for (const student of studentsData) {
//         await Attendance.updateOne(
//             {
//                 degreeTitle: student.degreeTitle,
//                 courseCode: student.courseCode,
//                 semester: student.semester,
//                 shift: student.shift,
//                 section: student.section,
//                 lectureAttendanceId,
//                 studentId: student.studentId
//             },
//             {
//                 $set: {
//                     attendance: student.attendance
//                 }
//             }
//         );
//     }

//     return res.status(200).json(
//         new ApiResponse(200, {}, "Attendance updated successfully!")
//     );
// });

// export {
//     loginTeacher,
//     logoutTeacher,
//     currentTeacher,
//     getTeacherLectures,
//     getLectureEnrolledStudents,
//     submitAttendance,
//     getAttendance,
//     getStudentAttendance,
//     updateStudentAttendance
// };


// import { asyncHandler } from '../utils/asyncHandler.js'
// import { Teacher } from '../models/teacher.model.js'
// import { Student } from '../models/student.model.js'
// import { Lecture } from '../models/lecture.model.js'
// import { Attendance } from '../models/attendance.model.js'

// const generateAccessToken = async (userId, expiry_date_check) => {

//     const teacher = await Teacher.findById(userId);

//     const accessToken = await teacher.generateAccessToken(expiry_date_check);

//     return { accessToken }
// }

// const loginTeacher = asyncHandler(async (req, res) => {

//     const { teacherId, password, checkbox } = req.body;

//     if (teacherId.length === 0 || password.length === 0) {
//         return res.status(400).json({
//             success: false,
//             error: true,
//             message: "All fields is required"
//         })
//     }

//     const teacher = await Teacher.findOne({
//         teacherId: teacherId
//     })

//     if (!teacher) {
//         return res.status(404).json({
//             success: false,
//             error: true,
//             message: "Teacher is not found"
//         })
//     }

//     const passwordValid = await teacher.isPasswordCorrect(password);

//     if (!passwordValid) {
//         res.status(401).json({
//             success: true,
//             error: false,
//             message: "Invalid user credentials"
//         })
//     }

//     if (teacher.status == 'Disabled') {
//         return res.status(400).json({
//             success: false,
//             error: true,
//             message: "Your access is denied!"
//         })
//     }

//     const { accessToken } = await generateAccessToken(teacher._id, checkbox);

//     const loggedInTeacher = await Teacher.findById(teacher._id).select("-password")

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//         .cookie("accessToken", accessToken, options)
//         .json({
//             user: {
//                 loggedInTeacherId: loggedInTeacher._id,
//                 accessToken
//             },
//             message: "Successfully login!",
//             success: true
//         })
// })

// const logoutTeacher = asyncHandler(async (req, res) => {

//     const teacher = req?.user;

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//         .clearCookie("accessToken", options)
//         .json({
//             success: true,
//             error: false,
//             logoutTeacherId: teacher._id,
//             message: "Logout Successfully!"
//         })

// })

// const currentTeacher = asyncHandler(async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         error: false,
//         message: "User fetched successfully!",
//         teacher: req?.user
//     })
// })

// const getTeacherLectures = asyncHandler(async (req, res) => {

//     const teacher = req?.user;

//     const lectures = await Lecture.find({
//         teacherId: teacher.teacherId
//     })

//     if (!lectures) {
//         return res.status(404).json({
//             success: false,
//             message: "No record!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Records found successfully!",
//         lectures
//     })

// })

// const getLectureEnrolledStudents = asyncHandler(async (req, res) => {

//     const { degree, section, shift, semester } = req.query;

//     if (degree.length === 0 || section.length === 0 || shift.length === 0 || semester.length === 0) {
//         return res.status(401).json({
//             success: false,
//             message: "Field is not found!"
//         })
//     }

//     const lectureStudents = await Student.find({
//         $and: [
//             { degreeTitle: degree },
//             { section: section },
//             { shift: shift },
//             { semester: semester },
//         ]
//     }).select('-password -cnic')

//     if (!lectureStudents) return res.status(400).json({ success: true, message: "No record found!" });

//     return res.status(200).json({
//         success: true,
//         message: "Successfully record found!",
//         students: lectureStudents
//     })

// })

// const submitAttendance = asyncHandler(async (req, res) => {

//     const studentAtdList = req.body;

//     if (!studentAtdList) {
//         return res.status(400).json({
//             success: false,
//             message: "Attendance Submittion Failed!"
//         })
//     }

//     const attendance = await Attendance.insertMany(studentAtdList);

//     if (!attendance) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(201).json({
//         success: true,
//         message: "Student Attendance Uploaded!"
//     })

// })

// // This method return date and time with group of student attendance
// const getAttendance = asyncHandler(async (req, res) => {
//     const { degreeTitle, semester, courseCode, shift, section } = req.query;

//     const lectureAttendance = await Attendance.find({
//         degreeTitle,
//         semester,
//         courseCode,
//         shift,
//         section,
//     }).distinct("lectureAttendanceId");

//     if (!lectureAttendance.length) {
//         return res.status(200).json({
//             success: false,
//             message: "No Attendance found",
//             attendance: []
//         });
//     }

//     const finalAttendance = await Promise.all(
//         lectureAttendance.map(async (la) => {
//             const records = await Attendance.find({
//                 degreeTitle,
//                 semester,
//                 courseCode,
//                 shift,
//                 section,
//                 lectureAttendanceId: la
//             });
//             const itemTimestamp = new Date(records[0].createdAt);
//             const year = itemTimestamp.getFullYear();
//             const month = itemTimestamp.getMonth() + 1;
//             const date = itemTimestamp.getDate();

//             const time = new Date(records[0].createdAt).toLocaleTimeString('en-US', {
//                 hour: '2-digit',
//                 minute: '2-digit',
//                 second: '2-digit'
//             });

//             let presentCount = 0;

//             records.forEach((a) => {
//                 if (a.attendance === "Present") presentCount++;
//             });

//             return {
//                 Attendance: `${presentCount}/${records.length}`,
//                 date: `${month}/${date}/${year}`,
//                 time: time,
//                 lectureAttendanceId: la
//             };

//         }))

//     return res.status(200).json({
//         success: true,
//         message: "Attendance found",
//         attendance: finalAttendance
//     });
// });

// // This method gets the list of students for update using mostly date and time
// const getStudentAttendance = asyncHandler(async (req, res) => {
//     const { degreeTitle, semester, shift, section, courseCode, lectureAttendanceId } = req.query;

//     const attendanceRecords = await Attendance.find({
//         degreeTitle,
//         semester,
//         shift,
//         section,
//         courseCode,
//         lectureAttendanceId
//     });

//     if (!attendanceRecords) {
//         return res.status(404).json({
//             success: false,
//             message: "No Students Found"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Attendance fetched",
//         attendance: attendanceRecords
//     });
// });

// // This method actual update attendance of group of students
// const updateStudentAttendance = asyncHandler(async (req, res) => {
//     const studentsData = req.body;
//     const lectureAttendanceId = studentsData[0].lectureAttendanceId;

//     for (const student of studentsData) {
//         await Attendance.updateOne(
//             {
//                 degreeTitle: student.degreeTitle,
//                 courseCode: student.courseCode,
//                 semester: student.semester,
//                 shift: student.shift,
//                 section: student.section,
//                 lectureAttendanceId: lectureAttendanceId,
//                 studentId: student.studentId
//             },
//             {
//                 $set: {
//                     attendance: student.attendance
//                 }
//             }
//         );
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Attendance Updated Successfully!"
//     });
// });


// export {
//     loginTeacher,
//     logoutTeacher,
//     currentTeacher,
//     getTeacherLectures,
//     getLectureEnrolledStudents,
//     submitAttendance,
//     getAttendance,
//     getStudentAttendance,
//     updateStudentAttendance
// }