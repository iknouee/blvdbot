const db = require("../utils/database");
const { coins, clampBet, formatCooldown } = require("../utils/helpers");

// In-memory lock set to prevent double-spins in casino
const economyLocks = new Set();

function acquireLock(guildId, userId) {
    const key = `${guildId}:${userId}`;
    if (economyLocks.has(key)) return false;
    economyLocks.add(key);
    return true;
}

function releaseLock(guildId, userId) {
    economyLocks.delete(`${guildId}:${userId}`);
}

function isLocked(guildId, userId) {
    return economyLocks.has(`${guildId}:${userId}`);
}

module.exports = {
    acquireLock,
    releaseLock,
    isLocked,
    // Re-export db economy functions for convenience
    getUser: db.getEconomyUser,
    update: db.updateEconomy,
    getLeaderboard: db.getLeaderboard,
    STARTING_BALANCE: db.STARTING_BALANCE
};
