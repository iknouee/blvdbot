const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const DATA_DIR = path.join(__dirname, "..", "..", "data");
const ECONOMY_FILE = path.join(DATA_DIR, "economy.json");
const BLACKLIST_FILE = path.join(DATA_DIR, "blacklist.json");
const MARRIAGES_FILE = path.join(DATA_DIR, "marriages.json");
const CONFLICT_FILE = path.join(DATA_DIR, "conflict.json");
const FAMILY_FILE = path.join(DATA_DIR, "family.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─── Safe file I/O with atomic writes ──────────────────────────────────────────

function loadJson(filePath, defaultValue) {
    try {
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") return parsed;
        }
    } catch (error) {
        logger.error("Database", `Failed to load ${filePath}: ${error.message}`);
    }
    return defaultValue;
}

function saveJson(filePath, data) {
    try {
        const temp = `${filePath}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(data, null, 2));
        fs.renameSync(temp, filePath);
    } catch (error) {
        logger.error("Database", `Failed to save ${filePath}: ${error.message}`);
    }
}

// Debounced save to avoid excessive disk writes
const savePending = new Map();
function debouncedSave(filePath, data, delayMs = 1000) {
    if (savePending.has(filePath)) clearTimeout(savePending.get(filePath));
    savePending.set(filePath, setTimeout(() => {
        savePending.delete(filePath);
        saveJson(filePath, data);
    }, delayMs));
}

// ─── Data stores ────────────────────────────────────────────────────────────────

const economyData = loadJson(ECONOMY_FILE, { users: {} });
const blacklistData = loadJson(BLACKLIST_FILE, { guilds: {} });
const marriageData = loadJson(MARRIAGES_FILE, { guilds: {} });
const conflictData = loadJson(CONFLICT_FILE, { guilds: {} });
const familyData = loadJson(FAMILY_FILE, { guilds: {} });

logger.info("Database", "Data stores loaded");

// ─── Economy ────────────────────────────────────────────────────────────────────

const STARTING_BALANCE = 1000;

function economyKey(guildId, userId) { return `${guildId}:${userId}`; }

function getEconomyUser(guildId, userId) {
    const key = economyKey(guildId, userId);
    if (!economyData.users[key]) {
        economyData.users[key] = {
            balance: STARTING_BALANCE, bank: 0, total_won: 0, total_lost: 0,
            last_daily: 0, last_work: 0, last_beg: 0
        };
        debouncedSave(ECONOMY_FILE, economyData);
    }
    return economyData.users[key];
}

function updateEconomy(guildId, userId, updates) {
    const user = getEconomyUser(guildId, userId);
    Object.assign(user, updates);
    debouncedSave(ECONOMY_FILE, economyData);
}

function getLeaderboard(guildId, limit = 10) {
    const prefix = `${guildId}:`;
    return Object.entries(economyData.users)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, val]) => ({ user_id: key.split(":")[1], total: val.balance + val.bank }))
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);
}

// ─── Blacklist ──────────────────────────────────────────────────────────────────

function getGuildBlacklist(guildId) {
    if (!blacklistData.guilds[guildId]) blacklistData.guilds[guildId] = [];
    return blacklistData.guilds[guildId];
}

function addBlacklistWord(guildId, word) {
    const list = getGuildBlacklist(guildId);
    if (!list.includes(word)) {
        list.push(word);
        list.sort((a, b) => a.localeCompare(b));
        debouncedSave(BLACKLIST_FILE, blacklistData, 500);
    }
}

function removeBlacklistWord(guildId, word) {
    const list = getGuildBlacklist(guildId);
    const idx = list.indexOf(word);
    if (idx !== -1) {
        list.splice(idx, 1);
        debouncedSave(BLACKLIST_FILE, blacklistData, 500);
    }
}

function clearBlacklist(guildId) {
    blacklistData.guilds[guildId] = [];
    debouncedSave(BLACKLIST_FILE, blacklistData, 500);
}

// ─── Marriages ──────────────────────────────────────────────────────────────────

function getMarriage(guildId, userId) {
    const guild = marriageData.guilds[guildId];
    if (!guild) return null;
    return guild[userId] || null;
}

function createMarriage(guildId, userId, partnerId) {
    if (!marriageData.guilds[guildId]) marriageData.guilds[guildId] = {};
    const now = Date.now();
    const shared = { married_at: now, kisses: 0, hugs: 0, dates: 0, gifts: 0, ring_name: null, ring_emoji: null, ring_price: null, ring_rank: null };
    marriageData.guilds[guildId][userId] = { partner_id: partnerId, ...shared };
    marriageData.guilds[guildId][partnerId] = { partner_id: userId, ...shared };
    debouncedSave(MARRIAGES_FILE, marriageData);
    return now;
}

function updateMarriage(guildId, userId, updates) {
    const m = getMarriage(guildId, userId);
    if (!m) return null;
    Object.assign(m, updates);
    // Mirror updates to partner
    const partner = marriageData.guilds[guildId]?.[m.partner_id];
    if (partner) {
        for (const key of ["kisses", "hugs", "dates", "gifts", "ring_name", "ring_emoji", "ring_price", "ring_rank"]) {
            if (key in updates) partner[key] = updates[key];
        }
    }
    debouncedSave(MARRIAGES_FILE, marriageData);
    return m;
}

function removeMarriage(guildId, userId) {
    const guild = marriageData.guilds[guildId];
    if (!guild || !guild[userId]) return null;
    const m = guild[userId];
    delete guild[userId];
    if (guild[m.partner_id]?.partner_id === userId) delete guild[m.partner_id];
    debouncedSave(MARRIAGES_FILE, marriageData);
    return m;
}

// ─── Family Tree ─────────────────────────────────────────────────────────────

function getFamilyMember(guildId, userId) {
    const guild = familyData.guilds[guildId];
    if (!guild) return null;
    return guild[userId] || null;
}

function ensureFamilyMember(guildId, userId) {
    if (!familyData.guilds[guildId]) familyData.guilds[guildId] = {};
    if (!familyData.guilds[guildId][userId]) {
        familyData.guilds[guildId][userId] = {
            parent_id: null,
            children: [],
            adopted_at: null
        };
    }
    return familyData.guilds[guildId][userId];
}

function createAdoption(guildId, parentId, childId) {
    const parent = ensureFamilyMember(guildId, parentId);
    const child = ensureFamilyMember(guildId, childId);
    const now = Date.now();

    child.parent_id = parentId;
    child.adopted_at = now;
    if (!parent.children.includes(childId)) {
        parent.children.push(childId);
    }

    debouncedSave(FAMILY_FILE, familyData);
    return now;
}

function removeAdoption(guildId, parentId, childId) {
    const guild = familyData.guilds[guildId];
    if (!guild) return null;

    const parent = guild[parentId];
    const child = guild[childId];

    if (!parent || !child) return null;
    if (child.parent_id !== parentId) return null;

    // Remove child from parent's children array
    parent.children = parent.children.filter(id => id !== childId);

    // Clear child's parent reference
    child.parent_id = null;
    child.adopted_at = null;

    debouncedSave(FAMILY_FILE, familyData);
    return { parentId, childId };
}

function getChildren(guildId, userId) {
    const member = getFamilyMember(guildId, userId);
    if (!member) return [];
    return member.children || [];
}

function getParent(guildId, userId) {
    const member = getFamilyMember(guildId, userId);
    if (!member) return null;
    return member.parent_id;
}

function getFullFamily(guildId, userId) {
    // Build the complete family tree starting from the root ancestor
    const rootId = findRootAncestor(guildId, userId);
    return buildFamilyTree(guildId, rootId);
}

function findRootAncestor(guildId, userId) {
    const visited = new Set();
    let current = userId;
    while (true) {
        if (visited.has(current)) break; // prevent infinite loops
        visited.add(current);
        const member = getFamilyMember(guildId, current);
        if (!member || !member.parent_id) break;
        current = member.parent_id;
    }
    return current;
}

function buildFamilyTree(guildId, rootId) {
    const tree = {
        id: rootId,
        children: []
    };

    const member = getFamilyMember(guildId, rootId);
    if (member && member.children) {
        for (const childId of member.children) {
            tree.children.push(buildFamilyTree(guildId, childId));
        }
    }

    return tree;
}

function getAllFamilyMembers(guildId, userId) {
    // Get all user IDs in the same family tree
    const rootId = findRootAncestor(guildId, userId);
    const members = new Set();
    collectMembers(guildId, rootId, members);
    return [...members];
}

function collectMembers(guildId, userId, members) {
    members.add(userId);
    const member = getFamilyMember(guildId, userId);
    if (member && member.children) {
        for (const childId of member.children) {
            collectMembers(guildId, childId, members);
        }
    }
}

// ─── Conflict Settings ──────────────────────────────────────────────────────────

const DEFAULT_CONFLICT_SETTINGS = {
    enabled: true,
    sensitivity: "normal",
    funnyMessages: true,
    slowmodeEnabled: true,
    timeoutEnabled: false,
    logChannelId: null
};

function getConflictSettings(guildId) {
    if (!conflictData.guilds[guildId]) {
        conflictData.guilds[guildId] = { ...DEFAULT_CONFLICT_SETTINGS };
        debouncedSave(CONFLICT_FILE, conflictData);
    }
    return conflictData.guilds[guildId];
}

function updateConflictSettings(guildId, updates) {
    const settings = getConflictSettings(guildId);
    Object.assign(settings, updates);
    debouncedSave(CONFLICT_FILE, conflictData);
}

// ─── Shutdown ───────────────────────────────────────────────────────────────────

function closeDatabase() {
    // Flush all pending saves immediately
    for (const [filePath, timer] of savePending) {
        clearTimeout(timer);
    }
    savePending.clear();
    saveJson(ECONOMY_FILE, economyData);
    saveJson(BLACKLIST_FILE, blacklistData);
    saveJson(MARRIAGES_FILE, marriageData);
    saveJson(CONFLICT_FILE, conflictData);
    saveJson(FAMILY_FILE, familyData);
    logger.info("Database", "All data flushed to disk");
}

module.exports = {
    STARTING_BALANCE,
    getEconomyUser,
    updateEconomy,
    getLeaderboard,
    getGuildBlacklist,
    addBlacklistWord,
    removeBlacklistWord,
    clearBlacklist,
    getMarriage,
    createMarriage,
    updateMarriage,
    removeMarriage,
    getFamilyMember,
    ensureFamilyMember,
    createAdoption,
    removeAdoption,
    getChildren,
    getParent,
    getFullFamily,
    findRootAncestor,
    getAllFamilyMembers,
    getConflictSettings,
    updateConflictSettings,
    DEFAULT_CONFLICT_SETTINGS,
    closeDatabase
};
