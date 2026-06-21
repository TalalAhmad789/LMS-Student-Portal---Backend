import Router from 'express'
import {
    deleteStudent, updateStudent, getStudent, registerStudent, deleteTeacher, updateTeacher, getTeacher, registerTeacher, loginAdmin, currentAdmin, logoutAdmin, registerAdmin, getAdmin, deleteAdmin, updateAdmin, registerSuperAdmin, resetStudentPassword, resetTeacherPassword, resetAdminPassword, uploadAdminImage, changePassword, calculateAttendanceByClass, calculateAttendanceByStudent, calculateSOStudentAttendance, fetchStudentsForPromotion, promoteAndSaveStdAttendance
} from '../controllers/admin.controller.js'
import { addCourse, getCourse, deleteCourse } from '../controllers/course.controller.js'
import { addTimetable, getTimetable, deleteTimetable } from '../controllers/timetable.controller.js'
import { addLecture, getLecture, deleteLecture } from '../controllers/lecture.controller.js'
import { verifyAdminToken } from '../middlewares/auth.middleware.js'
import { upload } from '../middlewares/multer.middleware.js'

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
router.route('/change-profile-image').post(upload.single("avatar"), uploadAdminImage)
router.route('/change-password').post(verifyAdminToken, changePassword)

router.route('/attendance-by-class').post(calculateAttendanceByClass)
router.route('/attendance-by-student').post(calculateAttendanceByStudent)
router.route('/attendance-by-so-student').post(calculateSOStudentAttendance)
router.route('/get-student-for-promotion').post(fetchStudentsForPromotion)
router.route('/student-promotion').post(promoteAndSaveStdAttendance)

export default router