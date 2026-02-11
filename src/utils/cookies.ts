import { Response, Request, CookieOptions } from 'express';

interface CookieHelpers {
  set: (res: Response, name: string, value: string, options: CookieOptions) => void;
  clear: (res: Response, name: string, options: CookieOptions) => void;
  get: (req: Request, name: string) => string | undefined;
}

export const cookies: CookieHelpers = {
  set: (res: Response, name: string, value: string, options: CookieOptions): void => {
    res.cookie(name, value, options);
  },
  clear: (res: Response, name: string, options: CookieOptions): void => {
    res.clearCookie(name, options);
  },
  get: (req: Request, name: string): string | undefined => {
    return req.cookies?.[name];
  },
};
