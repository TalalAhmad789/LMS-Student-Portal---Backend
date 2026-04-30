import { asyncHandler } from '../utils/asyncHandler.js'
import { Student } from '../models/student.model.js';
import { Attendance } from '../models/attendance.model.js';
import { Course } from '../models/course.model.js';
import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

const generateAccessToken = async (userId, expiry_date_check) => {
    const student = await Student.findById(userId);
    const accessToken = await student.generateAccessToken(expiry_date_check);
    return { accessToken };
};

const loginStudent = asyncHandler(async (req, res) => {
    const { studentId, password, checkbox } = req.body;

    if (!studentId || studentId.length === 0 || !password || password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const student = await Student.findOne({ studentId });

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student not found!"));
    }

    if (student.status === 'Disabled') {
        return res.status(403).json(new ApiError(403, "Your access is denied!"));
    }

    const passwordValid = await student.isPasswordCorrect(password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "Invalid user credentials!"));
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
            }, "Successfully logged in!")
        );
});

const logoutStudent = asyncHandler(async (req, res) => {
    const student = req?.user;

    if (!student) {
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
            new ApiResponse(200, { logoutStudentId: student._id }, "Logout successfully!")
        );
});

const currentStudent = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(200, { student: req?.user }, "User fetched successfully!")
        );
});

const calculateCourseAttendance = asyncHandler(async (req, res) => {
    const { studentId, collegeRollNo, semester, degreeTitle } = req.body;

    if (!studentId || !collegeRollNo || !semester || !degreeTitle) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const attendance = await Attendance.find({
        $and: [{ studentId }, { collegeRollNo }, { semester }, { degreeTitle }]
    });

    const course = await Course.find({
        $and: [{ degreeTitle }, { semester }]
    });

    if (!course.length) {
        return res.status(200).json(
            new ApiResponse(200, {
                courseAttendance: [],
                overAllAttendance: {
                    classConducted: "0/0",
                    totalClassConducted: "0",
                    percentage: 0
                }
            }, "No course found.")
        );
    }

    if (!attendance.length) {
        return res.status(200).json(
            new ApiResponse(200, {
                courseAttendance: course.map((item) => ({
                    courseName: item.courseName,
                    courseCode: item.courseCode,
                    percentage: 0,
                    classConducted: "0/0"
                })),
                overAllAttendance: {
                    classConducted: "0/0",
                    totalClassConducted: "0",
                    percentage: 0
                }
            }, "No attendance marked yet.")
        );
    }

    const courseAttendance = course.map((course) => {
        const filterAttendance = attendance.filter(
            (a) => a.courseCode === course.courseCode
        );

        let presentCount = 0;
        let absentCount = 0;

        filterAttendance.forEach((item) => {
            if (item.attendance === "Present") presentCount++;
            else if (item.attendance === "Absent") absentCount++;
        });

        const leaveCount = filterAttendance.length - (presentCount + absentCount);
        const totalCount = filterAttendance.length - leaveCount;
        const percentage = parseInt((presentCount / totalCount) * 100);

        return {
            courseName: course.courseName,
            courseCode: course.courseCode,
            percentage: isNaN(percentage) ? 0 : percentage,
            classConducted: `${presentCount}/${totalCount}`
        };
    });

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
        new ApiResponse(200, { courseAttendance, overAllAttendance }, "Attendance calculated successfully!")
    );
});

const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password, retype_password } = req.body;

    if (!current_password || !new_password || !retype_password ||
        current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    if (new_password !== retype_password) {
        return res.status(400).json(new ApiError(400, "Passwords don't match!"));
    }

    const student = await Student.findById(req?.user?._id);

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student not found!"));
    }

    const isPasswordCorrect = await student.isPasswordCorrect(current_password);

    if (!isPasswordCorrect) {
        return res.status(400).json(new ApiError(400, "Current password is incorrect!"));
    }

    student.password = new_password;
    await student.save();

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully!")
    );
});

