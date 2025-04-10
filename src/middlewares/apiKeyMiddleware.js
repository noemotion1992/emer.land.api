const logger = require("../utils/logger");
require("dotenv").config();

const apiKeyMiddleware = (req, res, next) => {
    const apiKeyHeader = process.env.API_KEY_HEADER || 'X-API-Key';
    const expectedApiKey = process.env.API_KEY;

    // Получаем API-ключ из заголовка
    const providedApiKey = req.get(apiKeyHeader);

    // Проверяем наличие и соответствие API-ключа
    if (!providedApiKey || providedApiKey !== expectedApiKey) {
        logger.warn(`Неудачная попытка доступа к API. Предоставленный ключ: ${providedApiKey}`);
        return res.status(401).json({
            error: 'Неавторизованный доступ',
            message: 'Требуется действительный API-ключ'
        });
    }

    // Если ключ верен, пропускаем запрос далее
    next();
};

module.exports = apiKeyMiddleware;