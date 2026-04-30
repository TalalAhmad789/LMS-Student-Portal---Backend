import Router from 'express'
import { loginTeacher, logoutTeacher, currentTeacher, getTeacherLectures, getLectureEnrolledStudents, submitAttendance, getAttendance, getStudentAttendance, updateStudentAttendance } from '../controllers/teacher.controller.js'
import { verifyTeacherToken } from '../middlewares/auth.middleware.js'

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

export default router
