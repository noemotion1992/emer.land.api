const express = require("express");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const router = express.Router();

// Функция для динамической загрузки роутов с поддержкой вложенных директорий
const loadRoutes = (directory, baseRoute = '') => {
    try {
        // Получаем абсолютный путь к директории с роутами
        const routesDir = path.resolve(__dirname, directory);

        // Логируем путь и содержимое директории для отладки
        logger.info(`Загрузка роутов из директории: ${routesDir}`);

        const files = fs.readdirSync(routesDir);
        logger.info(`Найдены файлы: ${JSON.stringify(files)}`);

        files.forEach(file => {
            const fullPath = path.join(routesDir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                // Если это директория, рекурсивно загружаем роуты
                loadRoutes(fullPath, path.join(baseRoute, file));
            } else if (file.endsWith('.js') && file !== 'index.js') {
                try {
                    const routePath = path.basename(file, '.js');
                    const fullRoutePath = baseRoute ? `${baseRoute}/${routePath}` : routePath;

                    // Расширенное логирование для отладки
                    logger.info(`Попытка загрузки роута: ${fullPath}`);
                    logger.info(`Будет зарегистрирован как: /api/${fullRoutePath}`);

                    const routeModule = require(fullPath);

                    logger.info(`Регистрация роута: /api/${fullRoutePath}`);

                    router.use(`/${fullRoutePath}`, routeModule);
                } catch (routeError) {
                    logger.error(`Ошибка при загрузке роута ${file}: ${routeError.message}`);
                    logger.error(`Стек ошибки: ${routeError.stack}`);
                }
            }
        });
    } catch (error) {
        logger.error(`Ошибка при загрузке роутов: ${error.message}`);
        logger.error(`Стек ошибки: ${error.stack}`);
    }
};

// Загружаем роуты из поддиректорий
loadRoutes('.');

module.exports = router;