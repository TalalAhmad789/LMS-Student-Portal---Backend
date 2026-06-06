import { asyncHandler } from '../utils/asyncHandler.js'
import { Timetable } from '../models/timetable.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';


const addTimetable = asyncHandler(async (req, res) => {
    const { degreeTitle, semester, section, day, courseName, courseCode, teacherName, startTime, endTime, shift } = req.body;

    if (!degreeTitle || !semester || !section || !day || !courseName || !courseCode || !teacherName || !startTime || !endTime || !shift ||
        degreeTitle.length === 0 || semester.length === 0 || section.length === 0 || day.length === 0 ||
        courseName.length === 0 || teacherName.length === 0 || courseCode.length === 0 ||
        startTime.length === 0 || endTime.length === 0 || shift.length === 0) {
        return res.status(400).json(new ApiError(400, "All fields are required!"));
    }

    const timetableExist = await Timetable.findOne({
        $and: [
            { degreeTitle }, { semester }, { section }, { day },
            { courseName }, { teacherName }, { courseCode }, { startTime }, { endTime }, { shift }
        ]
    });

    if (timetableExist) {
        return res.status(409).json(new ApiError(409, "Timetable entry already exists!"));
    }

    const timetable = await Timetable.create({
        degreeTitle, semester, section, day, courseName,
        teacherName, courseCode, startTime, endTime, shift
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
    addTimetable,
    getTimetable,
    deleteTimetable
}