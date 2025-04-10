const { createLogger, format, transports } = require("winston");
require("dotenv").config(); // Загружаем переменные окружения из .env

// Чтение переменных окружения
const logLevel = process.env.LOG_LEVEL || "debug"; // Уровень логирования по умолчанию debug
const logFile = process.env.LOG_FILE || "logs/api.log"; // Файл для логов по умолчанию logs/api.log

// Определяем цвета для уровней логов
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Инициализируем цветовую схему
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
};

// Форматирование логов (timestamp + цвет)
const customFormat = format.combine(
    format.colorize({ all: true }), // Цвет добавляется ко всему сообщению
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message }) => {
        return `[${timestamp}] [${level}]: ${message}`;
    })
);

// Создаем Winston логгер
const logger = createLogger({
    levels,
    level: logLevel, // Уровень логирования из .env
    format: customFormat, // Цветное форматирование
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] [${level}]: ${message}`;
                })
            )
        }), // Вывод в консоль с цветами
        new transports.File({
            filename: logFile,
            format: format.combine(
                format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                format.printf(({ timestamp, level, message }) => {
                    return `[${timestamp}] [${level}]: ${message}`;
                })
            )
        }), // Логи в файле (по пути из .env)
    ],
});

// Регистрируем цветовую схему для всех уровней
require("winston").addColors(colors);

module.exports = logger;