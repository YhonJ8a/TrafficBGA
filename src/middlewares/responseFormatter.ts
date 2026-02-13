import { Request, Response, NextFunction } from 'express';

// Extender el tipo Response para añadir el método customizado
declare global {
    namespace Express {
        interface Response {
            success(data: any, status?: number): void;
            error(message: string, status?: number): void;
        }
    }
}

export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
    // Método para respuestas exitosas
    res.success = function (data: any, status: number = 200) {
        return this.status(status).json({
            data: data,
            date: new Date().toISOString(),
            status: status,
            ok: true
        });
    };

    // Método para respuestas de error
    res.error = function (message: string, status: number = 400) {
        return this.status(status).json({
            data: message,
            date: new Date().toISOString(),
            status: status,
            ok: false
        });
    };

    next();
};