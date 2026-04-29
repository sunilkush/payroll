import bcrypt from "bcryptjs";
import { User, Company } from "../models/index.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signAccessToken, signRefreshToken } from "../services/token.service.js";

export const signupCompany = asyncHandler(async (req,res)=>{
  const { companyName, ownerName, email, password } = req.body;
  const company = await Company.create({ name: companyName });
  const hashedPassword = await bcrypt.hash(password, 10);
  const owner = await User.create({ name: ownerName, email, password: hashedPassword, companyId: company._id, role: "company_owner" });
  res.status(201).json(new ApiResponse(201, { company, owner }, "Company created"));
});

export const login = asyncHandler(async (req,res)=>{
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json(new ApiResponse(401, null, "Invalid credentials"));
  const payload = { userId: user._id, companyId: user.companyId, role: user.role };
  const accessToken = signAccessToken(payload); const refreshToken = signRefreshToken(payload);
  res.cookie("accessToken", accessToken, { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "strict" });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.COOKIE_SECURE === "true", sameSite: "strict" });
  res.json(new ApiResponse(200, { user }, "Logged in"));
});
