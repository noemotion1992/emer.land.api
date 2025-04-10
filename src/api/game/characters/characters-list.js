const express = require("express");
const logger = require("../../../utils/logger");
const charactersDb = require("../../../config/db/characters");

const router = express.Router();

/**
 * @swagger
 * /api/game/characters/list:
 *   get:
 *     summary: Получение списка персонажей
 *     description: Возвращает список персонажей с пагинацией и возможностью фильтрации
 *     tags:
 *       - Characters
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Успешный ответ со списком персонажей
 *       500:
 *         description: Ошибка сервера
 */
router.get("/", async (req, res) => {
    try {
        const {
            page,
            limit,
            char_name,
            // ... остальные параметры фильтрации
        } = req.query;

        const filters = {};
        // ... логика формирования фильтров

        const result = await charactersDb.getCharacters({
            page: parseInt(page || 1, 10),
            limit: parseInt(limit || 10, 10),
            filters,
            sortBy: req.query.sortBy || 'char_name',
            sortOrder: req.query.sortOrder || 'asc'
        });

        res.json(result);
    } catch (error) {
        logger.error("Ошибка при получении списка персонажей:", error);
        res.status(500).json({
            error: "Ошибка при получении списка персонажей",
            details: error.message
        });
    }
});

module.exports = router;