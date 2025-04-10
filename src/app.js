const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocs = require("./utils/swagger");
const apiRoutes = require("./api");
const logger = require("./utils/logger");
const morgan = require("morgan");
const apiKeyMiddleware = require("./middlewares/apiKeyMiddleware");

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP логирование через Morgan
app.use(
    morgan("combined", {
        stream: {
            write: (message) => logger.info(message.trim()), // Записываем HTTP-запросы в логи
        },
    })
);

// Swagger документация
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Middleware для проверки API-ключа (можно закомментировать для локальной разработки)
app.use('/api', apiKeyMiddleware);

// Роуты API
app.use("/api", apiRoutes);

// Логируем тестовый статус-маршрут
app.get("/status", (req, res) => {
    logger.info("Endpoint /status был вызван");
    res.json({ status: "API работает отлично!" });
});

// Экспорт приложения
module.exports = app;