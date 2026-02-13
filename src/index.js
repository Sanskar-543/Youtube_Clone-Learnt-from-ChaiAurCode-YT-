import connectDB from "./db/index.js";
import dotenv from "dotenv"
import {app} from "./app.js"

const Port = process.env.PORT || "8000"
dotenv.config({
    path : './.env'
})

connectDB().then(() => {
    app.on("error",(error) => {
        console.log("\n Error:(index.js) App is not Listening \n",error);
        throw error
    })
    app.listen(Port,() => {
        console.log(`App is Listening at Port : ${Port}`);
    })
})