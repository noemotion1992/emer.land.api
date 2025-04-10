const express = require("express");
const logger = require("../../../utils/logger");
const charactersDb = require("../../../config/db/characters");
const accountsDb = require("../../../config/db/accounts");

const router = express.Router();

/**
 * @swagger
 * /api/game/characters/account/{accountName}:
 *   get:
 *     summary: Получение списка персонажей аккаунта
 *     description: Возвращает список персонажей, принадлежащих указанному аккаунту
 *     tags:
 *       - Characters
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: accountName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешный ответ со списком персонажей
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Ошибка сервера
 */
router.get("/:accountName", async (req, res) => {
    try {
        const { accountName } = req.params;
        const { page, limit, includDeleted } = req.query;

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(accountName);
        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Получаем список персонажей
        const result = await charactersDb.getAccountCharacters(accountName, {
            page: parseInt(page || 1, 10),
            limit: parseInt(limit || 10, 10),
            includDeleted: includDeleted === 'true'
        });

        res.json(result);
    } catch (error) {
        logger.error(`Ошибка при получении персонажей аккаунта:`, error);
        res.status(500).json({
            error: "Ошибка при получении персонажей аккаунта",
            details: error.message
        });
    }
});

module.exports = router;