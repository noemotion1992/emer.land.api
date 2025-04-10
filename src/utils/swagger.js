const swaggerJsDoc = require("swagger-jsdoc");

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: "API-сервис проекта EMER.LAND.API",
            version: "1.0.0",
            description: "Документация проекта EMER.LAND.API",
        },
        servers: [{ url: "http://localhost:3000" }],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key'
                }
            }
        }
    },
    apis: ["./src/api/**/*.js"], // Путь к файлам с роутами
};

const specs = swaggerJsDoc(swaggerOptions);

module.exports = specs;