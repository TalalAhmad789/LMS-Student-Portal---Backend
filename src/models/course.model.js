import mongoose from "mongoose"

const courseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: true
    },
    courseName: {
        type: String,
        required: true
    },
    degreeTitle: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
})

export const Course = mongoose.models.courseSchema || mongoose.model("Course", courseSchema);