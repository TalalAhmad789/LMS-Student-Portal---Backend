import { asyncHandler } from '../utils/asyncHandler.js'
import { Course } from '../models/course.model.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

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

export {
    addCourse,
    getCourse,
    deleteCourse
}