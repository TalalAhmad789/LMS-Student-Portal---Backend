import 'dotenv/config'
import app from './app.js'
import { dataBaseConnection } from './src/db/connection.js'



const port = process.env.PORT || 8000

dataBaseConnection()
    .then(() => {
        app.listen(port, () => {
            console.log("Server is running at port: ", port)
        })
    })
    .catch((err) => {
        console.log("MONGO db connection failed !!! ", err);
    })

app.get('/', (req, res) => {
    res.send("Hello World");
})