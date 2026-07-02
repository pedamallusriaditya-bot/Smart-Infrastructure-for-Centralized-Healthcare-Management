import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.config.js';
const ACCESS_TOKEN_EXPIRY='15m';
const REFRESH_TOKEN_EXPIRY='7d';
export interface TokenPayload{
userId:string;
}
export const generateAccessToken=(payload:TokenPayload)=>{
return jwt.sign(
{ ...payload, jti: crypto.randomUUID() },
env.ACCESS_TOKEN_SECRET,
{
expiresIn:ACCESS_TOKEN_EXPIRY
}
);
};
export const generateRefreshToken=(payload:TokenPayload)=>{
return jwt.sign(
{ ...payload, jti: crypto.randomUUID() },
env.REFRESH_TOKEN_SECRET,
{
expiresIn:REFRESH_TOKEN_EXPIRY
}
);
};
export const verifyAccessToken=(token:string)=>{
return jwt.verify(
token,
env.ACCESS_TOKEN_SECRET
) as TokenPayload;
};
export const verifyRefreshToken=(token:string)=>{
return jwt.verify(
token,
env.REFRESH_TOKEN_SECRET
) as TokenPayload;
};