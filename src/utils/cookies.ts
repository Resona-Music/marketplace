import { Response, Request, CookieOptions } from 'express';

interface CookieHelpers {
  getOptions: () => CookieOptions;
  set: (res: Response, name: string, value: string, options?: CookieOptions) => void;
  clear: (res: Response, name: string, options?: CookieOptions) => void;
  get: (req: Request, name: string) => string | undefined;
}

export const cookies: CookieHelpers = {
  getOptions: (): CookieOptions => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
  }),
  set: (res: Response, name: string, value: string, options: CookieOptions = {}): void => {
    res.cookie(name, value, { ...cookies.getOptions(), ...options });
  },
  clear: (res: Response, name: string, options: CookieOptions = {}): void => {
    res.clearCookie(name, { ...cookies.getOptions(), ...options });
  },
  get: (req: Request, name: string): string | undefined => {
    return req.cookies?.[name];
  },
};
