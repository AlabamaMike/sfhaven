const request = require('supertest');
const app = require('./server');

describe('SF Haven API', () => {
  describe('Health Check', () => {
    it('should return 200 and status ok', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Authentication', () => {
    it('should create anonymous user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/anonymous');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('anonymous_id');
      expect(response.body).toHaveProperty('access_token');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/v1/unknown');
      expect(response.status).toBe(404);
    });
  });
});
