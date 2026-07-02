import { Request, Response, NextFunction, RequestHandler } from 'express';

// This signature explicitly tells TypeScript that this function 
// returns a valid Express RequestHandler
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): RequestHandler => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};