const express = require("express");
const passwordUtils = require("../../utils/passwordUtils");
const logger = require("../../utils/logger");
const accountsDb = require("../../config/db/accounts");
const { QueryTypes } = require("sequelize");
const databases = require("../../config/databases");

const router = express.Router();

// Существующие маршруты регистрации и смены пароля сохраняются здесь

/**
 * @swagger
 * /api/login/account/register:
 *   post:
 *     summary: Регистрация нового аккаунта
 *     description: Создает новый аккаунт пользователя в системе
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *                 description: Логин пользователя
 *                 minLength: 4
 *                 maxLength: 32
 *               password:
 *                 type: string
 *                 description: Пароль пользователя
 *                 minLength: 6
 *                 maxLength: 32
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email пользователя (опционально)
 *     responses:
 *       201:
 *         description: Аккаунт успешно создан
 *       400:
 *         description: Ошибка валидации данных
 *       409:
 *         description: Аккаунт с таким логином уже существует
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/register", async (req, res) => {
    try {
        const { login, password, email } = req.body;

        // Валидация входных данных
        if (!login || !password) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Логин и пароль обязательны для заполнения"
            });
        }

        // Проверка длины логина
        if (login.length < 4 || login.length > 32) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Длина логина должна быть от 4 до 32 символов"
            });
        }

        // Проверка длины пароля
        if (password.length < 6 || password.length > 32) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Длина пароля должна быть от 6 до 32 символов"
            });
        }

        // Проверка наличия аккаунта с таким логином
        const accountExists = await accountsDb.exists(login);

        if (accountExists) {
            return res.status(409).json({
                error: "Аккаунт с таким логином уже существует"
            });
        }

        // Используем метод хеширования по умолчанию для вашего сервера L2 (sha1)
        const hashedPassword = passwordUtils.defaultHash(password);
        logger.debug(`Сгенерирован хеш для пароля: ${hashedPassword}`);

        // Создание аккаунта с установкой accessLevel = 0 и без lastactive
        await accountsDb.create(login, hashedPassword, email);

        // Возвращаем успешный ответ
        res.status(201).json({
            success: true,
            message: "Аккаунт успешно создан"
        });
    } catch (error) {
        logger.error("Ошибка при создании аккаунта:", error);
        res.status(500).json({
            error: "Ошибка при создании аккаунта",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/change-password:
 *   put:
 *     summary: Изменение пароля аккаунта
 *     description: Изменяет пароль пользователя (не требует текущего пароля)
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - newPassword
 *             properties:
 *               login:
 *                 type: string
 *                 description: Логин пользователя
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль пользователя
 *                 minLength: 6
 *                 maxLength: 32
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
 *       400:
 *         description: Ошибка валидации данных
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.put("/change-password", async (req, res) => {
    try {
        const { login, newPassword } = req.body;
        logger.debug(`Запрос на смену пароля для аккаунта: ${login}`);

        // Валидация входных данных
        if (!login || !newPassword) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Логин и новый пароль обязательны для заполнения"
            });
        }

        // Проверка длины нового пароля
        if (newPassword.length < 6 || newPassword.length > 32) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Длина нового пароля должна быть от 6 до 32 символов"
            });
        }

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(login);
        logger.debug(`Результат проверки существования аккаунта ${login}: ${accountExists}`);

        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Хешируем новый пароль
        const hashedNewPassword = passwordUtils.defaultHash(newPassword);
        logger.debug(`Сгенерирован новый хеш для пароля: ${hashedNewPassword}`);

        // Обновляем только пароль, без изменения других полей
        await accountsDb.update(login, {
            password: hashedNewPassword
        });

        logger.info(`Изменен пароль для аккаунта: ${login}`);

        // Возвращаем успешный ответ
        res.status(200).json({
            success: true,
            message: "Пароль успешно изменен"
        });
    } catch (error) {
        logger.error("Ошибка при изменении пароля:", error);
        res.status(500).json({
            error: "Ошибка при изменении пароля",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/list:
 *   get:
 *     summary: Получение списка аккаунтов
 *     description: Возвращает список аккаунтов с пагинацией и возможностью фильтрации
 *     tags:
 *       - Account
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
 *         name: login
 *         schema:
 *           type: string
 *         description: Фильтр по логину (частичное совпадение)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Фильтр по email (частичное совпадение)
 *       - in: query
 *         name: lastIP
 *         schema:
 *           type: string
 *         description: Фильтр по последнему IP (частичное совпадение)
 *       - in: query
 *         name: lastHWID
 *         schema:
 *           type: string
 *         description: Фильтр по последнему HWID (частичное совпадение)
 *       - in: query
 *         name: lastServerId
 *         schema:
 *           type: integer
 *         description: Фильтр по ID последнего сервера
 *       - in: query
 *         name: accessLevel
 *         schema:
 *           type: integer
 *         description: Фильтр по уровню доступа
 *       - in: query
 *         name: lastActiveFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате последней активности (от)
 *       - in: query
 *         name: lastActiveTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате последней активности (до)
 *       - in: query
 *         name: isBanned
 *         schema:
 *           type: boolean
 *         description: Фильтр по бану (true - только забаненные)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [login, lastactive, accessLevel, lastIP, lastHWID, lastServerId, ban_expire]
 *           default: login
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
 *         description: Успешный ответ со списком аккаунтов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       login:
 *                         type: string
 *                       accessLevel:
 *                         type: integer
 *                       lastactive:
 *                         type: integer
 *                       lastactiveDate:
 *                         type: string
 *                         format: date-time
 *                       lastIP:
 *                         type: string
 *                       lastHWID:
 *                         type: string
 *                       lastServerId:
 *                         type: integer
 *                       ban_expire:
 *                         type: integer
 *                       isBanned:
 *                         type: boolean
 *                       banExpireDate:
 *                         type: string
 *                         format: date-time
 *                       email:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Общее количество аккаунтов
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
            login,
            email,
            lastIP,
            lastHWID,
            lastServerId,
            accessLevel,
            lastActiveFrom,
            lastActiveTo,
            isBanned,
            sortBy,
            sortOrder
        } = req.query;

        // Формируем объект с фильтрами
        const filters = {};
        if (login) filters.login = login;
        if (email) filters.email = email;
        if (lastIP) filters.lastIP = lastIP;
        if (lastHWID) filters.lastHWID = lastHWID;
        if (lastServerId) filters.lastServerId = lastServerId;
        if (accessLevel !== undefined) filters.accessLevel = accessLevel;
        if (lastActiveFrom) filters.lastActiveFrom = lastActiveFrom;
        if (lastActiveTo) filters.lastActiveTo = lastActiveTo;
        if (isBanned === 'true') filters.isBanned = true;

        // Получаем данные
        const result = await accountsDb.getAccounts({
            page: parseInt(page || 1, 10),
            limit: parseInt(limit || 10, 10),
            filters,
            sortBy: sortBy || 'login',
            sortOrder: sortOrder || 'asc'
        });

        res.json(result);
    } catch (error) {
        logger.error("Ошибка при получении списка аккаунтов:", error);
        res.status(500).json({
            error: "Ошибка при получении списка аккаунтов",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/{login}/history:
 *   get:
 *     summary: Получение истории входов аккаунта
 *     description: Возвращает историю входов для указанного аккаунта
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         schema:
 *           type: string
 *         description: Логин аккаунта
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
 *     responses:
 *       200:
 *         description: Успешный ответ с историей входов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 login:
 *                   type: string
 *                 loginHistory:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       time:
 *                         type: integer
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       lastServerId:
 *                         type: integer
 *                       ip:
 *                         type: string
 *                       hwid:
 *                         type: string
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
router.get("/:login/history", async (req, res) => {
    try {
        const { login } = req.params;
        const { page, limit } = req.query;

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(login);

        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Получаем историю входов
        const result = await accountsDb.getAccountLoginHistory(login, {
            page: parseInt(page || 1, 10),
            limit: parseInt(limit || 10, 10)
        });

        res.json(result);
    } catch (error) {
        logger.error(`Ошибка при получении истории входов аккаунта:`, error);
        res.status(500).json({
            error: "Ошибка при получении истории входов аккаунта",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/{login}:
 *   get:
 *     summary: Получение информации об аккаунте
 *     description: Возвращает детальную информацию о конкретном аккаунте
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         schema:
 *           type: string
 *         description: Логин аккаунта
 *     responses:
 *       200:
 *         description: Успешный ответ с информацией об аккаунте
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 login:
 *                   type: string
 *                 accessLevel:
 *                   type: integer
 *                 lastactive:
 *                   type: integer
 *                 lastactiveDate:
 *                   type: string
 *                   format: date-time
 *                 lastIP:
 *                   type: string
 *                 lastHWID:
 *                   type: string
 *                 lastServerId:
 *                   type: integer
 *                 email:
 *                   type: string
 *                 isBanned:
 *                   type: boolean
 *                 banExpireDate:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.get("/:login", async (req, res) => {
    try {
        const { login } = req.params;

        // Загружаем информацию об аккаунте
        const account = await accountsDb.load(login);

        if (!account) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Получаем дополнительную информацию из таблицы accounts
        const [accountDetails] = await databases.login.query(
            "SELECT ban_expire FROM accounts WHERE login = ?",
            {
                replacements: [login],
                type: QueryTypes.SELECT
            }
        );

        const now = Math.floor(Date.now() / 1000);
        const isBanned = accountDetails && accountDetails.ban_expire > now;
        const banExpireDate = isBanned
            ? new Date(accountDetails.ban_expire * 1000).toISOString()
            : null;

        // Добавляем вычисляемые поля
        const accountInfo = {
            login,
            ...account,
            lastactiveDate: account.lastactive
                ? new Date(account.lastactive * 1000).toISOString()
                : null,
            isBanned,
            banExpireDate
        };

        res.json(accountInfo);
    } catch (error) {
        logger.error(`Ошибка при получении информации об аккаунте:`, error);
        res.status(500).json({
            error: "Ошибка при получении информации об аккаунте",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/{login}:
 *   delete:
 *     summary: Удаление аккаунта
 *     description: Удаляет указанный аккаунт из системы
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         schema:
 *           type: string
 *         description: Логин удаляемого аккаунта
 *     responses:
 *       200:
 *         description: Аккаунт успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Аккаунт успешно удален
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.delete("/:login", async (req, res) => {
    try {
        const { login } = req.params;

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(login);

        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Удаляем аккаунт
        await databases.login.query(
            "DELETE FROM accounts WHERE login = ?",
            {
                replacements: [login]
            }
        );

        // Также удаляем историю входов для этого аккаунта
        await databases.login.query(
            "DELETE FROM account_log WHERE login = ?",
            {
                replacements: [login]
            }
        );

        logger.info(`Аккаунт ${login} успешно удален`);

        res.json({
            success: true,
            message: "Аккаунт успешно удален"
        });
    } catch (error) {
        logger.error(`Ошибка при удалении аккаунта:`, error);
        res.status(500).json({
            error: "Ошибка при удалении аккаунта",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/{login}/ban:
 *   post:
 *     summary: Бан аккаунта
 *     description: Устанавливает бан аккаунта до указанной даты
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         schema:
 *           type: string
 *         description: Логин аккаунта
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - banExpire
 *             properties:
 *               banExpire:
 *                 type: string
 *                 format: date-time
 *                 description: Дата окончания бана
 *               reason:
 *                 type: string
 *                 description: Причина бана (опционально)
 *     responses:
 *       200:
 *         description: Аккаунт успешно забанен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Аккаунт успешно забанен
 *       400:
 *         description: Ошибка валидации данных
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/:login/ban", async (req, res) => {
    try {
        const { login } = req.params;
        const { banExpire, reason } = req.body;

        // Проверяем наличие параметра banExpire
        if (!banExpire) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Дата окончания бана обязательна для заполнения"
            });
        }

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(login);

        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Преобразуем дату в Unix timestamp
        const banExpireTimestamp = Math.floor(new Date(banExpire).getTime() / 1000);

        // Проверяем, что дата бана в будущем
        const now = Math.floor(Date.now() / 1000);
        if (banExpireTimestamp <= now) {
            return res.status(400).json({
                error: "Неверный формат данных",
                details: "Дата окончания бана должна быть в будущем"
            });
        }

        // Устанавливаем бан
        await databases.login.query(
            "UPDATE accounts SET ban_expire = ? WHERE login = ?",
            {
                replacements: [banExpireTimestamp, login]
            }
        );

        // Логируем бан
        logger.info(`Аккаунт ${login} забанен до ${new Date(banExpireTimestamp * 1000).toISOString()}${reason ? ` по причине: ${reason}` : ''}`);

        res.json({
            success: true,
            message: "Аккаунт успешно забанен",
            banExpireDate: new Date(banExpireTimestamp * 1000).toISOString()
        });
    } catch (error) {
        logger.error(`Ошибка при бане аккаунта:`, error);
        res.status(500).json({
            error: "Ошибка при бане аккаунта",
            details: error.message
        });
    }
});

/**
 * @swagger
 * /api/login/account/{login}/unban:
 *   post:
 *     summary: Разбан аккаунта
 *     description: Снимает бан с аккаунта
 *     tags:
 *       - Account
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: login
 *         required: true
 *         schema:
 *           type: string
 *         description: Логин аккаунта
 *     responses:
 *       200:
 *         description: Бан успешно снят
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Бан успешно снят
 *       404:
 *         description: Аккаунт не найден
 *       500:
 *         description: Внутренняя ошибка сервера
 */
router.post("/:login/unban", async (req, res) => {
    try {
        const { login } = req.params;

        // Проверяем существование аккаунта
        const accountExists = await accountsDb.exists(login);

        if (!accountExists) {
            return res.status(404).json({
                error: "Аккаунт не найден"
            });
        }

        // Снимаем бан
        await databases.login.query(
            "UPDATE accounts SET ban_expire = 0 WHERE login = ?",
            {
                replacements: [login]
            }
        );

        logger.info(`Снят бан с аккаунта ${login}`);

        res.json({
            success: true,
            message: "Бан успешно снят"
        });
    } catch (error) {
        logger.error(`Ошибка при снятии бана:`, error);
        res.status(500).json({
            error: "Ошибка при снятии бана",
            details: error.message
        });
    }
});

module.exports = router;