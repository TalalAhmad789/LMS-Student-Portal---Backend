import mongoose from 'mongoose'

const attendanceSchema = new mongoose.Schema({
    collegeRollNo: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    studentId: {
        type: String
    },
    attendance: {
        type: String,
        enum: ['Present', 'Absent', 'Leave'],
        required: true
    },
    courseCode: {
        type: String,
        required: true
    },
    semester: {
        type: Number,
        required: true
    },
    shift: {
        type: String,
        required: true
    },
    degreeTitle: {
        type: String
    },
    section: {
        type: String
    },
    lectureAttendanceId: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    }
)

export const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema)