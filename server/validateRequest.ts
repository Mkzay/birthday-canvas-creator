import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

function logValidationIssues(path: string, issues: z.ZodIssue[]) {
  console.warn(JSON.stringify({ scope: "validation", path, issues }));
}

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body ?? {});
    if (!result.success) {
      logValidationIssues(request.path, result.error.issues);
      response.status(400).json({ error: "Invalid request" });
      return;
    }
    request.body = result.data as Record<string, unknown>;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      logValidationIssues(request.path, result.error.issues);
      response.status(400).json({ error: "Invalid request" });
      return;
    }
    Object.assign(request.params, result.data as Record<string, string>);
    next();
  };
}
