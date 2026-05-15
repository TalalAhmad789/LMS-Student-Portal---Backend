import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

const adminSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    cnic: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Disabled'],
        default: 'Disabled'
    },
    profileImage: {
        type: String,
        default: null
    },
    profileImagePublicId: {
        type: String,
        default: null
    },
    password: {
        type: String,
        required: true
    },
    isSuperAdmin: {
        type: Boolean,
        default: false
    }
},
    {
        timestamps: true
    }
);

adminSchema.pre('save', async function (next) {

    if (!this.isModified("password")) return next()

    this.password = await bcrypt.hash(this.password, 10);
    next();

})

adminSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

adminSchema.methods.generateAccessToken = async function (exp_chk) {

    return jwt.sign({
        _id: this._id
    },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: exp_chk ? "30d" : process.env.ACCESS_TOKEN_EXPIRY
        }
    )

}

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;