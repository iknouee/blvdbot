const LogLevel = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LogLevel[process.env.LOG_LEVEL?.toUpperCase()] ?? LogLevel.INFO;

function timestamp() {
    return new Date().toISOString();
}

function format(level, tag, message, meta) {
    const ts = timestamp();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${ts}] [${level}] [${tag}] ${message}${metaStr}`;
}

const logger = {
    debug(tag, message, meta) {
        if (currentLevel <= LogLevel.DEBUG) {
            console.debug(format("DEBUG", tag, message, meta));
        }
    },

    info(tag, message, meta) {
        if (currentLevel <= LogLevel.INFO) {
            console.log(format("INFO", tag, message, meta));
        }
    },

    warn(tag, message, meta) {
        if (currentLevel <= LogLevel.WARN) {
            console.warn(format("WARN", tag, message, meta));
        }
    },

    error(tag, message, meta) {
        if (currentLevel <= LogLevel.ERROR) {
            console.error(format("ERROR", tag, message, meta));
        }
    }
};

module.exports = logger;
