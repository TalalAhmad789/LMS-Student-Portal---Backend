import { Student } from '../models/student.model.js';
import { Teacher } from '../models/teacher.model.js'
import Admin from '../models/admin.model.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken'

export const verifyStudentToken = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized request!"
            })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await Student.findById(decodedToken?._id).select("-password")

        req.user = user;
        next()
    } catch (error) {
        return res.status(500).json({
            message: error?.message || "Invalid access"
        })
    }
})

export const verifyTeacherToken = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer: ", "");

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized request!"
            })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await Teacher.findById(decodedToken?._id).select("-password")

        req.user = user;
        next()
    } catch (error) {
        return res.status(500).json({
            message: error?.message || "Invalid access"
        })
    }
})

export const verifyAdminToken = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer: ", "");

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized request!"
            })
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await Admin.findById(decodedToken?._id).select("-password")

        req.user = user;
        next()
    } catch (error) {
        return res.status(500).json({
            message: error?.message || "Invalid access"
        })
    }
})
