import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ZAP Scanner API',
            version: '1.0.0',
            description: 'API documentation for the Security Scanner application',
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'connect.sid',
                },
            },
        },
        security: [
            {
                cookieAuth: [],
            },
        ],
    },
    apis: ['./server/routes.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
