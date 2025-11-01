import { HTTPException } from 'hono/http-exception';

export function getDatabase(c: any) {
  if (c.env.DB) {
    return c.env.DB;
  }
  throw new HTTPException(500, { message: 'Database binding not found' });
}
