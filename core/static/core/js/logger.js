export let LOGGING_ENABLED = true; // можно глобально включать/выключать логирование

export const createLogger = (prefix = '') => {
    let enabled = true;

    return {
        log: (...args) => LOGGING_ENABLED && enabled && console.log(prefix, ...args),
        error: (...args) => LOGGING_ENABLED && enabled && console.error(prefix, ...args),
        warn: (...args) => LOGGING_ENABLED && enabled && console.warn(prefix, ...args),
        trace: (...args) => LOGGING_ENABLED && enabled && console.trace(prefix, ...args),
        debug: (...args) => LOGGING_ENABLED && enabled && console.debug(prefix, ...args),
        info: (...args) => LOGGING_ENABLED && enabled && console.info(prefix, ...args),
        enable: () => {
            enabled = true;
        },
        disable: () => {
            enabled = false;
        }
    };
};

// Дефолтный логгер для обратной совместимости
export const logger = createLogger('[App]');