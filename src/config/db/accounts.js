const databases = require("../databases");
const logger = require("../../utils/logger");
const { QueryTypes, Op } = require("sequelize");

// Получаем подключение к базе данных логинов
const loginDb = databases.login;

/**
 * Преобразует значение временной метки в формат для фильтрации
 * @param {string|number} value - Значение временной метки
 * @returns {number|null} - Временная метка в Unix формате или null
 */
const parseTimestamp = (value) => {
    if (!value) return null;

    // Если это строка в формате даты (например, "2023-04-09")
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return Math.floor(new Date(value).getTime() / 1000);
    }

    // Если это число или строка, содержащая число
    const timestamp = parseInt(value, 10);
    return isNaN(timestamp) ? null : timestamp;
};

/**
 * Построение условий WHERE для фильтрации аккаунтов
 * @param {Object} filters - Объект с фильтрами
 * @returns {Object} - Объект с SQL условиями и параметрами
 */
const buildWhereClause = (filters) => {
    let whereClause = "";
    const params = [];

    if (filters.login) {
        whereClause += (whereClause ? " AND " : "") + "`login` LIKE ?";
        params.push(`%${filters.login}%`);
    }

    if (filters.email) {
        whereClause += (whereClause ? " AND " : "") + "`l2email` LIKE ?";
        params.push(`%${filters.email}%`);
    }

    if (filters.lastIP) {
        whereClause += (whereClause ? " AND " : "") + "`lastIP` LIKE ?";
        params.push(`%${filters.lastIP}%`);
    }

    if (filters.lastHWID) {
        whereClause += (whereClause ? " AND " : "") + "`lastHWID` LIKE ?";
        params.push(`%${filters.lastHWID}%`);
    }

    if (filters.lastServerId) {
        whereClause += (whereClause ? " AND " : "") + "`lastServerId` = ?";
        params.push(parseInt(filters.lastServerId, 10));
    }

    if (filters.accessLevel !== undefined) {
        whereClause += (whereClause ? " AND " : "") + "`accessLevel` = ?";
        params.push(parseInt(filters.accessLevel, 10));
    }

    if (filters.lastActiveFrom) {
        const timestamp = parseTimestamp(filters.lastActiveFrom);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`lastactive` >= ?";
            params.push(timestamp);
        }
    }

    if (filters.lastActiveTo) {
        const timestamp = parseTimestamp(filters.lastActiveTo);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`lastactive` <= ?";
            params.push(timestamp);
        }
    }

    if (filters.isBanned) {
        const now = Math.floor(Date.now() / 1000);
        whereClause += (whereClause ? " AND " : "") + "`ban_expire` > ?";
        params.push(now);
    }

    return {
        whereClause: whereClause ? `WHERE ${whereClause}` : "",
        params
    };
};

/**
 * Модуль для работы с таблицей accounts
 */
