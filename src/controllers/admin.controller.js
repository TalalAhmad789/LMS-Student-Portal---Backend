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
    const studentId = `${degreeTitle}-${collegeRollNo}-${startDate}`;

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
    const students = await Student.find();

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

// ─── Lecture Controllers ──────────────────────────────────────────────────────

const addLecture = asyncHandler(async (req, res) => {
    const { teacherId, courseCode, degreeTitle, section, shift, semester } = req.body;

    if (!teacherId || !courseCode || !degreeTitle || !section || !shift || !semester ||
        teacherId.length === 0 || courseCode.length === 0 || degreeTitle.length === 0 ||
        section.length === 0 || shift.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const lectureExist = await Lecture.findOne({
        $and: [{ teacherId }, { courseCode }, { degreeTitle }, { semester }, { section }, { shift }]
    });

    if (lectureExist) {
        return res.status(409).json(new ApiError(409, "Lecture already created!"));
    }

    const lecture = await Lecture.create({
        teacherId, courseCode, degreeTitle, semester, section, shift
    });

    const lectureCreated = await Lecture.findById(lecture._id);

    if (!lectureCreated) {
        return res.status(500).json(new ApiError(500, "Something went wrong while creating lecture!"));
    }

    return res.status(201).json(
        new ApiResponse(201, {}, "Lecture created successfully!")
    );
});

const getLecture = asyncHandler(async (req, res) => {
    const lectures = await Lecture.find();

    if (!lectures.length) {
        return res.status(404).json(new ApiError(404, "No lectures found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { lectures }, "Lectures fetched successfully!")
    );
});

const deleteLecture = asyncHandler(async (req, res) => {
    const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);

    if (!deletedLecture) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting lecture!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Lecture deleted successfully!")
    );
});



// ─── Course Controllers ──────────────────────────────────────────────────────

const addCourse = asyncHandler(async (req, res) => {
    const { courseCode, courseName, degreeTitle, semester } = req.body;

    if (!courseCode || !courseName || !degreeTitle || !semester ||
        courseCode.length === 0 || courseName.length === 0 || degreeTitle.length === 0 || semester.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const existCourse = await Course.findOne({
        $and: [{ courseCode }, { courseName }, { degreeTitle }, { semester }]
    });

    if (existCourse) {
        return res.status(409).json(new ApiError(409, "Course already created!"));
    }

    const course = await Course.create({ courseCode, courseName, degreeTitle, semester });

    const courseCreated = await Course.findById(course._id);

    if (!courseCreated) {
        return res.status(500).json(new ApiError(500, "Something went wrong while creating course!"));
    }

    return res.status(201).json(
        new ApiResponse(201, {}, "Course created successfully!")
    );
});

const getCourse = asyncHandler(async (req, res) => {
    const courseList = await Course.find();

    if (!courseList.length) {
        return res.status(404).json(new ApiError(404, "No courses found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { courses: courseList }, "Courses fetched successfully!")
    );
});

const deleteCourse = asyncHandler(async (req, res) => {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting course!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Course deleted successfully!")
    );
});

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

    const adminExist = await Admin.findOne({ email });

    if (!adminExist) {
        return res.status(401).json(new ApiError(401, "Invalid credentials!"));
    }

    const passwordValid = await bcrypt.compare(password, adminExist.password);

    if (!passwordValid) {
        return res.status(401).json(new ApiError(401, "Invalid credentials!"));
    }

    const { accessToken } = generateAccessToken(adminExist._id, checkbox);

    const loggedInAdmin = await Admin.findById(adminExist._id).select("-password");

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

// ─── Timetable Controllers ────────────────────────────────────────────────────

const addTimetable = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, section, day, courseName, teacherName, roomNo, startTime, endTime, shift } = req.body;

    if (!degreeTitle || !semester || !section || !day || !courseName || !teacherName || !roomNo || !startTime || !endTime || !shift ||
        degreeTitle.length === 0 || semester.length === 0 || section.length === 0 || day.length === 0 ||
        courseName.length === 0 || teacherName.length === 0 || roomNo.length === 0 ||
        startTime.length === 0 || endTime.length === 0 || shift.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const timetableExist = await Timetable.findOne({
        $and: [
            { degreeTitle }, { semester }, { section }, { day },
            { courseName }, { teacherName }, { roomNo }, { startTime }, { endTime }, { shift }
        ]
    });

    if (timetableExist) {
        return res.status(409).json(new ApiError(409, "Timetable entry already exists!"));
    }

    const timetable = await Timetable.create({
        degreeTitle, semester, section, day, courseName,
        teacherName, roomNo, startTime, endTime, shift
    });

    const createdTimetable = await Timetable.findById(timetable?._id);

    if (!createdTimetable) {
        return res.status(500).json(new ApiError(500, "Something went wrong while creating timetable!"));
    }

    return res.status(201).json(
        new ApiResponse(201, {}, "Timetable created successfully!")
    );
});

const getTimetable = asyncHandler(async (req, res) => {
    const timetableList = await Timetable.find();

    if (!timetableList.length) {
        return res.status(404).json(new ApiError(404, "No timetables found!"));
    }

    return res.status(200).json(
        new ApiResponse(200, { timetables: timetableList }, "Timetables fetched successfully!")
    );
});

const deleteTimetable = asyncHandler(async (req, res) => {
    const deletedTimetable = await Timetable.findByIdAndDelete(req.params.id);

    if (!deletedTimetable) {
        return res.status(500).json(new ApiError(500, "Something went wrong while deleting timetable!"));
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "Timetable deleted successfully!")
    );
});

