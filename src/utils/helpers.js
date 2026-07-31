/**
 * Format a coin amount with the coin emoji.
 * @param {number} amount
 * @returns {string}
 */
function coins(amount) {
    return `🪙 ${Number(amount).toLocaleString()}`;
}

/**
 * Validate a bet amount against a user's balance.
 * @param {number} balance - Current balance.
 * @param {number} amount - Bet amount.
 * @returns {boolean}
 */
function clampBet(balance, amount) {
    return Number.isInteger(amount) && amount >= 10 && amount <= balance;
}

/**
 * Pick a random element from an array.
 * @param {Array} items
 * @returns {*}
 */
function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * Format a cooldown duration in milliseconds to a human-readable string.
 * @param {number} ms - Remaining milliseconds.
 * @returns {string}
 */
function formatCooldown(ms) {
    const sec = Math.ceil(ms / 1000);
    const min = Math.floor(sec / 60);
    const hrs = Math.floor(min / 60);
    if (hrs) return `${hrs}h ${min % 60}m`;
    if (min) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
}

/**
 * Render a text-based progress bar.
 * @param {number} value - Current value.
 * @param {number} max - Maximum value.
 * @param {number} length - Bar length in characters.
 * @returns {string}
 */
function progressBar(value, max, length = 10) {
    const filled = Math.max(0, Math.min(length, Math.round((value / max) * length)));
    return "\u2588".repeat(filled) + "\u2591".repeat(length - filled);
}

/**
 * Normalize text for blacklist comparisons.
 * @param {string} value
 * @returns {string}
 */
function normaliseBlacklistText(value) {
    return String(value || "")
        .normalize("NFKC")
        .toLowerCase()
        .replace(/[''`]/g, "'")
        .replace(/[^a-z0-9'\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Normalize text for country quiz comparisons.
 * @param {string} text
 * @returns {string}
 */
function normaliseCountryGuess(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Format a list of user IDs as mentions, capped at a max length.
 * @param {string[]} userIds
 * @returns {string}
 */
function formatVoterList(userIds) {
    if (userIds.length === 0) return "Nobody \u{1F62D}";
    const mentions = userIds.map(id => `<@${id}>`);
    const lines = [];
    let current = "";
    for (const mention of mentions) {
        const next = current ? `${current}, ${mention}` : mention;
        if (next.length > 900) {
            lines.push(current);
            current = mention;
        } else {
            current = next;
        }
    }
    if (current) lines.push(current);
    return lines.join("\n").slice(0, 1024);
}

/**
 * Simple cooldown manager for commands.
 */
class CooldownManager {
    constructor() {
        this.cooldowns = new Map();
    }

    /**
     * Check if a user is on cooldown.
     * @param {string} key - Unique key (e.g., `commandName:guildId:userId`).
     * @param {number} duration - Cooldown duration in ms.
     * @returns {{ onCooldown: boolean, remaining: number }}
     */
    check(key, duration) {
        const now = Date.now();
        const expiresAt = this.cooldowns.get(key) || 0;
        if (now < expiresAt) {
            return { onCooldown: true, remaining: expiresAt - now };
        }
        this.cooldowns.set(key, now + duration);
        return { onCooldown: false, remaining: 0 };
    }

    /**
     * Reset a cooldown for a key.
     * @param {string} key
     */
    reset(key) {
        this.cooldowns.delete(key);
    }

    /**
     * Clean expired entries (call periodically).
     */
    sweep() {
        const now = Date.now();
        for (const [key, expiresAt] of this.cooldowns) {
            if (expiresAt <= now) this.cooldowns.delete(key);
        }
    }
}

const cooldowns = new CooldownManager();

// Sweep every 5 minutes
setInterval(() => cooldowns.sweep(), 5 * 60 * 1000);

module.exports = {
    coins,
    clampBet,
    randomItem,
    formatCooldown,
    progressBar,
    normaliseBlacklistText,
    normaliseCountryGuess,
    formatVoterList,
    cooldowns,
    CooldownManager
};
