import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'

const app = express()

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))
app.use(cookieParser())
app.use(express.json({
    limit: '16kb'
}))
app.use(express.urlencoded({
    extended: true,
    limit: '16kb'
}))
app.use(express.static('public'))

//routes import
import studentRouter from '../backend/src/routes/student.routes.js'
import adminRouter from '../backend/src/routes/admin.routes.js'
import teacherRouter from '../backend/src/routes/teacher.routes.js'

app.use('/api/v1/students', studentRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/teachers', teacherRouter);

export default app