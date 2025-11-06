import { ZodError } from 'zod';

export const formatValidationError = (errors: ZodError | unknown): string => {
  if (!errors || typeof errors !== 'object') return 'Validation failed';

  if ('issues' in errors && Array.isArray(errors.issues)) {
    return errors.issues.map((i: any) => i.message).join(', ');
  }

  return JSON.stringify(errors);
};
