import { asyncHandler } from '../utils/asyncHandler.js'
import { Lecture } from '../models/lecture.model.js'
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

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

export {
    addLecture,
    getLecture,
    deleteLecture
}