const uploadStudentImage = asyncHandler(async (req, res) => {
    const avatarFile = req.file?.path;
    const student_id = req?.body?.id;

    if (!avatarFile) {
        return res.status(400).json(new ApiError(400, "Avatar image is not provided!"));
    }

    const avatar = await uploadOnCloudinary(avatarFile);

    if (!avatar) {
        return res.status(400).json(new ApiError(400, "Failed to upload avatar image to Cloudinary!"));
    }

    const student = await Student.findById(student_id);

    if (!student) {
        return res.status(404).json(new ApiError(404, "Student not found!"));
    }

    const oldPublicId = student.profileImagePublicId;

    if (oldPublicId) {
        const deleteAvatar = await deleteFromCloudinary(oldPublicId);
        if (!deleteAvatar) {
            return res.status(400).json(new ApiError(400, "Something went wrong while deleting the old image!"));
        }
    }

    await Student.findByIdAndUpdate(student_id, {
        $set: {
            profileImage: avatar.secure_url,
            profileImagePublicId: avatar.public_id
        }
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Profile image uploaded successfully!")
    );
});

export {
    logoutStudent,
    loginStudent,
    currentStudent,
    changePassword,
    uploadStudentImage,
    calculateCourseAttendance
};









// import { asyncHandler } from '../utils/asyncHandler.js'
// import { Student } from '../models/student.model.js';
// import { Attendance } from '../models/attendance.model.js';
// import { Course } from '../models/course.model.js';
// import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'
// import { ApiError } from '../utils/ApiError.js';
// import { ApiResponse } from '../utils/ApiResponse.js';

// const generateAccessToken = async (userId, expiry_date_check) => {
//     const student = await Student.findById(userId);
//     const accessToken = await student.generateAccessToken(expiry_date_check);
//     return { accessToken };
// };

// const loginStudent = asyncHandler(async (req, res) => {
//     const { studentId, password, checkbox } = req.body;

//     if (!studentId || studentId.length === 0 || !password || password.length === 0) {
//         throw new ApiError(400, "All fields are required");
//     }

//     const student = await Student.findOne({ studentId });

//     if (!student) {
//         throw new ApiError(404, "Student not found");
//     }

//     if (student.status === 'Disabled') {
//         throw new ApiError(403, "Your access is denied!");
//     }

//     const passwordValid = await student.isPasswordCorrect(password);

//     if (!passwordValid) {
//         throw new ApiError(401, "Invalid user credentials");
//     }

//     const { accessToken } = await generateAccessToken(student._id, checkbox);

//     const loggedInStudent = await Student.findById(student._id).select("-password");

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
//                     loggedInStudentId: loggedInStudent._id,
//                     accessToken
//                 }
//             }, "Successfully logged in!")
//         );
// });

// const logoutStudent = asyncHandler(async (req, res) => {
//     const student = req?.user;

//     if (!student) {
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
//             new ApiResponse(200, { logoutStudentId: student._id }, "Logout successfully!")
//         );
// });

// const currentStudent = asyncHandler(async (req, res) => {
//     return res
//         .status(200)
//         .json(
//             new ApiResponse(200, { student: req?.user }, "User fetched successfully!")
//         );
// });

// const calculateCourseAttendance = asyncHandler(async (req, res) => {
//     const { studentId, collegeRollNo, semester, degreeTitle } = req.body;

//     if (!studentId || !collegeRollNo || !semester || !degreeTitle) {
//         throw new ApiError(400, "All fields are required!");
//     }

//     const attendance = await Attendance.find({
//         $and: [{ studentId }, { collegeRollNo }, { semester }, { degreeTitle }]
//     });

//     const course = await Course.find({
//         $and: [{ degreeTitle }, { semester }]
//     });

//     if (!course.length) {
//         return res.status(200).json(
//             new ApiResponse(200, {
//                 courseAttendance: [],
//                 overAllAttendance: {
//                     classConducted: "0/0",
//                     totalClassConducted: "0",
//                     percentage: 0
//                 }
//             }, "No course found.")
//         );
//     }

//     if (!attendance.length) {
//         return res.status(200).json(
//             new ApiResponse(200, {
//                 courseAttendance: course.map((item) => ({
//                     courseName: item.courseName,
//                     courseCode: item.courseCode,
//                     percentage: 0,
//                     classConducted: "0/0"
//                 })),
//                 overAllAttendance: {
//                     classConducted: "0/0",
//                     totalClassConducted: "0",
//                     percentage: 0
//                 }
//             }, "No attendance marked yet.")
//         );
//     }

//     const courseAttendance = course.map((course) => {
//         const filterAttendance = attendance.filter(
//             (a) => a.courseCode === course.courseCode
//         );

//         let presentCount = 0;
//         let absentCount = 0;

//         filterAttendance.forEach((item) => {
//             if (item.attendance === "Present") presentCount++;
//             else if (item.attendance === "Absent") absentCount++;
//         });

//         const leaveCount = filterAttendance.length - (presentCount + absentCount);
//         const totalCount = filterAttendance.length - leaveCount;
//         const percentage = parseInt((presentCount / totalCount) * 100);

//         return {
//             courseName: course.courseName,
//             courseCode: course.courseCode,
//             percentage: isNaN(percentage) ? 0 : percentage,
//             classConducted: `${presentCount}/${totalCount}`
//         };
//     });

//     const classC = courseAttendance.reduce(
//         (sum, item) => sum + parseInt(item.classConducted.split("/")[0]),
//         0
//     );
//     const totalC = courseAttendance.reduce(
//         (sum, item) => sum + parseInt(item.classConducted.split("/")[1]),
//         0
//     );

//     const totalPercentage = parseInt((classC / totalC) * 100);

//     const overAllAttendance = {
//         classConducted: `${classC}/${totalC}`,
//         totalClassConducted: `${totalC}`,
//         percentage: isNaN(totalPercentage) ? 0 : totalPercentage
//     };

//     return res.status(200).json(
//         new ApiResponse(200, { courseAttendance, overAllAttendance }, "Attendance calculated successfully!")
//     );
// });

// const changePassword = asyncHandler(async (req, res) => {
//     const { current_password, new_password, retype_password } = req.body;

//     if (!current_password || !new_password || !retype_password ||
//         current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
//         throw new ApiError(400, "All fields are required!");
//     }

//     if (new_password !== retype_password) {
//         throw new ApiError(400, "Passwords don't match!");
//     }

//     const student = await Student.findById(req?.user?._id);

//     if (!student) {
//         throw new ApiError(404, "Student not found");
//     }

//     const isPasswordCorrect = await student.isPasswordCorrect(current_password);

//     if (!isPasswordCorrect) {
//         throw new ApiError(400, "Current password is incorrect!");
//     }

//     student.password = new_password;
//     await student.save();

//     return res.status(200).json(
//         new ApiResponse(200, {}, "Password changed successfully!")
//     );
// });

// const uploadStudentImage = asyncHandler(async (req, res) => {
//     const avatarFile = req.file?.path;
//     const student_id = req?.body?.id;

//     if (!avatarFile) {
//         throw new ApiError(400, "Avatar image is not provided!");
//     }

//     const avatar = await uploadOnCloudinary(avatarFile);

//     if (!avatar) {
//         throw new ApiError(400, "Failed to upload avatar image to Cloudinary!");
//     }

//     const student = await Student.findById(student_id);

//     if (!student) {
//         throw new ApiError(404, "Student not found");
//     }

//     const oldPublicId = student.profileImagePublicId;

//     if (oldPublicId) {
//         const deleteAvatar = await deleteFromCloudinary(oldPublicId);
//         if (!deleteAvatar) {
//             throw new ApiError(400, "Something went wrong while deleting the old image!");
//         }
//     }

//     await Student.findByIdAndUpdate(student_id, {
//         $set: {
//             profileImage: avatar.secure_url,
//             profileImagePublicId: avatar.public_id
//         }
//     });

//     return res.status(200).json(
//         new ApiResponse(200, {}, "Profile image uploaded successfully!")
//     );
// });

// export {
//     logoutStudent,
//     loginStudent,
//     currentStudent,
//     changePassword,
//     uploadStudentImage,
//     calculateCourseAttendance
// };




// import { asyncHandler } from '../utils/asyncHandler.js'
// import { Student } from '../models/student.model.js';
// import { Attendance } from '../models/attendance.model.js';
// import { Course } from '../models/course.model.js';
// import { uploadOnCloudinary, deleteFromCloudinary } from '../utils/cloudinary.js'

// const generateAccessToken = async (userId, expiry_date_check) => {

//     const student = await Student.findById(userId);

//     const accessToken = await student.generateAccessToken(expiry_date_check);

//     return { accessToken }
// }

// const loginStudent = asyncHandler(async (req, res) => {

//     const { studentId, password, checkbox } = req.body;

//     if (studentId.length === 0 && password.length === 0) {
//         return res.status(400).json({
//             success: false,
//             error: true,
//             message: "All fields is required"
//         })
//     }

//     const student = await Student.findOne({
//         studentId: studentId
//     })

//     if (!student) {
//         return res.status(404).json({
//             success: false,
//             error: true,
//             message: "Student is not found"
//         })
//     }

//     const passwordValid = await student.isPasswordCorrect(password);

//     if (!passwordValid) {
//         return res.status(401).json({
//             success: true,
//             error: false,
//             message: "Invalid user credentials"
//         })
//     }

//     if (student.status == 'Disabled') {
//         return res.status(400).json({
//             success: false,
//             error: true,
//             message: "Your access is denied!"
//         })
//     }

//     const { accessToken } = await generateAccessToken(student._id, checkbox);

//     const loggedInStudent = await Student.findById(student._id).select("-password")

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//         .cookie("accessToken", accessToken, options)
//         .json({
//             user: {
//                 loggedInStudentId: loggedInStudent._id,
//                 accessToken
//             },
//             message: "Successfully login!",
//             success: true
//         })
// })

// const logoutStudent = asyncHandler(async (req, res) => {

//     const student = req?.user;

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//         .clearCookie("accessToken", options)
//         .json({
//             success: true,
//             error: false,
//             logoutStudentId: student._id,
//             message: "Logout Successfully!"
//         })

// })

// const currentStudent = asyncHandler(async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         error: false,
//         message: "User fetched successfully!",
//         student: req?.user
//     })
// })

// const calculateCourseAttendance = asyncHandler(async (req, res) => {
//     const { studentId, collegeRollNo, semester, degreeTitle } = req.body;

//     const attendance = await Attendance.find({
//         $and: [
//             { studentId },
//             { collegeRollNo },
//             { semester },
//             { degreeTitle }
//         ]
//     })

//     const course = await Course.find({
//         $and: [
//             { degreeTitle },
//             { semester }
//         ]
//     })

//     if (!course.length) {
//         return res.status(200).json({
//             success: true,
//             courseAttendance: [],
//             overAllAttendance: {
//                 classConducted: "0/0",
//                 totalClassConducted: "0",
//                 percentage: 0
//             },
//             message: "No course found."
//         });
//     }

//     if (!attendance.length) {
//         return res.status(200).json({
//             success: true,
//             courseAttendance: course.map((item) => ({
//                 courseName: item.courseName,
//                 courseCode: item.courseCode,
//                 percentage: 0,
//                 classConducted: "0/0"
//             })),
//             overAllAttendance: {
//                 classConducted: "0/0",
//                 totalClassConducted: "0",
//                 percentage: 0
//             },
//             message: "No attendance marked yet."
//         });
//     }

//     const courseAttendance = course.map((course, index) => {
//         const filterAttendance = attendance.filter(attendance => attendance.courseCode === course.courseCode);

//         let presentCount = 0;
//         let absentCount = 0;

//         filterAttendance.map((item) => {
//             if (item.attendance === "Present") presentCount++;
//             else if (item.attendance === "Absent") absentCount++;
//         })

//         const leaveCount = filterAttendance.length - (presentCount + absentCount);
//         const totalCount = filterAttendance.length - leaveCount;
//         const percentage = parseInt((presentCount / totalCount) * 100);
//         return {
//             courseName: course.courseName,
//             courseCode: course.courseCode,
//             percentage: isNaN(percentage) ? 0 : percentage,
//             classConducted: `${presentCount}/${totalCount}`
//         }
//     })

//     const classConducted = courseAttendance.map((item) => {
//         return parseInt(item.classConducted.split("/")[0]);
//     })

//     const totalConducted = courseAttendance.map((item) => {
//         return parseInt(item.classConducted.split("/")[1]);
//     })

//     const classC = classConducted.reduce((a, b) => a + b, 0);
//     const totalC = totalConducted.reduce((a, b) => a + b, 0);

//     const totalPercentage = parseInt((classC / totalC) * 100);

//     const overAllAttendance = {
//         classConducted: `${classC}/${totalC}`,
//         totalClassConducted: `${totalC}`,
//         percentage: isNaN(totalPercentage) ? 0 : totalPercentage
//     }

//     return res.status(200).json({
//         success: true,
//         courseAttendance,
//         overAllAttendance,
//         message: "Attendance calculated successfully!"
//     })
// });


// const changePassword = asyncHandler(async (req, res) => {

//     const { current_password, new_password, retype_password } = req.body;

//     if (current_password.length === 0 || new_password.length === 0 || retype_password.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     if (new_password != retype_password) {
//         return res.status(400).json({
//             success: false,
//             message: "Password Doesn't Match!"
//         })
//     }

//     const student = await Student.findById(req?.user?._id);

//     if (!student) {
//         return res.status(404).json({
//             success: false,
//             message: "Student not found"
//         });
//     }

//     const isPasswordCorrect = await student.isPasswordCorrect(current_password);

//     if (!isPasswordCorrect) {
//         return res.status(400).json({
//             success: false,
//             message: "Password is incorrect!"
//         })
//     }

//     student.password = new_password
//     await student.save()

//     return res.status(200).json({
//         success: true,
//         message: "Password changed successfully!"
//     })

// })

// const uploadStudentImage = asyncHandler(async (req, res) => {

//     const avatarFile = req.file?.path;
//     const student_id = req?.body?.id;

//     if (!avatarFile) {
//         return res.status(400).json({
//             success: false,
//             message: "Avatar image is not uploaded!"
//         });
//     }

//     const avatar = await uploadOnCloudinary(avatarFile);

//     if (!avatar) {
//         return res.status(400).json({
//             success: false,
//             message: "Avatar image is not uploaded to Cloudinary!"
//         });
//     }

//     const student = await Student.findById(student_id);
//     const oldPublicId = await student.profileImagePublicId;

//     const deleteAvatar = await deleteFromCloudinary(oldPublicId);

//     if (!deleteAvatar) {
//         return res.status(400).json({
//             success: false,
//             message: "Something went wrong while deleting Image!"
//         });
//     }

//     await Student.findByIdAndUpdate(student_id, {
//         $set: {
//             profileImage: avatar.secure_url,
//             profileImagePublicId: avatar.public_id
//         }
//     });

//     return res.status(200).json({
//         success: true,
//         message: "Image uploaded!"
//     });
// });


// export { logoutStudent, loginStudent, currentStudent, changePassword, uploadStudentImage, calculateCourseAttendance }
