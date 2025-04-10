const logger = require("./utils/logger"); // Исправлен путь к модулю
const app = require("./app");
require("dotenv").config(); // Подключаем переменные окружения

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    logger.info(`API-сервер запущен: http://localhost:${PORT}`);
    logger.debug(`Режим отладки активирован`);
    logger.warn(`Предупреждение: проверка конфигурации`);
    logger.error(`Тестовое сообщение об ошибке`);
});