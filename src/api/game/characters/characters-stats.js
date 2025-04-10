const express = require("express");
const logger = require("../../../utils/logger");
const charactersDb = require("../../../config/db/characters");

const router = express.Router();

/**
 * @swagger
 * /api/game/characters/stats:
 *   get:
 *     summary: Получение статистики персонажей
 *     description: Возвращает агрегированную статистику по персонажам
 *     tags:
 *       - Characters
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [total, online, by_class, by_clan, by_level]
 *     responses:
 *       200:
 *         description: Успешный ответ со статистикой персонажей
 *       500:
 *         description: Ошибка сервера
 */
router.get("/", async (req, res) => {
    try {
        const { type } = req.query;

        // Получаем статистику в зависимости от запрошенного типа
        let stats;
        switch (type) {
            case 'total':
                stats = await charactersDb.getTotalStats();
                break;
            case 'online':
                stats = await charactersDb.getOnlineStats();
                break;
            case 'by_class':
                stats = await charactersDb.getCharactersByClass();
                break;
            case 'by_clan':
                stats = await charactersDb.getCharactersByClan();
                break;
            case 'by_level':
                stats = await charactersDb.getCharactersByLevel();
                break;
            default:
                // Если тип не указан, возвращаем общую статистику
                stats = await charactersDb.getTotalStats();
        }

        res.json(stats);
    } catch (error) {
        logger.error(`Ошибка при получении статистики персонажей:`, error);
        res.status(500).json({
            error: "Ошибка при получении статистики персонажей",
            details: error.message
        });
    }
});

module.exports = router;