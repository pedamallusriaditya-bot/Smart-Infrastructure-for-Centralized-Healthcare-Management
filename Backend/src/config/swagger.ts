// backend/src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Platform API',
      version: '1.0.0',
      description: 'API documentation for the AI Healthcare Management Platform',
    },
    // Add this inside the 'definition' object in backend/src/config/swagger.ts
components: {
  schemas: {
    CreateAppointment: {
      type: 'object',
      required: ['doctorId', 'appointmentDate', 'reason'],
      properties: {
        doctorId: { type: 'string', format: 'uuid' },
        appointmentDate: { type: 'string', format: 'date-time' },
        reason: { type: 'string' }
      }
    }
  }
},
    servers: [{ url: 'http://localhost:3000/api' }],
  },
  // This tells Swagger where to find your documented routes
  apis: ['./src/routes/*.ts'], 
};



export const swaggerSpec = swaggerJsdoc(options);