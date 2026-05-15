import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const { Schema, model, models } = mongoose;

const studentSchema = new Schema({
    fullName: {
        type: String,
        required: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true
    },
    degreeTitle: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    profileImage: {
        type: String,
        default: null
    },
    profileImagePublicId: {
        type: String,
        default: null
    },
    registrationNumber: {
        type: String
    },
    universityRollNumber: {
        type: String
    },
    collegeRollNo: {
        type: String,
        required: true,
        unique: true
    },
    shift: {
        type: String,
        enum: ["Morning", "Evening"]
    },
    section: {
        type: String,
        enum: ["G1", "G2"]
    },
    semester: {
        type: Number
    },
    session: {
        type: String
    },
    sessionStartDate: {
        type: String,
        required: true
    },
    sessionEndDate: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Disabled'],
        default: 'Disabled'
    },
    stoCount: {
        type: Number,
        default: 0
    },
    Background: {
        type: String
    },
    hsscDegree: {
        type: String
    },
    hsscMarks: {
        type: Number
    },
    cnic: {
        type: String,
        required: true,
        unique: true
    },
    dob: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    mobile: {
        type: String
    },
    password: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    })

studentSchema.pre('save', async function (next) {

    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10);
    next();

})

studentSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

studentSchema.methods.generateAccessToken = async function (exp_chk) {

    return jwt.sign({
        _id: this._id
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: exp_chk ? "30d" : process.env.ACCESS_TOKEN_EXPIRY
        }
    )

}

export const Student = models.Student || model("Student", studentSchema); 