import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Send the response but do NOT return it directly
        res.status(400).json({
          status: 'fail',
          message: 'Validation failed',
          errors: error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
        });
        return; // Terminates the middleware correctly
      }
      next(error);
    }
  };
};