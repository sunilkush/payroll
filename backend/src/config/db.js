import mongoose from "mongoose";
export const connectDB = async (uri) => mongoose.connect(uri);
