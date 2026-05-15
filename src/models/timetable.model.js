import mongoose from "mongoose"

const timeTableSchema = new mongoose.Schema({
    degreeTitle: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    day: {
        type: String,
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        required: true
    },
    courseName: {
        type: String,
        required: true,
    },
    courseCode: {
        type: String,
        required: true
    },
    teacherName: {
        type: String,
        required: true,
    },
    startTime: {
        type: String,
        required: true,
    },
    endTime: {
        type: String,
        required: true,
    },
    shift: {
        type: String,
        enum: ["Morning", "Evening"],
        required: true
    },
},
    {
        timestamps: true
    }
)

export const Timetable = mongoose.models.timeTableSchema || mongoose.model("Timetable", timeTableSchema)