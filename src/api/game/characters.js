const express = require("express");
const logger = require("../../utils/logger");
const charactersDb = require("../../config/db/characters");
const accountsDb = require("../../config/db/accounts");

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
 *         description: Имя аккаунта
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Количество записей на странице
 *       - in: query
 *         name: includDeleted
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Включать ли удаленных персонажей
 *     responses:
 *       200:
 *         description: Список персонажей аккаунта
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountName:
 *                   type: string
 *                 characters:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       obj_Id:
 *                         type: integer
 *                       char_name:
 *                         type: string
 *                       sex:
 *                         type: integer
 *                       gender:
 *                         type: string
 *                       createDate:
 *                         type: string
 *                         format: date-time
 *                       deleteDate:
 *                         type: string
 *                         format: date-time
 *                       lastAccessDate:
 *                         type: string
 *                       isOnline:
 *                         type: boolean
 *                       onlineTimeHours:
 *                         type: integer
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get("/account/:accountName", async (req, res) => {
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
*         description: Номер страницы
*       - in: query
*         name: limit
*         schema:
*           type: integer
*           default: 10
*         description: Количество записей на странице
*       - in: query
*         name: char_name
*         schema:
*           type: string
*         description: Фильтр по имени персонажа (частичное совпадение)
*       - in: query
*         name: account_name
*         schema:
*           type: string
*         description: Фильтр по имени аккаунта (частичное совпадение)
*       - in: query
*         name: clanid
*         schema:
*           type: integer
*         description: Фильтр по ID клана
*       - in: query
*         name: online
*         schema:
*           type: boolean
*         description: Фильтр по онлайн-статусу (true - только онлайн)
*       - in: query
*         name: minLevel
*         schema:
*           type: integer
*         description: Минимальный уровень персонажа
*       - in: query
*         name: maxLevel
*         schema:
*           type: integer
*         description: Максимальный уровень персонажа
*       - in: query
*         name: createdAfter
*         schema:
*           type: string
*           format: date
*         description: Фильтр по дате создания (от)
*       - in: query
*         name: createdBefore
*         schema:
*           type: string
*           format: date
*         description: Фильтр по дате создания (до)
*       - in: query
*         name: lastAccessAfter
*         schema:
*           type: string
*           format: date
*         description: Фильтр по дате последнего входа (от)
*       - in: query
*         name: lastAccessBefore
*         schema:
*           type: string
*           format: date
*         description: Фильтр по дате последнего входа (до)
*       - in: query
*         name: sex
*         schema:
*           type: integer
*           enum: [0, 1]
*         description: Фильтр по полу (0 - женский, 1 - мужской)
*       - in: query
*         name: deletedOnly
*         schema:
*           type: boolean
*         description: Только удаленные персонажи (true - показывать только удаленных)
*       - in: query
*         name: sortBy
*         schema:
*           type: string
*           enum: [char_name, account_name, createtime, lastAccess, online, clanid, pvpkills, pkkills, karma, onlinetime]
*           default: char_name
*         description: Поле для сортировки
*       - in: query
*         name: sortOrder
*         schema:
*           type: string
*           enum: [asc, desc]
*           default: asc
*         description: Порядок сортировки
*     responses:
*       200:
*         description: Успешный ответ со списком персонажей
*         content:
*           application/json:
*             schema:
    *               type: object
*               properties:
*                 characters:
    *                   type: array
*                   items:
*                     type: object
*                     properties:
*                       obj_Id:
    *                         type: integer
*                       char_name:
*                         type: string
*                       account_name:
*                         type: string
*                       sex:
*                         type: integer
*                       gender:
*                         type: string
*                         enum: [male, female]
*                       createtime:
*                         type: integer
*                       createDate:
*                         type: string
*                         format: date-time
*                       lastAccess:
*                         type: integer
*                       lastAccessDate:
*                         type: string
*                         format: date-time
*                       online:
*                         type: integer
*                       isOnline:
*                         type: boolean
*                       onlinetime:
*                         type: integer
*                       onlineTimeHours:
*                         type: integer
*                       clanid:
*                         type: integer
*                       title:
*                         type: string
*                       pvpkills:
*                         type: integer
*                       pkkills:
*                         type: integer
*                       karma:
*                         type: integer
*                       x:
*                         type: integer
*                       y:
*                         type: integer
*                       z:
*                         type: integer
*                 pagination:
*                   type: object
*                   properties:
*                     total:
    *                       type: integer
*                       description: Общее количество персонажей
*                     page:
*                       type: integer
*                       description: Текущая страница
*                     limit:
*                       type: integer
*                       description: Количество записей на странице
*                     totalPages:
*                       type: integer
*                       description: Общее количество страниц
*       500:
*         description: Внутренняя ошибка сервера
*/
router.get("/list", async (req, res) => {
    try {
        // Получаем параметры запроса
        const {
            page,
            limit,
            char_name,
            account_name,
            clanid,
            online,
            minLevel,
            maxLevel,
            createdAfter,
            createdBefore,
            lastAccessAfter,
            lastAccessBefore,
            sex,
            deletedOnly,
            sortBy,
            sortOrder
        } = req.query;

        // Формируем объект с фильтрами
        const filters = {};
        if (char_name) filters.char_name = char_name;
        if (account_name) filters.account_name = account_name;
        if (clanid) filters.clanid = clanid;
        if (online !== undefined) filters.online = online;
        if (minLevel) filters.minLevel = minLevel;
        if (maxLevel) filters.maxLevel = maxLevel;
        if (createdAfter) filters.createdAfter = createdAfter;
        if (createdBefore) filters.createdBefore = createdBefore;
        if (lastAccessAfter) filters.lastAccessAfter = lastAccessAfter;
        if (lastAccessBefore) filters.lastAccessBefore = lastAccessBefore;
        if (sex !== undefined) filters.sex = sex;
        if (deletedOnly === 'true') filters.deletedOnly = 'true';

        // Получаем данные
        const result = await charactersDb.getCharacters({
            page: parseInt(page || 1, 10),
            limit: parseInt(limit || 10, 10),
            filters,
            sortBy: sortBy || 'char_name',
            sortOrder: sortOrder || 'asc'
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
 *           type: integer
 *         description: ID персонажа (obj_Id)
 *     responses:
 *       200:
 *         description: Успешный ответ с информацией о персонаже
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 obj_Id:
 *                   type: integer
 *                 char_name:
 *                   type: string
 *                 account_name:
 *                   type: string
 *                 face:
 *                   type: integer
 *                 hairStyle:
 *                   type: integer
 *                 hairColor:
 *                   type: integer
 *                 sex:
 *                   type: integer
 *                 gender:
 *                   type: string
 *                   enum: [male, female]
 *                 heading:
 *                   type: integer
 *                 x:
 *                   type: integer
 *                 y:
 *                   type: integer
 *                 z:
 *                   type: integer
 *                 karma:
 *                   type: integer
 *                 pvpkills:
 *                   type: integer
 *                 pkkills:
 *                   type: integer
 *                 clanid:
 *                   type: integer
 *                 createtime:
 *                   type: integer
 *                 createDate:
 *                   type: string
 *                   format: date-time
 *                 deletetime:
 *                   type: integer
 *                 deleteDate:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *                 title:
 *                   type: string
 *                 accesslevel:
 *                   type: integer
 *                 online:
 *                   type: integer
 *                 isOnline:
 *                   type: boolean
 *                 onlinetime:
 *                   type: integer
 *                 onlineTimeHours:
 *                   type: integer
 *                 lastAccess:
 *                   type: integer
 *                 lastAccessDate:
 *                   type: string
 *                   format: date-time
 *                 leaveclan:
 *                   type: integer
 *                 deleteclan:
 *                   type: integer
 *                 pledge_type:
 *                   type: integer
 *                 pledge_rank:
 *                   type: integer
 *       404:
 *         description: Персонаж не найден
 *       500:
 *         description: Внутренняя ошибка сервера
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
 *         description: Имя персонажа для проверки
 *     responses:
 *       200:
 *         description: Результат проверки существования персонажа
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Признак существования персонажа
 *       500:
 *         description: Внутренняя ошибка сервера
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
 *         description: Тип статистики
 *     responses:
 *       200:
 *         description: Статистика персонажей
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: integer
 *                   description: Общее количество персонажей
 *                 active:
 *                   type: integer
 *                   description: Количество активных персонажей
 *                 online:
 *                   type: integer
 *                   description: Количество онлайн персонажей
 *                 byClass:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       class:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 byLevel:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       levelRange:
 *                         type: string
 *                       count:
 *                         type: integer
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get("/stats", async (req, res) => {
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

// Экспортируем маршрутизатор
module.exports = router;