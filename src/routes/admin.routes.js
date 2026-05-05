import Router from 'express'
import {
    deleteStudent, updateStudent, getStudent, registerStudent, deleteTeacher, updateTeacher, getTeacher, registerTeacher, addLecture, deleteLecture, getLecture, addCourse, deleteCourse, getCourse, loginAdmin, currentAdmin, logoutAdmin, registerAdmin, getAdmin, deleteAdmin, updateAdmin, registerSuperAdmin, addTimetable, deleteTimetable, getTimetable, resetStudentPassword, resetTeacherPassword, resetAdminPassword
} from '../controllers/admin.controller.js'
import { verifyAdminToken } from '../middlewares/auth.middleware.js'

const router = Router();

router.route('/student/register').post(registerStudent)
router.route('/students').get(getStudent)
router.route('/student/:id').delete(deleteStudent)
router.route('/student/:id').put(updateStudent)
router.route('/student/reset-password').post(resetStudentPassword)

router.route('/teacher/register').post(registerTeacher)
router.route('/teachers').get(getTeacher)
router.route('/teacher/:id').delete(deleteTeacher)
router.route('/teacher/:id').put(updateTeacher)
router.route('/teacher/reset-password').post(resetTeacherPassword)

router.route('/lecture/add').post(addLecture)
router.route('/lecture/:id').delete(deleteLecture)
router.route('/lectures').get(getLecture)

router.route('/course/add').post(addCourse)
router.route('/course/:id').delete(deleteCourse)
router.route('/courses').get(getCourse)

router.route('/timetable/add').post(addTimetable)
router.route('/timetable/:id').delete(deleteTimetable)
router.route('/timetables').get(getTimetable)

router.route('/admin/register').post(registerAdmin)
router.route('/admins').get(getAdmin)
router.route('/admin/:id').delete(deleteAdmin)
router.route('/admin/:id').put(updateAdmin)
router.route('/login').post(loginAdmin)
router.route('/logout').post(verifyAdminToken, logoutAdmin)
router.route('/me').get(verifyAdminToken, currentAdmin)
router.route('/admin/reset-password').post(resetAdminPassword)

export default router