const express = require("express");
const logger = require("../../../utils/logger");
const charactersDb = require("../../../config/db/characters");

const router = express.Router();

/**
 * @swagger
 * /api/game/characters/{charId}:
 *   get:
 *     summary: Получение информации о персонаже по ID
 *     description: Возвращает детальную информацию о конкретном персонаже по его ID
 *     tags:
 *       - Characters
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: charId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешный ответ с информацией о персонаже
 *       400:
 *         description: Некорректный ID персонажа
 *       404:
 *         description: Персонаж не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get("/:charId", async (req, res) => {
    try {
        const { charId } = req.params;
        const objId = parseInt(charId, 10);

        // Проверка корректности ID
        if (isNaN(objId)) {
            return res.status(400).json({
                error: "Неверный формат ID персонажа",
                details: "ID персонажа должен быть числом"
            });
        }

        // Загружаем информацию о персонаже
        const character = await charactersDb.loadById(objId);

        if (!character) {
            return res.status(404).json({
                error: "Персонаж не найден"
            });
        }

        res.json(character);
    } catch (error) {
        logger.error(`Ошибка при получении информации о персонаже:`, error);
        res.status(500).json({
            error: "Ошибка при получении информации о персонаже",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/game/characters/{charName}/exists:
 *   get:
 *     summary: Проверка существования персонажа
 *     description: Проверяет, существует ли персонаж с указанным именем
 *     tags:
 *       - Characters
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: charName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Результат проверки существования персонажа
 *       500:
 *         description: Ошибка сервера
 */
router.get("/:charName/exists", async (req, res) => {
    try {
        const { charName } = req.params;

        // Проверка существования персонажа
        const exists = await charactersDb.exists(charName);

        res.json({ exists });
    } catch (error) {
        logger.error(`Ошибка при проверке существования персонажа:`, error);
        res.status(500).json({
            error: "Ошибка при проверке существования персонажа",
            details: error.message
        });
    }
});

module.exports = router;