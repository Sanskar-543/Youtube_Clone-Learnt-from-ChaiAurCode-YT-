import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(` \n MongoDB Connected Succesfully !! \n DB_Host : ${connectionInstance.connection.host} \n`);
        
    } catch (error) {
        console.log(" \n Error : Database Not Connected \n",error);
        process.exit(1)
    }
}

export default connectDB