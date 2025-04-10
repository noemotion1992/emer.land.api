const { Sequelize } = require("sequelize");
const logger = require("../utils/logger");
require("dotenv").config();

// Утилита для создания подключения к базе данных
const createDatabaseConnection = (dbConfig, dbName) => {
    try {
        const sequelizeInstance = new Sequelize({
            host: dbConfig.host,
            port: dbConfig.port,
            username: dbConfig.user,
            password: dbConfig.password,
            database: dbConfig.name,
            dialect: 'mysql', // или 'mariadb' в зависимости от вашей базы

            // Общие настройки для базы данных
            logging: (msg) => logger.debug(`[${dbName} DB] ${msg}`),

            // Настройки пула подключений
            pool: {
                max: 5,        // Максимальное количество подключений в пуле
                min: 0,        // Минимальное количество подключений в пуле
                acquire: 30000, // Максимальное время ожидания подключения
                idle: 10000    // Время простоя подключения перед закрытием
            },

            // Специфические настройки для MySQL/MariaDB
            dialectOptions: {
                charset: 'utf8mb4', // Поддержка эмодзи и специальных символов
                supportBigNumbers: true,
                bigNumberStrings: true
            }
        });

        // Проверка подключения
        sequelizeInstance.authenticate()
            .then(() => {
                logger.info(`[${dbName} DB] Успешное подключение к базе данных`);
            })
            .catch((error) => {
                logger.error(`[${dbName} DB] Ошибка подключения: ${error.message}`);
            });

        return sequelizeInstance;
    } catch (error) {
        logger.error(`[${dbName} DB] Ошибка создания подключения: ${error.message}`);
        throw error;
    }
};

// Функция для создания объекта конфигурации базы данных из переменных окружения
const createDbConfigFromEnv = (prefix) => ({
    host: process.env[`${prefix}_HOST`],
    port: process.env[`${prefix}_PORT`],
    user: process.env[`${prefix}_USER`],
    password: process.env[`${prefix}_PASSWORD`],
    name: process.env[`${prefix}_NAME`]
});

// Создание подключений к базам данных
const databases = {
    // Мастер база данных
    master: createDatabaseConnection(
        createDbConfigFromEnv('DB_MASTER'),
        'Master'
    ),

    // Основной сервер логинов
    login: createDatabaseConnection(
        createDbConfigFromEnv('DB_LOGIN'),
        'Login'
    ),

    // Основной игровой сервер
    gameMain: createDatabaseConnection(
        createDbConfigFromEnv('DB_GAME_MAIN'),
        'Game Main'
    ),

    // Тестовый игровой сервер
    gameTest: createDatabaseConnection(
        createDbConfigFromEnv('DB_GAME_TEST'),
        'Game Test'
    ),

    // Тестовый сервер логинов
    loginTest: createDatabaseConnection(
        createDbConfigFromEnv('DB_LOGIN_TEST'),
        'Login Test'
    )
};

// Функция для добавления новой базы данных динамически
databases.addDatabase = (dbName, prefix) => {
    if (databases[dbName]) {
        logger.warn(`База данных с именем ${dbName} уже существует`);
        return databases[dbName];
    }

    try {
        const newDatabase = createDatabaseConnection(
            createDbConfigFromEnv(prefix),
            dbName
        );

        databases[dbName] = newDatabase;
        return newDatabase;
    } catch (error) {
        logger.error(`Ошибка при добавлении базы данных ${dbName}: ${error.message}`);
        throw error;
    }
};

module.exports = databases;