import Router from 'express'
import { logoutStudent, loginStudent, currentStudent, changePassword, uploadStudentImage, calculateCourseAttendance, fetchSpecificAttendance } from '../controllers/student.controllers.js';
import { verifyStudentToken } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'

const router = Router();

router.route('/login').post(loginStudent)
router.route('/logout').post(verifyStudentToken, logoutStudent)
router.route('/me').get(verifyStudentToken, currentStudent)
router.route('/attendance/calculate').post(calculateCourseAttendance)
router.route('/change-password').post(verifyStudentToken, changePassword)
router.route('/change-profile-image').post(upload.single("avatar"), uploadStudentImage);
router.route('/specific-attendance').post(fetchSpecificAttendance)

export default router

