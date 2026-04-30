import mongoose from 'mongoose'

const lectureSchema = new mongoose.Schema({
    teacherId: {
        type: String,
        required: true
    },
    courseCode: {
        type: String,
        required: true
    },
    degreeTitle: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    shift: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    }
},
{
    timestamps: true
}
)

export const Lecture = mongoose.models.lectureSchema || mongoose.model("Lecture", lectureSchema);