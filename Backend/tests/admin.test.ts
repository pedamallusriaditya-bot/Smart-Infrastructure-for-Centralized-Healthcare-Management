import { testRequest } from './testServer.js';
import { prisma } from '../src/lib/prisma.js';
import {
  registerTestPatient,
  registerTestDoctor,
  createUserWithRole,
} from './helpers/auth.helper.js';
import {
  createTestDepartment,
  createTestLoginHistory,
  cleanupDatabase,
} from './helpers/prisma.helper.js';

afterEach(async () => {
  await cleanupDatabase();
});

describe('GET /api/v1/admin/metrics', () => {
  it('returns aggregate counts and role distribution to an admin', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');
    await registerTestPatient();
    await registerTestPatient();
    const department = await createTestDepartment();
    await registerTestDoctor(department.id);

    const res = await testRequest
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalUsers).toBeGreaterThanOrEqual(4); // 2 patients + 1 doctor + the admin itself
    expect(res.body.data.totalPatients).toBe(2);
    expect(res.body.data.totalDoctors).toBe(1);

    const patientRow = res.body.data.roleDistribution.find((r: any) => r.role === 'PATIENT');
    const doctorRow = res.body.data.roleDistribution.find((r: any) => r.role === 'DOCTOR');
    expect(patientRow.count).toBe(2);
    expect(doctorRow.count).toBe(1);
  });

  it('returns 401 without a token', async () => {
    const res = await testRequest.get('/api/v1/admin/metrics');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-ADMIN role', async () => {
    const { accessToken } = await registerTestPatient();

    const res = await testRequest
      .get('/api/v1/admin/metrics')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Access denied');
  });
});

describe('GET /api/v1/admin/audit', () => {
  it('returns paginated login history, newest first', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');
    const { user: patientUser } = await registerTestPatient();

    await createTestLoginHistory(patientUser.id, { ipAddress: '10.0.0.1' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await createTestLoginHistory(patientUser.id, { ipAddress: '10.0.0.2' });

    const res = await testRequest
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.records).toHaveLength(2);
    expect(res.body.data.records[0].ipAddress).toBe('10.0.0.2');
    expect(res.body.data.records[0].user.email).toBe(patientUser.email);
  });

  it('respects page and limit query params', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');
    const { user: patientUser } = await registerTestPatient();

    for (let i = 0; i < 3; i++) {
      await createTestLoginHistory(patientUser.id);
    }

    const res = await testRequest
      .get('/api/v1/admin/audit?page=2&limit=2')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.limit).toBe(2);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.totalPages).toBe(2);
    expect(res.body.data.records).toHaveLength(1); // 3 total, 2 per page -> 1 left on page 2
  });

  it('returns 400 for an invalid limit (over the max of 100)', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');

    const res = await testRequest
      .get('/api/v1/admin/audit?limit=500')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for a non-numeric page', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');

    const res = await testRequest
      .get('/api/v1/admin/audit?page=not-a-number')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 without a token', async () => {
    const res = await testRequest.get('/api/v1/admin/audit');
    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-ADMIN role', async () => {
    const department = await createTestDepartment();
    const { accessToken } = await registerTestDoctor(department.id);

    const res = await testRequest
      .get('/api/v1/admin/audit')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/v1/admin/users/:id', () => {
  it("deletes a user account and cascades their patient record", async () => {
    const { accessToken } = await createUserWithRole('ADMIN');
    const { user: patientUser } = await registerTestPatient();

    const res = await testRequest
      .delete(`/api/v1/admin/users/${patientUser.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();

    const deletedUser = await prisma.user.findUnique({ where: { id: patientUser.id } });
    expect(deletedUser).toBeNull();

    const orphanedPatient = await prisma.patient.findUnique({ where: { userId: patientUser.id } });
    expect(orphanedPatient).toBeNull();
  });

  // Regression test: admin.service.ts throws a plain Error("User not found"),
  // which — before the controller fix — fell through to the global error
  // handler's 500 default instead of a proper 404.
  it('returns 404 for a well-formed UUID that has no matching user', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');
    const nonExistentId = '00000000-0000-0000-0000-000000000000';

    const res = await testRequest
      .delete(`/api/v1/admin/users/${nonExistentId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  // Regression test: same fall-through-to-500 bug for the self-delete guard.
  it('returns 400 when an admin tries to delete their own account', async () => {
    const { accessToken, user } = await createUserWithRole('ADMIN');

    const res = await testRequest
      .delete(`/api/v1/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);

    const stillExists = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();
  });

  it('returns 400 for a malformed (non-UUID) id', async () => {
    const { accessToken } = await createUserWithRole('ADMIN');

    const res = await testRequest
      .delete('/api/v1/admin/users/not-a-uuid')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 without a token', async () => {
    const { user } = await registerTestPatient();

    const res = await testRequest.delete(`/api/v1/admin/users/${user.id}`);

    expect(res.status).toBe(401);
  });

  it('returns 403 for a non-ADMIN role', async () => {
    const { accessToken } = await registerTestPatient();
    const { user: victim } = await registerTestPatient();

    const res = await testRequest
      .delete(`/api/v1/admin/users/${victim.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});
