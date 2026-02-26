import type { FastifyInstance } from 'fastify';
import { invitationEmailRuntime } from '../../data/services/email/invitationEmailRuntime.js';

export const registerObservabilityRoutes = (fastify: FastifyInstance) => {
  // GET /v1/observability/invitations/email-metrics - Get email metrics
  fastify.get(
    '/v1/observability/invitations/email-metrics',
    {
      schema: {
        tags: ['Observability'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['success'] },
              data: {
                type: 'object',
                properties: {
                  queued: { type: 'number' },
                  sent: { type: 'number' },
                  failed: { type: 'number' },
                  retries: { type: 'number' },
                  deadLetter: { type: 'number' },
                },
                required: ['queued', 'sent', 'failed', 'retries', 'deadLetter'],
              },
            },
            required: ['status', 'data'],
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        status: 'success',
        data: invitationEmailRuntime.metrics.snapshot(),
      });
    },
  );
};
