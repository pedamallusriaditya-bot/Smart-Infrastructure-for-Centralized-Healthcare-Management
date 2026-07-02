import request from 'supertest';
import app from '../../src/app.js';

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
}

export async function loginAs(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email,
      password,
    });

  if (response.status !== 200) {
    throw new Error(
      `Unable to login as ${email}\n${JSON.stringify(response.body)}`
    );
  }

  return response.body.data;
}

export async function getAuthHeader(
  email: string,
  password: string
): Promise<Record<string, string>> {
  const tokens = await loginAs(email, password);

  return {
    Authorization: `Bearer ${tokens.accessToken}`,
  };
}