export {
    getStudent,
    deleteStudent,
    updateStudent,
    registerStudent,
    getTeacher,
    deleteTeacher,
    updateTeacher,
    registerTeacher,
    addLecture,
    deleteLecture,
    getLecture,
    addCourse,
    getCourse,
    deleteCourse,
    loginAdmin,
    currentAdmin,
    logoutAdmin,
    registerSuperAdmin,
    registerAdmin,
    getAdmin,
    deleteAdmin,
    updateAdmin,
    addTimetable,
    getTimetable,
    deleteTimetable
};


// import { asyncHandler } from '../utils/asyncHandler.js'
// import { Teacher } from '../models/teacher.model.js'
// import { Student } from '../models/student.model.js';
// import { Lecture } from '../models/lecture.model.js'
// import { Course } from '../models/course.model.js'
// import { Timetable } from '../models/timetable.model.js';
// import Admin from '../models/admin.model.js';
// import bcrypt from 'bcrypt'
// import jwt from 'jsonwebtoken'

// const generateAccessToken = async (userId, expiry_date_check) => {
//     const admin = await Admin.findById(userId);
//     const accessToken = await jwt.sign({
//         _id: admin._id
//     },
//         process.env.ACCESS_TOKEN_SECRET,
//         {
//             expiresIn: expiry_date_check ? "30d" : process.env.ACCESS_TOKEN_EXPIRY
//         }
//     )
//     return { accessToken }
// }

// // Controllers for Student
// const registerStudent = asyncHandler(async (req, res) => {

//     const { fullName, degreeTitle, collegeRollNo, cnic, sessionStartDate, sessionEndDate } = req.body;

//     if (fullName.length === 0 || degreeTitle.length === 0 || collegeRollNo.length === 0 || cnic.length === 0 || sessionStartDate.length === 0 || sessionEndDate.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     const startDate = sessionStartDate.split("-")[0];

//     const studentId = `${degreeTitle}-${collegeRollNo}-${startDate}`;

//     const studentExist = await Student.findOne({
//         $or: [
//             { cnic },
//             { studentId }
//         ]
//     })

//     if (studentExist) {
//         return res.status(409).json({
//             success: false,
//             message: "Student already Registered!"
//         })
//     }

//     const student = await Student.create({
//         fullName: fullName,
//         degreeTitle: degreeTitle,
//         collegeRollNo: collegeRollNo,
//         cnic: cnic,
//         sessionStartDate: sessionStartDate,
//         sessionEndDate: sessionEndDate,
//         studentId: studentId,
//         password: cnic,
//         semester: 1
//     })

//     const studentCreated = await Student.findById(student._id);

//     if (studentCreated) {
//         return res.status(201).json({
//             success: true,
//             userId: studentCreated._id,
//             message: "Student Registered!"
//         })
//     }

// })