const accountsDb = {
    /**
     * Проверяет существование аккаунта с указанным логином
     * @param {string} login - Логин для проверки
     * @returns {Promise<boolean>} true, если аккаунт существует
     */
    async exists(login) {
        try {
            logger.debug(`Проверка существования аккаунта: ${login}`);

            const [results] = await loginDb.query(
                "SELECT COUNT(*) as count FROM accounts WHERE login = ?",
                {
                    replacements: [login],
                    type: QueryTypes.SELECT
                }
            );

            logger.debug(`Результат проверки существования: ${JSON.stringify(results)}`);
            return results.count > 0;
        } catch (error) {
            logger.error(`Ошибка при проверке существования аккаунта: ${error.message}`);
            throw error;
        }
    },

    /**
     * Создает новый аккаунт
     * @param {string} login - Логин
     * @param {string} passwordHash - Хеш пароля
     * @param {string|null} email - Email пользователя (опционально)
     * @returns {Promise<void>}
     */
    async create(login, passwordHash, email = null) {
        try {
            logger.debug(`Создание аккаунта: ${login}`);

            // Создаем аккаунт с помощью хранимой процедуры
            await loginDb.query(
                "CALL lip_AccountCreate(?, ?)",
                {
                    replacements: [login, passwordHash]
                }
            );

            logger.info(`Создан новый аккаунт: ${login}`);

            // Дополнительно устанавливаем accessLevel = 0 (и другие поля при необходимости)
            await this.update(login, {
                password: passwordHash,  // Передаем тот же пароль для обновления
                accessLevel: 0,
                lastactive: null,        // Явно указываем null для lastactive
                email: email             // Добавляем email, если он был предоставлен
            });

            logger.info(`Установлен accessLevel = 0 для аккаунта: ${login}`);
        } catch (error) {
            logger.error(`Ошибка при создании аккаунта: ${error.message}`);
            throw error;
        }
    },

    /**
     * Обновляет аккаунт
     * @param {string} login - Логин
     * @param {Object} updateData - Данные для обновления
     * @returns {Promise<void>}
     */
    async update(login, updateData) {
        try {
            const {
                password,
                accessLevel = null,
                lastServerId = null,
                lastIP = null,
                lastHWID = null,
                lastactive = null,  // Изменено на null по умолчанию
                email = null
            } = updateData;

            logger.debug(`Обновление аккаунта: ${login}, обновляемые поля: ${JSON.stringify({
                passwordUpdated: !!password,
                accessLevel,
                lastServerId,
                lastIPUpdated: !!lastIP,
                lastHWIDUpdated: !!lastHWID,
                lastactive,
                emailUpdated: !!email
            })}`);

            await loginDb.query(
                "CALL lip_AccountUpdate(?, ?, ?, ?, ?, ?, ?, ?)",
                {
                    replacements: [
                        login,
                        password,
                        accessLevel,
                        lastServerId,
                        lastIP,
                        lastHWID,
                        lastactive,
                        email
                    ]
                }
            );

            logger.info(`Обновлен аккаунт: ${login}`);
        } catch (error) {
            logger.error(`Ошибка при обновлении аккаунта: ${error.message}`);
            throw error;
        }
    },

    /**
     * Загружает информацию об аккаунте
     * @param {string} login - Логин
     * @returns {Promise<Object|null>} Данные аккаунта или null, если аккаунт не найден
     */
    async load(login) {
        try {
            logger.debug(`Загрузка информации об аккаунте: ${login}`);

            const results = await loginDb.query(
                "CALL lip_AccountLoad(?)",
                {
                    replacements: [login]
                }
            );

            logger.debug(`Результат загрузки аккаунта: ${JSON.stringify(results)}`);

            // Проверяем, что результат не пустой
            if (!results || results.length === 0 || !results[0] || results[0].length === 0) {
                logger.warn(`Аккаунт ${login} не найден при загрузке`);
                return null;
            }

            // В зависимости от формата результата, возвращаемого хранимой процедурой
            // Иногда результат может быть в формате [resultSet, metadata]
            // или [[rows], metadata]
            let accountData;
            if (Array.isArray(results[0])) {
                accountData = results[0][0];
            } else {
                accountData = results[0];
            }

            logger.debug(`Данные аккаунта: ${JSON.stringify(accountData)}`);
            return accountData;
        } catch (error) {
            logger.error(`Ошибка при загрузке аккаунта: ${error.message}`);
            throw error;
        }
    },

    /**
     * Получает список аккаунтов с пагинацией и фильтрацией
     * @param {Object} options - Параметры запроса
     * @param {number} options.page - Номер страницы (начиная с 1)
     * @param {number} options.limit - Количество записей на странице
     * @param {Object} options.filters - Фильтры для поиска
     * @param {string} options.sortBy - Поле для сортировки
     * @param {string} options.sortOrder - Порядок сортировки ('asc' или 'desc')
     * @returns {Promise<Object>} Результат запроса с аккаунтами и метаданными
     */
    async getAccounts(options) {
        try {
            const {
                page = 1,
                limit = 10,
                filters = {},
                sortBy = 'login',
                sortOrder = 'asc'
            } = options;

            const offset = (page - 1) * limit;

            // Построение условий фильтрации
            const { whereClause, params } = buildWhereClause(filters);

            // Валидация поля сортировки для предотвращения SQL инъекций
            const validSortFields = ['login', 'lastactive', 'accessLevel', 'lastIP', 'lastHWID', 'lastServerId', 'ban_expire'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'login';

            // Валидация порядка сортировки
            const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

            // Запрос для получения общего количества записей
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM accounts 
                ${whereClause}
            `;

            // Запрос для получения данных с пагинацией и сортировкой
            const dataQuery = `
                SELECT 
                    login, 
                    accessLevel, 
                    lastactive,
                    lastIP, 
                    lastHWID, 
                    lastServerId, 
                    ban_expire,
                    l2email as email
                FROM accounts 
                ${whereClause} 
                ORDER BY ${sortField} ${order}
                LIMIT ? OFFSET ?
            `;

            // Выполнение запроса на количество записей
            const [countResult] = await loginDb.query(countQuery, {
                replacements: params,
                type: QueryTypes.SELECT
            });

            const total = parseInt(countResult.total, 10);

            // Выполнение запроса на получение данных
            const accountsData = await loginDb.query(dataQuery, {
                replacements: [...params, limit, offset],
                type: QueryTypes.SELECT
            });

            // Преобразование данных - добавление дополнительных полей
            const accounts = accountsData.map(account => {
                const now = Math.floor(Date.now() / 1000);

                return {
                    ...account,
                    // Преобразуем timestamp в удобный формат даты
                    lastactiveDate: account.lastactive ? new Date(account.lastactive * 1000).toISOString() : null,
                    // Добавляем поле, показывающее, забанен ли аккаунт
                    isBanned: account.ban_expire > now,
                    // Если аккаунт забанен, добавляем дату истечения бана
                    banExpireDate: account.ban_expire > now ? new Date(account.ban_expire * 1000).toISOString() : null
                };
            });

            // Формируем метаданные для пагинации
            const totalPages = Math.ceil(total / limit);

            return {
                accounts,
                pagination: {
                    total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages
                }
            };
        } catch (error) {
            logger.error(`Ошибка при получении списка аккаунтов: ${error.message}`);
            throw error;
        }
    },

    /**
     * Получает историю входов для аккаунта
     * @param {string} login - Логин аккаунта
     * @param {Object} options - Параметры запроса
     * @param {number} options.page - Номер страницы (начиная с 1)
     * @param {number} options.limit - Количество записей на странице
     * @returns {Promise<Object>} Результат запроса с историей входов и метаданными
     */
    async getAccountLoginHistory(login, options) {
        try {
            const { page = 1, limit = 10 } = options;
            const offset = (page - 1) * limit;

            // Запрос для получения общего количества записей
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM account_log 
                WHERE login = ?
            `;

            // Запрос для получения данных с пагинацией
            const dataQuery = `
                SELECT 
                    time, 
                    lastServerId, 
                    ip, 
                    hwid
                FROM account_log 
                WHERE login = ? 
                ORDER BY time DESC
                LIMIT ? OFFSET ?
            `;

            // Выполнение запроса на количество записей
            const [countResult] = await loginDb.query(countQuery, {
                replacements: [login],
                type: QueryTypes.SELECT
            });

            const total = parseInt(countResult.total, 10);

            // Выполнение запроса на получение данных
            const historyData = await loginDb.query(dataQuery, {
                replacements: [login, limit, offset],
                type: QueryTypes.SELECT
            });

            // Преобразование данных - добавление дополнительных полей
            const loginHistory = historyData.map(entry => {
                return {
                    ...entry,
                    // Преобразуем timestamp в удобный формат даты
                    date: entry.time ? new Date(entry.time * 1000).toISOString() : null
                };
            });

            // Формируем метаданные для пагинации
            const totalPages = Math.ceil(total / limit);

            return {
                login,
                loginHistory,
                pagination: {
                    total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages
                }
            };
        } catch (error) {
            logger.error(`Ошибка при получении истории входов аккаунта ${login}: ${error.message}`);
            throw error;
        }
    }
};

module.exports = accountsDb;