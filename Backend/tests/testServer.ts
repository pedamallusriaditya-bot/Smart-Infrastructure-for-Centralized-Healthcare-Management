import request from 'supertest';
import app from '../src/app.js';

/**
 * Shared Supertest instance.
 *
 * Example:
 * const res = await api.get('/health');
 */
const api = request(app);

export default api;
export { api };