// const getStudent = asyncHandler(async (req, res) => {
//     const students = await Student.find();
//     if (!students) {
//         return res.status(400).json({
//             success: false,
//             message: "No Student found!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Students is found!",
//         data: students
//     })
// })

// const deleteStudent = asyncHandler(async (req, res) => {

//     const deletedStudent = await Student.findByIdAndDelete(req.params.id);

//     if (!deletedStudent) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Student Deleted!"
//     })
// })

// const updateStudent = asyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const { fullName, degreeTitle, collegeRollNo, cnic, address, registrationNumber, universityRollNumber, shift, section, semester, sessionStartDate, sessionEndDate, status, studentId, stoCount, Background, hsscDegree, hsscMarks, dob, email, phone, mobile } = req.body;

//     const updatedStudent = await Student.findByIdAndUpdate(id, {
//         $set: {
//             fullName,
//             degreeTitle,
//             collegeRollNo,
//             cnic,
//             address,
//             registrationNumber,
//             universityRollNumber,
//             shift,
//             section,
//             semester,
//             sessionStartDate,
//             sessionEndDate,
//             status,
//             studentId,
//             stoCount,
//             Background,
//             hsscDegree,
//             hsscMarks,
//             dob,
//             email,
//             phone,
//             mobile,
//         }
//     },
//         {
//             new: true
//         })

//     if (!updatedStudent) {
//         res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Student Updated!"
//     })
// })

// // Controllers for Teacher
// const registerTeacher = asyncHandler(async (req, res) => {

//     const { fullName, specification, cnic, email } = req.body;

//     if (fullName.length === 0 || specification.length === 0 || cnic.length === 0 || email.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required"
//         })
//     }

//     const teacherId = `${fullName.split(" ")[0]}-${cnic}`;

//     const teacherExist = await Teacher.findOne({
//         $or: [
//             { cnic },
//             { teacherId }
//         ]
//     })

//     if (teacherExist) {
//         return res.status(409).json({
//             success: false,
//             message: "Teacher already Registered!"
//         })
//     }

//     const teacher = await Teacher.create({
//         fullName: fullName,
//         specification: specification,
//         cnic: cnic,
//         teacherId: teacherId,
//         password: cnic,
//         email: email
//     })

//     const teacherCreated = await Teacher.findById(teacher._id);

//     if (teacherCreated) {
//         return res.status(201).json({
//             success: true,
//             userId: teacherCreated._id,
//             message: "Teacher Registered!"
//         })
//     }

// })

// const getTeacher = asyncHandler(async (req, res) => {
//     const teachers = await Teacher.find().select("-password");
//     if (!teachers) {
//         return res.status(400).json({
//             success: false,
//             message: "No Teacher found!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Teacher is found!",
//         data: teachers
//     })
// })

// const deleteTeacher = asyncHandler(async (req, res) => {

//     const deletedTeacher = await Teacher.findByIdAndDelete(req.params.id);

//     if (!deletedTeacher) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Teacher Deleted!"
//     })
// })

// const updateTeacher = asyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const { fullName, specification, cnic, status, teacherId, email } = req.body;

//     const updatedTeacher = await Teacher.findByIdAndUpdate(id, {
//         $set: {
//             fullName,
//             specification,
//             cnic,
//             status,
//             teacherId,
//             email,
//         }
//     },
//         {
//             new: true
//         })

//     if (!updatedTeacher) {
//         res.status(500).json({
//             success: false,
//             message: "Something went wrong"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Teacher Updated!"
//     })
// })

// // Controllers for Lecture Management
// const addLecture = asyncHandler(async (req, res) => {

//     const { teacherId, courseCode, degreeTitle, section, shift, semester } = req.body;

//     if (teacherId.length === 0 || courseCode.length === 0 || degreeTitle === 0 || section.length === 0 || shift.length === 0 || semester.length === 0) {
//         return res.status(400).json({
//             success: true,
//             message: "All fields is required!"
//         })
//     }

//     const lectureExist = await Lecture.findOne({
//         $and: [
//             { teacherId },
//             { courseCode },
//             { degreeTitle },
//             { semester },
//             { section },
//             { shift }
//         ]
//     })

//     if (lectureExist) {
//         return res.status(409).json({
//             success: false,
//             message: "Lecture already Created!"
//         })
//     }

