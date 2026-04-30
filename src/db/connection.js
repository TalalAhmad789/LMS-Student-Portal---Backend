import mongoose, { connect } from "mongoose";
import { dbName } from "../../contants.js";

export const dataBaseConnection = async () => {
    try {
        const connectionInstance = await connect(`${process.env.MONGO_URI}/${dbName}`);
        console.log(`\nDB Connection Host: ${connectionInstance.connection.host}`)
    } catch (error) {
        console.log("DB Connection Error: ", error)
    }
}
