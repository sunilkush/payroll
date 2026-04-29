import { Card, Form, Input, Button, Typography } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../../slices/auth.slice";
import { useNavigate } from "react-router-dom";
const Center=({title,children})=><div className="min-h-screen grid place-items-center p-4"><Card title={title} style={{width:420}}>{children}</Card></div>;
export function LoginPage(){const d=useDispatch();const nav=useNavigate();const loading=useSelector(s=>s.auth.loading);return <Center title="Login"><Form layout="vertical" onFinish={async(v)=>{const r=await d(login(v));if(!r.error) nav('/app/dashboard')}}><Form.Item label="Email" name="email" rules={[{required:true},{type:"email"}]}><Input/></Form.Item><Form.Item label="Password" name="password" rules={[{required:true}]}><Input.Password/></Form.Item><Button type="primary" htmlType="submit" loading={loading} block>Sign in</Button></Form></Center>}
export const SignupPage=()=> <Center title="Signup"><Typography.Text>Use onboarding to create company.</Typography.Text></Center>;
export const ForgotPasswordPage=()=> <Center title="Forgot Password"><Input placeholder="Email"/></Center>;
export const ResetPasswordPage=()=> <Center title="Reset Password"><Input.Password placeholder="New password"/></Center>;
export const LandingPage=()=> <div className="p-12"><h1>Payroll SaaS</h1></div>;
export const PricingPage=()=> <div className="p-12"><h1>Pricing</h1></div>;