//     const lecture = await Lecture.create({
//         teacherId,
//         courseCode,
//         degreeTitle,
//         semester,
//         section,
//         shift
//     })

//     const lectureCreated = Lecture.findById(lecture._id)

//     if (!lectureCreated) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(201).json({
//         success: true,
//         message: "Lecture Created!"
//     })

// })

// const getLecture = asyncHandler(async (req, res) => {
//     const lectures = await Lecture.find();

//     if (!lectures) {
//         return res.status(404).json({
//             success: false,
//             message: "Lecture Not Found!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Lecture found successfully!",
//         lectures
//     })
// })

// const deleteLecture = asyncHandler(async (req, res) => {

//     const deletedLecture = await Lecture.findByIdAndDelete(req.params.id);

//     if (!deletedLecture) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Lecture Deleted!"
//     })

// })

// // Controllers for Course Management
// const addCourse = asyncHandler(async (req, res) => {

//     const { courseCode, courseName, degreeTitle, semester } = req.body;

//     if (courseCode.length === 0 || courseName.length === 0 || degreeTitle.length === 0 || semester.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     const existCourse = await Course.findOne({
//         $and: [
//             { courseCode },
//             { courseName },
//             { degreeTitle },
//             { semester }
//         ]
//     })

//     if (existCourse) {
//         return res.status(409).json({
//             success: false,
//             message: "Course already Created!"
//         })
//     }

//     const course = await Course.create({
//         courseCode,
//         courseName,
//         degreeTitle,
//         semester
//     })

//     const courseCreated = await Course.findById(course._id);

//     if (!courseCreated) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(201).json({
//         success: true,
//         message: "Course Created!"
//     })

// })

// const getCourse = asyncHandler(async (req, res) => {

//     const courseList = await Course.find();

//     if (courseList.length === 0) {
//         return res.status(404).json({
//             success: false,
//             message: "No course found!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Course found successfully!",
//         courses: courseList
//     })

// })

// const deleteCourse = asyncHandler(async (req, res) => {

//     const deletedCourse = await Course.findByIdAndDelete(req.params.id);

//     if (!deletedCourse) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Course Deleted!"
//     })

// })

// // Controllers for Admin
// const getAdmin = asyncHandler(async (req, res) => {
//     const admins = await Admin.find({ isSuperAdmin: false }).select("-password");
//     if (!admins) {
//         return res.status(400).json({
//             success: false,
//             message: "No Admin Record!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Admins is found!",
//         data: admins
//     })
// })

// const registerAdmin = asyncHandler(async (req, res) => {
//     const { fullName, email, cnic } = req.body;

//     if (fullName.length === 0 || email.length === 0 || cnic.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     const adminExist = await Admin.findOne({
//         $or: [
//             { email },
//             { cnic }
//         ]
//     })

//     if (adminExist) {
//         return res.status(409).json({
//             success: false,
//             message: "Admin already Registered!"
//         })
//     }

//     const admin = await Admin.create({
//         fullName: fullName,
//         email: email,
//         cnic: cnic,
//         password: cnic,
//     })

//     const adminCreated = await Admin.findById(admin._id);

//     if (adminCreated) {
//         return res.status(201).json({
//             success: true,
//             userId: adminCreated._id,
//             message: "Admin Registered!"
//         })
//     }
// })

// const updateAdmin = asyncHandler(async (req, res) => {
//     const id = req.params.id;
//     const { fullName, cnic, email, status } = req.body;

//     const updatedAdmin = await Admin.findByIdAndUpdate(id, {
//         $set: {
//             fullName,
//             cnic,
//             email,
//             status
//         }
//     },
//         {
//             new: true
//         })

//     if (!updatedAdmin) {
//         res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Admin Updated!"
//     })
// })

// const deleteAdmin = asyncHandler(async (req, res) => {
//     const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);

//     if (!deletedAdmin) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     res.status(200).json({
//         success: true,
//         message: "Admin Deleted!"
//     })
// })

// const currentAdmin = asyncHandler(async (req, res) => {
//     return res.status(200).json({
//         success: true,
//         message: "User fetched successfully!",
//         admin: req?.user
//     })
// })

// const loginAdmin = asyncHandler(async (req, res) => {
//     const { email, password, checkbox } = req.body;

//     if (email.length === 0 || password.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     const adminExist = await Admin.findOne({
//         email: email
//     })

