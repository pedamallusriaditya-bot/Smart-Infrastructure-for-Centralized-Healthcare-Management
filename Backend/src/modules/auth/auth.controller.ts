import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { successResponse, errorResponse } from '../../utils/response.util.js';
import { logger } from '../../lib/logger.js';

const authService = new AuthService();
const RegisterSchema = z.object({
  email:z.string().email(),
  password:z.string().min(8),
  role:z.enum(['PATIENT', 'DOCTOR', 'ADMIN']),
  firstName:z.string().min(1),
  lastName:z.string().min(1),
  extraField:z.object({
    dateOfBirth:z.string().optional(),
    gender:z.string().optional(),
    specialization:z.string().optional(),
    licenseNumber:z.string().optional(),
    departmentId:z.string().optional()
  }).optional()
});
const LoginSchema = z.object({
  email:z.string().email(),
  password:z.string().min(1)
});
const LogoutSchema = z.object({
  refreshToken:z.string().min(1)
});
export const register = async(
req:Request,
res:Response
):Promise<void>=>{
try{
const data=RegisterSchema.parse(req.body);
const result=await authService.registerUser(
data,
req.requestId
);
successResponse(
res,
"Account registered successfully",
result,
201
);
}catch(error:any){
logger.error("Registration failed",{
requestId:req.requestId,
error:error.message
});
errorResponse(
res,
"Registration failed",
400,
"REGISTER_FAILED"
);
}
};
export const login = async(
req:Request,
res:Response
):Promise<void>=>{
try{
const data=LoginSchema.parse(req.body);
const result=await authService.loginUser(
data,
req.ip,
req.headers['user-agent'],
req.requestId
);
successResponse(
res,
"Authentication successful",
result,
200
);
}catch(error:any){
errorResponse(
res,
"Login failed",
401,
"LOGIN_FAILED"
);
}
};
export const logout = async(
req:Request,
res:Response
):Promise<void>=>{
try{
const parseResult=LogoutSchema.safeParse(req.body);
if(!parseResult.success){
errorResponse(
res,
"Refresh token missing",
400,
"TOKEN_MISSING"
);
return;
}
const token=parseResult.data.refreshToken;
await authService.logoutCurrentDevice(token);
successResponse(
res,
"Logout successful",
null,
200
);
}catch(error){
errorResponse(
res,
"Logout failed",
500,
"LOGOUT_FAILED"
);
}
};