import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/api/v1/auth", authRoutes);
app.get("/api/v1/health", (req,res)=>res.json({ ok: true }));
app.use((err,req,res,next)=>res.status(err.statusCode||500).json({ message: err.message }));

export default app;
