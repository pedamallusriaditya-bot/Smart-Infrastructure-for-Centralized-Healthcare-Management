

export function expectSuccess(response: any): void {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

export function expectUnauthorized(response: any): void {
  expect(response.status).toBe(401);
}

export function expectForbidden(response: any): void {
  expect(response.status).toBe(403);
}

export function expectValidationError(response: any): void {
  expect(response.status).toBe(400);
}

export function expectNotFound(response: any): void {
  expect(response.status).toBe(404);
}

export function expectServerError(response: any): void {
  expect(response.status).toBe(500);
}