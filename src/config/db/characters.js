const databases = require("../databases");
const logger = require("../../utils/logger");
const { QueryTypes, Op } = require("sequelize");

// Получаем подключение к игровой базе данных
const gameDb = databases.gameMain;

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
 * Построение условий WHERE для фильтрации персонажей
 * @param {Object} filters - Объект с фильтрами
 * @returns {Object} - Объект с SQL условиями и параметрами
 */
const buildWhereClause = (filters) => {
    let whereClause = "";
    const params = [];

    if (filters.char_name) {
        whereClause += (whereClause ? " AND " : "") + "`char_name` LIKE ?";
        params.push(`%${filters.char_name}%`);
    }

    if (filters.account_name) {
        whereClause += (whereClause ? " AND " : "") + "`account_name` LIKE ?";
        params.push(`%${filters.account_name}%`);
    }

    if (filters.clanid) {
        whereClause += (whereClause ? " AND " : "") + "`clanid` = ?";
        params.push(parseInt(filters.clanid, 10));
    }

    if (filters.online !== undefined) {
        whereClause += (whereClause ? " AND " : "") + "`online` = ?";
        params.push(filters.online === 'true' ? 1 : 0);
    }

    if (filters.minLevel !== undefined) {
        // Здесь требуется дополнительная логика для получения уровня персонажа
        // Возможно, уровень хранится в другой таблице или требует JOIN
        // Это заглушка, которую нужно адаптировать к вашей структуре БД
        whereClause += (whereClause ? " AND " : "") + "`base_class_id` >= ?";
        params.push(parseInt(filters.minLevel, 10));
    }

    if (filters.maxLevel !== undefined) {
        // То же, что и выше
        whereClause += (whereClause ? " AND " : "") + "`base_class_id` <= ?";
        params.push(parseInt(filters.maxLevel, 10));
    }

    if (filters.createdAfter) {
        const timestamp = parseTimestamp(filters.createdAfter);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`createtime` >= ?";
            params.push(timestamp);
        }
    }

    if (filters.createdBefore) {
        const timestamp = parseTimestamp(filters.createdBefore);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`createtime` <= ?";
            params.push(timestamp);
        }
    }

    if (filters.lastAccessAfter) {
        const timestamp = parseTimestamp(filters.lastAccessAfter);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`lastAccess` >= ?";
            params.push(timestamp);
        }
    }

    if (filters.lastAccessBefore) {
        const timestamp = parseTimestamp(filters.lastAccessBefore);
        if (timestamp) {
            whereClause += (whereClause ? " AND " : "") + "`lastAccess` <= ?";
            params.push(timestamp);
        }
    }

    if (filters.sex !== undefined) {
        whereClause += (whereClause ? " AND " : "") + "`sex` = ?";
        params.push(parseInt(filters.sex, 10));
    }

    if (filters.deletedOnly === 'true') {
        whereClause += (whereClause ? " AND " : "") + "`deletetime` > 0";
    } else {
        // По умолчанию не показываем удаленных персонажей
        whereClause += (whereClause ? " AND " : "") + "`deletetime` = 0";
    }

    return {
        whereClause: whereClause ? `WHERE ${whereClause}` : "",
        params
    };
};

/**
 * Модуль для работы с таблицей characters
 */
