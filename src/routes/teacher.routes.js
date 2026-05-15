import Router from 'express'
import { loginTeacher, logoutTeacher, currentTeacher, getTeacherLectures, getLectureEnrolledStudents, submitAttendance, getAttendance, getStudentAttendance, updateStudentAttendance, uploadTeacherImage } from '../controllers/teacher.controller.js'
import { verifyTeacherToken } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.route('/login').post(loginTeacher)
router.route('/logout').post(verifyTeacherToken, logoutTeacher)
router.route('/me').get(verifyTeacherToken, currentTeacher)
router.route('/lecture').get(verifyTeacherToken, getTeacherLectures)
router.route('/attendance').get(getLectureEnrolledStudents)
router.route('/attendance/students').post(submitAttendance)
router.route('/attendance/find').get(getAttendance)
router.route('/attendance/edit/fetch').get(getStudentAttendance)
router.route('/attendance/edit/update').post(updateStudentAttendance)
router.route('/change-profile-image').post(upload.single("avatar"), uploadTeacherImage)

export default router
