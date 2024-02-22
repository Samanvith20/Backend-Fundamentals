import mongoose from "mongoose"
import { DB_NAME } from "../utils/constants.js"
 const connectdb = async ()=>{
     try {
          const connectionInstance=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`/n mongodb connected successfully !! DBHOST:${connectionInstance.connection.host}`);
        
     } catch (error) {
         console.error("Failed to connect DB:", error)
         process.exit(1)
     }
 }
  export default connectdb