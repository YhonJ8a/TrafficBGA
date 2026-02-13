import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);

    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';

    res.error(message, status);
};