const charactersDb = {
    /**
     * Проверяет существование персонажа с указанным именем
     * @param {string} charName - Имя персонажа для проверки
     * @returns {Promise<boolean>} true, если персонаж существует
     */
    async exists(charName) {
        try {
            logger.debug(`Проверка существования персонажа: ${charName}`);

            const [results] = await gameDb.query(
                "SELECT COUNT(*) as count FROM characters WHERE char_name = ? AND deletetime = 0",
                {
                    replacements: [charName],
                    type: QueryTypes.SELECT
                }
            );

            logger.debug(`Результат проверки существования персонажа: ${JSON.stringify(results)}`);
            return results.count > 0;
        } catch (error) {
            logger.error(`Ошибка при проверке существования персонажа: ${error.message}`);
            throw error;
        }
    },

    /**
     * Проверяет существование персонажа с указанным ID объекта
     * @param {number} objId - ID объекта персонажа
     * @returns {Promise<boolean>} true, если персонаж существует
     */
    async existsById(objId) {
        try {
            logger.debug(`Проверка существования персонажа по ID: ${objId}`);

            const [results] = await gameDb.query(
                "SELECT COUNT(*) as count FROM characters WHERE obj_Id = ? AND deletetime = 0",
                {
                    replacements: [objId],
                    type: QueryTypes.SELECT
                }
            );

            logger.debug(`Результат проверки существования персонажа по ID: ${JSON.stringify(results)}`);
            return results.count > 0;
        } catch (error) {
            logger.error(`Ошибка при проверке существования персонажа по ID: ${error.message}`);
            throw error;
        }
    },

    /**
     * Загружает информацию о персонаже по имени
     * @param {string} charName - Имя персонажа
     * @returns {Promise<Object|null>} Данные персонажа или null, если персонаж не найден
     */
    async loadByName(charName) {
        try {
            logger.debug(`Загрузка информации о персонаже по имени: ${charName}`);

            const [character] = await gameDb.query(
                `SELECT * FROM characters WHERE char_name = ? AND deletetime = 0`,
                {
                    replacements: [charName],
                    type: QueryTypes.SELECT
                }
            );

            if (!character) {
                logger.warn(`Персонаж с именем ${charName} не найден`);
                return null;
            }

            logger.debug(`Данные персонажа: ${JSON.stringify(character)}`);
            return this.enrichCharacterData(character);
        } catch (error) {
            logger.error(`Ошибка при загрузке персонажа по имени: ${error.message}`);
            throw error;
        }
    },

    /**
     * Загружает информацию о персонаже по ID объекта
     * @param {number} objId - ID объекта персонажа
     * @returns {Promise<Object|null>} Данные персонажа или null, если персонаж не найден
     */
    async loadById(objId) {
        try {
            logger.debug(`Загрузка информации о персонаже по ID: ${objId}`);

            const [character] = await gameDb.query(
                `SELECT * FROM characters WHERE obj_Id = ? AND deletetime = 0`,
                {
                    replacements: [objId],
                    type: QueryTypes.SELECT
                }
            );

            if (!character) {
                logger.warn(`Персонаж с ID ${objId} не найден`);
                return null;
            }

            logger.debug(`Данные персонажа: ${JSON.stringify(character)}`);
            return this.enrichCharacterData(character);
        } catch (error) {
            logger.error(`Ошибка при загрузке персонажа по ID: ${error.message}`);
            throw error;
        }
    },

    /**
     * Обогащает данные персонажа дополнительной информацией
     * @param {Object} character - Базовые данные персонажа
     * @returns {Object} Обогащенные данные персонажа
     */
    enrichCharacterData(character) {
        if (!character) return null;

        // Добавляем вычисляемые поля
        return {
            ...character,
            createDate: character.createtime ? new Date(character.createtime * 1000).toISOString() : null,
            deleteDate: character.deletetime && character.deletetime > 0 ? new Date(character.deletetime * 1000).toISOString() : null,
            lastAccessDate: character.lastAccess ? new Date(character.lastAccess * 1000).toISOString() : null,
            isOnline: character.online === 1,
            isDeleted: character.deletetime > 0,
            gender: character.sex === 1 ? "male" : "female",
            onlineTimeHours: Math.floor(character.onlinetime / 3600)
        };
    },

    /**
     * Получает список персонажей с пагинацией и фильтрацией
     * @param {Object} options - Параметры запроса
     * @param {number} options.page - Номер страницы (начиная с 1)
     * @param {number} options.limit - Количество записей на странице
     * @param {Object} options.filters - Фильтры для поиска
     * @param {string} options.sortBy - Поле для сортировки
     * @param {string} options.sortOrder - Порядок сортировки ('asc' или 'desc')
     * @returns {Promise<Object>} Результат запроса с персонажами и метаданными
     */
    async getCharacters(options) {
        try {
            const {
                page = 1,
                limit = 10,
                filters = {},
                sortBy = 'char_name',
                sortOrder = 'asc'
            } = options;

            const offset = (page - 1) * limit;

            // Построение условий фильтрации
            const { whereClause, params } = buildWhereClause(filters);

            // Валидация поля сортировки для предотвращения SQL инъекций
            const validSortFields = ['char_name', 'account_name', 'createtime', 'lastAccess', 'online', 'clanid', 'pvpkills', 'pkkills', 'karma', 'onlinetime'];
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'char_name';

            // Валидация порядка сортировки
            const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

            // Запрос для получения общего количества записей
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM characters 
                ${whereClause}
            `;

            // Запрос для получения данных с пагинацией и сортировкой
            const dataQuery = `
                SELECT 
                    obj_Id,
                    char_name,
                    account_name,
                    sex,
                    createtime,
                    deletetime,
                    lastAccess,
                    online,
                    onlinetime,
                    clanid,
                    title,
                    pvpkills,
                    pkkills,
                    karma,
                    accesslevel,
                    x, y, z
                FROM characters 
                ${whereClause} 
                ORDER BY ${sortField} ${order}
                LIMIT ? OFFSET ?
            `;

            // Выполнение запроса на количество записей
            const [countResult] = await gameDb.query(countQuery, {
                replacements: params,
                type: QueryTypes.SELECT
            });

            const total = parseInt(countResult.total, 10);

            // Выполнение запроса на получение данных
            const charactersData = await gameDb.query(dataQuery, {
                replacements: [...params, limit, offset],
                type: QueryTypes.SELECT
            });

            // Преобразование данных - добавление дополнительных полей
            const characters = charactersData.map(this.enrichCharacterData);

            // Формируем метаданные для пагинации
            const totalPages = Math.ceil(total / limit);

            return {
                characters,
                pagination: {
                    total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages
                }
            };
        } catch (error) {
            logger.error(`Ошибка при получении списка персонажей: ${error.message}`);
            throw error;
        }
    },

    /**
     * Получает список персонажей для указанного аккаунта
     * @param {string} accountName - Имя аккаунта
     * @param {Object} options - Параметры запроса с пагинацией
     * @returns {Promise<Object>} Результат запроса с персонажами аккаунта
     */
    async getAccountCharacters(accountName, options = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                includDeleted = false
            } = options;

            const offset = (page - 1) * limit;

            // Базовое условие - персонажи принадлежат указанному аккаунту
            let whereClause = "WHERE account_name = ?";
            const params = [accountName];

            // Если не требуется включать удаленных персонажей
            if (!includDeleted) {
                whereClause += " AND deletetime = 0";
            }

            // Запрос для получения общего количества записей
            const countQuery = `
                SELECT COUNT(*) as total 
                FROM characters 
                ${whereClause}
            `;

            // Запрос для получения данных с пагинацией
            const dataQuery = `
                SELECT 
                    obj_Id,
                    char_name,
                    sex,
                    createtime,
                    deletetime,
                    lastAccess,
                    online,
                    onlinetime,
                    clanid,
                    title,
                    pvpkills,
                    pkkills
                FROM characters 
                ${whereClause} 
                ORDER BY lastAccess DESC
                LIMIT ? OFFSET ?
            `;

            // Выполнение запроса на количество записей
            const [countResult] = await gameDb.query(countQuery, {
                replacements: params,
                type: QueryTypes.SELECT
            });

            const total = parseInt(countResult.total, 10);

            // Выполнение запроса на получение данных
            const charactersData = await gameDb.query(dataQuery, {
                replacements: [...params, limit, offset],
                type: QueryTypes.SELECT
            });

            // Преобразование данных - добавление дополнительных полей
            const characters = charactersData.map(this.enrichCharacterData);

            // Формируем метаданные для пагинации
            const totalPages = Math.ceil(total / limit);

            return {
                accountName,
                characters,
                pagination: {
                    total,
                    page: parseInt(page, 10),
                    limit: parseInt(limit, 10),
                    totalPages
                }
            };
        } catch (error) {
            logger.error(`Ошибка при получении персонажей аккаунта ${accountName}: ${error.message}`);
            throw error;
        }
    }
};

module.exports = charactersDb;