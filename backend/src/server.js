import dotenv from "dotenv";dotenv.config();
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI).then(()=>app.listen(port, ()=>console.log(`API on ${port}`)));
