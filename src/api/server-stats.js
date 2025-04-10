const express = require("express");
const os = require("os");
const v8 = require("v8");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * @swagger
 * /api/server-stats:
 *   get:
 *     summary: Получение статистики сервера
 *     description: Возвращает подробную информацию о текущем состоянии сервера, включая использование памяти, CPU и системные параметры
 *     tags:
 *       - Server
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Успешный ответ со статистикой сервера
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 memory:
 *                   type: object
 *                   description: Статистика использования памяти
 *                   properties:
 *                     rss:
 *                       type: string
 *                       description: Резидентный размер Set
 *                     heapTotal:
 *                       type: string
 *                       description: Общий размер кучи V8
 *                     heapUsed:
 *                       type: string
 *                       description: Использованный размер кучи
 *                 cpu:
 *                   type: object
 *                   description: Информация о процессоре
 *                   properties:
 *                     model:
 *                       type: string
 *                       description: Модель процессора
 *                     cores:
 *                       type: number
 *                       description: Количество ядер
 *                     speed:
 *                       type: string
 *                       description: Частота процессора
 *                 system:
 *                   type: object
 *                   description: Информация о системе
 *                   properties:
 *                     platform:
 *                       type: string
 *                       description: Операционная система
 *                     arch:
 *                       type: string
 *                       description: Архитектура системы
 *                     uptime:
 *                       type: string
 *                       description: Время работы системы
 *                     hostname:
 *                       type: string
 *                       description: Имя хоста
 *                 process:
 *                   type: object
 *                   description: Информация о Node.js процессе
 *                   properties:
 *                     pid:
 *                       type: number
 *                       description: Process ID
 *                     version:
 *                       type: string
 *                       description: Версия Node.js
 *                     uptime:
 *                       type: string
 *                       description: Время работы процесса
 *       401:
 *         description: Неавторизованный доступ (отсутствует или неверный API-ключ)
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get("/", (req, res) => {
    try {
        // Статистика использования памяти
        const memoryUsage = process.memoryUsage();

        // Статистика ЦПУ
        const cpus = os.cpus();

        // Информация о системе
        const serverStats = {
            // Использование памяти
            memory: {
                rss: formatBytes(memoryUsage.rss),                    // Резидентный размер Set
                heapTotal: formatBytes(memoryUsage.heapTotal),        // Общий размер кучи V8
                heapUsed: formatBytes(memoryUsage.heapUsed),          // Использованный размер кучи
                external: formatBytes(memoryUsage.external),          // Память, используемая C++ объектами
                v8Total: formatBytes(v8.getHeapStatistics().total_heap_size),
                v8Used: formatBytes(v8.getHeapStatistics().used_heap_size)
            },

            // Информация о ЦПУ
            cpu: {
                model: cpus[0].model,
                cores: cpus.length,
                speed: cpus[0].speed + " MHz"
            },

            // Информация о системе
            system: {
                platform: os.platform(),
                arch: os.arch(),
                uptime: formatUptime(os.uptime()),
                hostname: os.hostname()
            },

            // Информация о процессе
            process: {
                pid: process.pid,
                version: process.version,
                uptime: formatUptime(process.uptime())
            }
        };

        res.json(serverStats);
    } catch (error) {
        logger.error("Ошибка при получении статистики сервера:", error);
        res.status(500).json({
            error: "Не удалось получить статистику сервера",
            details: error.message
        });
    }
});

// Вспомогательная функция для форматирования байт
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Вспомогательная функция для форматирования времени работы
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router;