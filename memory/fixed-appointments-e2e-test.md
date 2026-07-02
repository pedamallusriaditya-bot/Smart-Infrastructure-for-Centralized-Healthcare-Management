---
name: fix-appointments-e2e-test
description: Fixed errors in appointments.e2e.test.ts
metadata:
  type: task
---

Fixed multiple issues in the appointments.e2e.test.ts file:

1. **Import statements**: 
   - Changed from relative paths with .js extensions to using the TypeScript path alias '@' (mapped to 'src/')
   - Removed file extensions to allow proper module resolution with NodeNext and ts-jest ESM setup
   - New imports:
     ```typescript
     import app from '@/app';
     import { prisma } from '@/lib/prisma';
     import { hashPassword } from '@/utils/password.util';
     ```

2. **Test logic fix** in "PATCH /appointments/:id/status as a DOCTOR not assigned to the appointment is forbidden":
   - Added validation of login response before accessing token: `expect(otherDoctorLogin.status).toBe(200);`
   - Changed expected status code from 500 to 403 (Forbidden) to match the test's intent and other similar tests
   - The corrected test now properly verifies that a doctor not assigned to an appointment receives a 403 Forbidden response when attempting to update the appointment status

These changes resolve both the TypeScript module resolution errors and the test logic issues, allowing the end-to-end tests to run correctly.