//     if (!adminExist) {
//         return res.status(402).json({
//             success: false,
//             message: "Invalid credentials!"
//         })
//     }

//     const passwordValid = await bcrypt.compare(password, adminExist.password);

//     if (!passwordValid) {
//         return res.status(400).json({
//             success: false,
//             message: "Invalid credientials!"
//         })
//     }

//     const { accessToken } = await generateAccessToken(adminExist._id, checkbox);

//     const loggedInAdmin = await Admin.findById(adminExist._id).select("-password");

//     const options = {
//         httpOnly: true,
//         secure: true
//     };

//     return res.status(200)
//         .cookie("accessToken", accessToken, options)
//         .json({
//             user: {
//                 loggedInAdminId: loggedInAdmin._id,
//                 accessToken
//             },
//             message: "Login successful!",
//             success: true
//         })
// });

// const registerSuperAdmin = asyncHandler(async (req, res) => {

//     const admin = await Admin.create({
//         fullName: "admin-user",
//         email: "talaljalil164@gmail.com",
//         isSuperAdmin: true,
//         cnic: "35201-5947682-9",
//         password: "StrayT45"
//     })

//     return res.status(201).json({
//         success: true,
//         message: "register Successfully!",
//         Admin: admin
//     })
// })

// const logoutAdmin = asyncHandler(async (req, res) => {

//     const admin = req?.user;

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res.status(200)
//         .clearCookie("accessToken", options)
//         .json({
//             success: true,
//             logoutAdminId: admin._id,
//             message: "Logout successful!"
//         })
// })

// // Controllers for Timetable
// const addTimetable = asyncHandler(async (req, res) => {
//     const { degreeTitle, semester, section, day, courseName, teacherName, roomNo, startTime, endTime, shift } = req.body;

//     if (degreeTitle.length === 0 || semester.length === 0 || section.length === 0 || day.length === 0 || courseName.length === 0 || teacherName.length === 0 || roomNo.length === 0 || startTime.length === 0 || endTime.length === 0 || shift.length === 0) {
//         return res.status(400).json({
//             success: false,
//             message: "All fields is required!"
//         })
//     }

//     const timetableExist = await Timetable.findOne({
//         $and: [
//             { degreeTitle },
//             { semester },
//             { section },
//             { day },
//             { courseName },
//             { teacherName },
//             { roomNo },
//             { startTime },
//             { endTime },
//             { shift }
//         ]
//     })

//     if (timetableExist) {
//         return res.status(409).json({
//             success: false,
//             message: "Timetable already Created!"
//         })
//     }

//     const timetable = await Timetable.create({
//         degreeTitle,
//         semester,
//         section,
//         day,
//         courseName,
//         teacherName,
//         roomNo,
//         startTime,
//         endTime,
//         shift
//     })

//     const createdTimetable = await Timetable.findById(timetable?._id);

//     if (createdTimetable) {
//         return res.status(201).json({
//             success: true,
//             message: "Timetable Created!"
//         })
//     }
// })

// const getTimetable = asyncHandler(async (req, res) => {
//     const timetableList = await Timetable.find();

//     if (timetableList.length === 0) {
//         return res.status(404).json({
//             success: false,
//             message: "No Timetable found!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Timetables found successfully!",
//         timetables: timetableList
//     })
// })

// const deleteTimetable = asyncHandler(async (req, res) => {
//     const deletedTimetable = await Timetable.findByIdAndDelete(req.params.id);

//     if (!deletedTimetable) {
//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong!"
//         })
//     }

//     return res.status(200).json({
//         success: true,
//         message: "Timetable Deleted!"
//     })
// })

// export {
//     getStudent,
//     deleteStudent,
//     updateStudent,
//     registerStudent,
//     getTeacher,
//     deleteTeacher,
//     updateTeacher,
//     registerTeacher,
//     addLecture,
//     deleteLecture,
//     getLecture,
//     addCourse,
//     getCourse,
//     deleteCourse,
//     loginAdmin,
//     currentAdmin,
//     logoutAdmin,
//     registerSuperAdmin,
//     registerAdmin,
//     getAdmin,
//     deleteAdmin,
//     updateAdmin,
//     addTimetable,
//     getTimetable,
//     deleteTimetable
// }