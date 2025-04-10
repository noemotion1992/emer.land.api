const crypto = require("crypto");
const logger = require("./logger");

// Конфигурация из сервера L2
const DEFAULT_PASSWORD_HASH = process.env.DEFAULT_PASSWORD_HASH || "sha1";
const LEGACY_PASSWORD_HASH = process.env.LEGACY_PASSWORD_HASH || "whirlpool2";

/**
 * Модуль для работы с паролями
 */
const passwordUtils = {
    /**
     * Генерирует хеш пароля в формате, совместимом с Jacksum
     * @param {string} password - Исходный пароль
     * @param {string} algorithm - Алгоритм хеширования
     * @returns {string} Хеш пароля в Base64 формате
     */
    jacksumHash: (password, algorithm) => {
        try {
            // Преобразуем имя алгоритма в формат для crypto
            let cryptoAlgorithm;

            // Особая обработка для whirlpool2 - в Node.js нет "whirlpool2"
            if (algorithm === "whirlpool2") {
                cryptoAlgorithm = "whirlpool";
            } else {
                cryptoAlgorithm = algorithm.toLowerCase();
            }

            // Создаем хеш
            const hash = crypto.createHash(cryptoAlgorithm).update(password).digest("base64");

            logger.debug(`Сгенерирован хеш ${algorithm} для пароля: ${hash}`);
            return hash;
        } catch (error) {
            logger.error(`Ошибка при использовании алгоритма ${algorithm}: ${error.message}`);

            // Если указанный алгоритм не поддерживается, используем SHA-1
            logger.warn(`Использование SHA-1 в качестве резервного варианта хеширования вместо ${algorithm}`);
            return crypto.createHash("sha1").update(password).digest("base64");
        }
    },

    /**
     * Генерирует хеш пароля с использованием DEFAULT_PASSWORD_HASH (sha1)
     * @param {string} password - Исходный пароль
     * @returns {string} Хеш пароля в Base64 формате
     */
    defaultHash: (password) => {
        return passwordUtils.jacksumHash(password, DEFAULT_PASSWORD_HASH);
    },

    /**
     * Генерирует хеш пароля с использованием LEGACY_PASSWORD_HASH (whirlpool2)
     * @param {string} password - Исходный пароль
     * @returns {string} Хеш пароля в Base64 формате
     */
    legacyHash: (password) => {
        return passwordUtils.jacksumHash(password, LEGACY_PASSWORD_HASH);
    },

    /**
     * Сравнивает пароль с хешем
     * @param {string} password - Пароль в открытом виде
     * @param {string} hash - Хеш пароля
     * @returns {boolean} true, если пароль соответствует хешу
     */
    comparePassword: (password, hash) => {
        // Пробуем сначала DEFAULT_PASSWORD_HASH
        const defaultHash = passwordUtils.defaultHash(password);
        if (defaultHash.toLowerCase() === hash.toLowerCase()) {
            return true;
        }

        // Если не совпало, пробуем LEGACY_PASSWORD_HASH
        const legacyHash = passwordUtils.legacyHash(password);
        return legacyHash.toLowerCase() === hash.toLowerCase();
    },

    /**
     * Генерирует хеш для теста разных форматов
     * @param {string} password - Исходный пароль
     * @returns {Object} Разные варианты хеша
     */
    testHashes: (password) => {
        const result = {};

        // Проверяем DEFAULT_PASSWORD_HASH и LEGACY_PASSWORD_HASH
        result.default_hash = passwordUtils.defaultHash(password);
        result.legacy_hash = passwordUtils.legacyHash(password);

        // SHA алгоритмы в разных форматах
        const algorithms = ["sha1", "sha256", "sha512", "md5", "whirlpool"];
        algorithms.forEach(algo => {
            try {
                result[`${algo}_base64`] = passwordUtils.jacksumHash(password, algo);

                // Добавляем специальный случай для whirlpool2
                if (algo === "whirlpool") {
                    result.whirlpool2_base64 = result[`${algo}_base64`];
                }

                // Также добавляем hex варианты
                const hexHash = crypto.createHash(algo).update(password).digest("hex");
                result[`${algo}_hex`] = hexHash;
                result[`${algo}_hex_lower`] = hexHash.toLowerCase();
                result[`${algo}_hex_upper`] = hexHash.toUpperCase();
            } catch (error) {
                result[`${algo}_error`] = error.message;
            }
        });

        return result;
    }
};

module.exports = passwordUtils;