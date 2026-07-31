const {
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");
const db = require("../utils/database");
const logger = require("../utils/logger");
const { randomItem } = require("../utils/helpers");

// ─── Configuration ─────────────────────────────────────────────────────────────

const sensitivityLevels = {
    low: { warningThreshold: 8, slowmodeThreshold: 13, timeoutThreshold: 19 },
    normal: { warningThreshold: 6, slowmodeThreshold: 10, timeoutThreshold: 15 },
    high: { warningThreshold: 4, slowmodeThreshold: 7, timeoutThreshold: 11 }
};

const CONVERSATION_WINDOW = 90 * 1000;
const PAIR_EXPIRY = 10 * 60 * 1000;
const WARNING_COOLDOWN = 45 * 1000;
const SLOWMODE_SECONDS = 10;
const SLOWMODE_DURATION = 5 * 60 * 1000;
const AUTO_TIMEOUT_DURATION = 10 * 60 * 1000;

// ─── In-memory state ───────────────────────────────────────────────────────────

const conflictPairs = new Map();
const recentChannelMessages = new Map();
const channelConflictStates = new Map();
const recentlyWarnedPairs = new Map();

// ─── Hostility patterns ────────────────────────────────────────────────────────

const severeHostilityPatterns = [
    /\bk\s*y\s*s\b/i, /\bkill\s+yourself\b/i, /\bgo\s+die\b/i,
    /\bi\s+hope\s+you\s+die\b/i, /\byou\s+should\s+die\b/i,
    /\bnobody\s+would\s+miss\s+you\b/i, /\bfall\s+on\s+your\s+neck\b/i
];

const strongHostilityPatterns = [
    /\bfuck\s+you\b/i, /\bfuck\s+off\b/i, /\bstfu\b/i,
    /\bshut\s+(?:the\s+fuck\s+)?up\b/i, /\bi\s+hate\s+(?:you|u)\b/i,
    /\bnobody\s+likes\s+you\b/i, /\bnobody\s+cares\s+about\s+you\b/i,
    /\byou(?:'re| are)\s+(?:a\s+)?(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo|failure|bitch)\b/i,
    /\byou\s+(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo|bitch)\b/i,
    /\bbitch\s+ass\b/i
];

const mediumHostilityPatterns = [
    /\byou(?:'re| are)\s+(?:so\s+)?(?:stupid|dumb|pathetic|useless|annoying|embarrassing|delusional|ugly)\b/i,
    /\bare\s+you\s+(?:actually\s+)?(?:stupid|dumb)\b/i,
    /\bget\s+a\s+life\b/i, /\bkeep\s+crying\b/i, /\bcry\s+more\b/i,
    /\bcry\s+about\s+it\b/i, /\bstay\s+mad\b/i, /\byou(?:'re| are)\s+mad\b/i,
    /\byou(?:'re| are)\s+obsessed\b/i, /\bno\s+one\s+asked\s+you\b/i,
    /\bwhat\s+is\s+wrong\s+with\s+you\b/i
];

const lightHostilityPatterns = [
    /\bidiot\b/i, /\bmoron\b/i, /\bloser\b/i, /\bclown\b/i,
    /\bweirdo\b/i, /\bdumbass\b/i, /\bbitch\b/i, /\bshut\s+up\b/i,
    /\bget\s+lost\b/i, /\bcan\s+you\s+read\b/i
];

const funnyConflictWarnings = [
    "\u{1F6A8} Certified yap battle detected. Both of you take a breather \u{1F62D}",
    "\u{1F37F} Beloved enjoyed the first episode, but this drama needs a commercial break.",
    "\u{1F6D1} Friendship.exe has stopped responding. Please restart peacefully.",
    "\u2694\uFE0F The argument expansion pack has been temporarily disabled.",
    "\u{1F496} Beloved requests peace before somebody writes a twelve-page response.",
    "\u{1F4E2} Both contestants have been disqualified from the Yap Olympics.",
    "\u{1F9EF} This conversation is beginning to smoke. Everybody step back.",
    "\u{1F3AC} Cut! The argument scene was convincing, but we are moving on now.",
    "\u{1F62D} You two are arguing like there is prize money involved."
];

const seriousConflictWarnings = [
    "\u26A0\uFE0F This conversation is becoming hostile. Please take a break.",
    "\u26A0\uFE0F Stop the personal attacks and move on from this conversation.",
    "\u26A0\uFE0F This argument is escalating. Further hostility may trigger slowmode.",
    "\u26A0\uFE0F Keep the conversation respectful. Personal attacks are not allowed."
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normaliseMessage(content) {
    return content.toLowerCase().replace(/<@!?\d+>/g, " ").replace(/https?:\/\/\S+/g, " ")
        .replace(/[^\w\s']/g, " ").replace(/\s+/g, " ").trim();
}

function matchesAnyPattern(content, patterns) {
    return patterns.some(p => p.test(content));
}

function calculateHostilityScore(content, hasTargetContext) {
    const clean = normaliseMessage(content);
    let score = 0, severity = "none";

    if (matchesAnyPattern(clean, severeHostilityPatterns)) { score += 8; severity = "severe"; }
    if (matchesAnyPattern(clean, strongHostilityPatterns)) { score += 4; if (severity === "none") severity = "strong"; }
    if (matchesAnyPattern(clean, mediumHostilityPatterns)) { score += 2; if (severity === "none") severity = "medium"; }
    if (hasTargetContext && matchesAnyPattern(clean, lightHostilityPatterns)) { score += 1; if (severity === "none") severity = "light"; }
    if (hasTargetContext && score > 0) score += 0.5;

    return { score, severity };
}

function getPairKey(guildId, a, b) {
    const sorted = [a, b].sort();
    return `${guildId}:${sorted[0]}:${sorted[1]}`;
}

function isModerator(member) {
    if (!member) return false;
    return member.permissions.has(PermissionFlagsBits.Administrator)
        || member.permissions.has(PermissionFlagsBits.ModerateMembers)
        || member.permissions.has(PermissionFlagsBits.ManageMessages);
}

function getRecentMessages(channelId) {
    const msgs = recentChannelMessages.get(channelId) || [];
    const cutoff = Date.now() - CONVERSATION_WINDOW;
    const fresh = msgs.filter(m => m.timestamp >= cutoff);
    recentChannelMessages.set(channelId, fresh);
    return fresh;
}

function rememberChannelMessage(message, hostility) {
    const msgs = getRecentMessages(message.channel.id);
    msgs.push({
        authorId: message.author.id, member: message.member,
        content: message.content, hostilityScore: hostility.score,
        severity: hostility.severity, timestamp: Date.now()
    });
    while (msgs.length > 30) msgs.shift();
    recentChannelMessages.set(message.channel.id, msgs);
}

async function findExplicitTarget(message) {
    if (message.reference?.messageId) {
        try {
            const replied = await message.channel.messages.fetch(message.reference.messageId);
            if (replied && !replied.author.bot && replied.author.id !== message.author.id) {
                return { user: replied.author, member: replied.member, method: "reply" };
            }
        } catch (_) {}
    }
    const mentioned = message.mentions.members?.find(m => !m.user.bot && m.id !== message.author.id);
    if (mentioned) return { user: mentioned.user, member: mentioned, method: "mention" };
    return null;
}

function inferConversationTarget(message) {
    const recent = getRecentMessages(message.channel.id);
    for (let i = recent.length - 1; i >= 0; i--) {
        const prev = recent[i];
        if (prev.authorId === message.author.id) continue;
        if (Date.now() - prev.timestamp > 30000) return null;
        return { userId: prev.authorId, member: prev.member, method: "conversation-flow", previousWasHostile: prev.hostilityScore > 0 };
    }
    return null;
}

function cleanConflictPair(pairData) {
    const cutoff = Date.now() - CONVERSATION_WINDOW;
    pairData.messages = pairData.messages.filter(m => m.timestamp >= cutoff);
    pairData.totalScore = pairData.messages.reduce((t, m) => t + m.score, 0);
}

function hasMutualArgument(pairData) {
    return new Set(pairData.messages.map(m => m.authorId)).size >= 2;
}

function getExchangeCount(pairData) {
    let exchanges = 0;
    for (let i = 1; i < pairData.messages.length; i++) {
        if (pairData.messages[i].authorId !== pairData.messages[i - 1].authorId) exchanges++;
    }
    return exchanges;
}

function pairWasRecentlyWarned(pairKey) {
    const at = recentlyWarnedPairs.get(pairKey);
    if (!at) return false;
    if (Date.now() - at > WARNING_COOLDOWN) { recentlyWarnedPairs.delete(pairKey); return false; }
    return true;
}

async function sendConflictLog(guild, settings, data) {
    if (!settings.logChannelId) return;
    const ch = guild.channels.cache.get(settings.logChannelId);
    if (!ch || !ch.isTextBased()) return;
    try {
        await ch.send({
            content: `\u{1F6E1}\uFE0F **Beloved Conflict Guard V2**\n**Action:** ${data.action}\n**Channel:** <#${data.channelId}>\n**Members:** <@${data.userOneId}> and <@${data.userTwoId}>\n**Score:** ${data.score}\n**Exchanges:** ${data.exchanges}`,
            allowedMentions: { parse: [] }
        });
    } catch (e) {
        logger.error("ConflictGuard", `Log send failed: ${e.message}`);
    }
}

async function enableTemporarySlowmode(channel) {
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
        return { success: false, reason: "unsupported-channel" };
    }
    const key = `${channel.guild.id}:${channel.id}`;
    if (channelConflictStates.has(key)) return { success: true, alreadyActive: true };
    const botMember = channel.guild.members.me;
    if (!botMember || !channel.permissionsFor(botMember)?.has(PermissionFlagsBits.ManageChannels)) {
        return { success: false, reason: "missing-permission" };
    }
    const originalSlowmode = channel.rateLimitPerUser || 0;
    try {
        await channel.setRateLimitPerUser(Math.max(originalSlowmode, SLOWMODE_SECONDS), "Beloved Conflict Guard detected an escalating argument");
        const timeout = setTimeout(async () => {
            try {
                const state = channelConflictStates.get(key);
                if (!state) return;
                await channel.setRateLimitPerUser(state.originalSlowmode, "Beloved Conflict Guard slowmode expired");
                channelConflictStates.delete(key);
                await channel.send("\u{1F54A}\uFE0F Temporary slowmode has ended. Keep it peaceful.");
            } catch (e) {
                logger.error("ConflictGuard", `Restore slowmode failed: ${e.message}`);
                channelConflictStates.delete(key);
            }
        }, SLOWMODE_DURATION);
        channelConflictStates.set(key, { originalSlowmode, timeout });
        return { success: true, alreadyActive: false };
    } catch (e) {
        logger.error("ConflictGuard", `Enable slowmode failed: ${e.message}`);
        return { success: false, reason: "discord-error" };
    }
}

async function timeoutMember(member, reason) {
    if (!member || isModerator(member) || !member.moderatable) return false;
    try {
        await member.timeout(AUTO_TIMEOUT_DURATION, reason);
        return true;
    } catch (e) {
        logger.error("ConflictGuard", `Timeout failed: ${e.message}`);
        return false;
    }
}

// ─── Main processor ────────────────────────────────────────────────────────────

async function processConflictMessage(message) {
    if (!message.guild || !message.member) return;
    const settings = db.getConflictSettings(message.guild.id);
    if (!settings.enabled || isModerator(message.member)) return;

    const explicitTarget = await findExplicitTarget(message);
    const inferredTarget = explicitTarget ? null : inferConversationTarget(message);
    const hasTargetContext = Boolean(explicitTarget || inferredTarget);
    const hostility = calculateHostilityScore(message.content, hasTargetContext);

    rememberChannelMessage(message, hostility);
    if (hostility.score <= 0 || !hasTargetContext) return;

    const targetId = explicitTarget ? explicitTarget.user.id : inferredTarget.userId;
    if (!targetId || targetId === message.author.id) return;

    const pairKey = getPairKey(message.guild.id, message.author.id, targetId);
    let pairData = conflictPairs.get(pairKey);
    if (!pairData) {
        pairData = {
            guildId: message.guild.id, channelId: message.channel.id,
            userIds: [message.author.id, targetId], messages: [],
            totalScore: 0, warned: false, slowmodeTriggered: false, timeoutTriggered: false,
            lastUpdated: Date.now()
        };
    }

    cleanConflictPair(pairData);
    let score = hostility.score;
    if (inferredTarget?.previousWasHostile) score += 1.5;
    const sameAuthorCount = pairData.messages.filter(m => m.authorId === message.author.id).length;
    if (sameAuthorCount >= 2) score += 1;

    pairData.messages.push({
        authorId: message.author.id, targetId, score,
        severity: hostility.severity, timestamp: Date.now(),
        messageId: message.id, targetMethod: explicitTarget ? explicitTarget.method : inferredTarget.method
    });
    pairData.channelId = message.channel.id;
    pairData.lastUpdated = Date.now();
    cleanConflictPair(pairData);
    conflictPairs.set(pairKey, pairData);

    const level = sensitivityLevels[settings.sensitivity] || sensitivityLevels.normal;
    const mutual = hasMutualArgument(pairData);
    const exchanges = getExchangeCount(pairData);
    const severe = pairData.messages.some(m => m.severity === "severe");
    const repeatedTargeting = pairData.messages.length >= 3;

    if (!severe && !mutual && !repeatedTargeting) return;

    // Warning
    if (pairData.totalScore >= level.warningThreshold && !pairData.warned && !pairWasRecentlyWarned(pairKey)) {
        pairData.warned = true;
        recentlyWarnedPairs.set(pairKey, Date.now());
        const pool = settings.funnyMessages ? funnyConflictWarnings : seriousConflictWarnings;
        const warning = randomItem(pool);
        await message.channel.send({
            content: `${warning}\n\n<@${pairData.userIds[0]}> and <@${pairData.userIds[1]}>, move on or take a break.`,
            allowedMentions: { users: pairData.userIds }
        });
        await sendConflictLog(message.guild, settings, {
            action: "Warning issued", channelId: message.channel.id,
            userOneId: pairData.userIds[0], userTwoId: pairData.userIds[1],
            score: pairData.totalScore, exchanges
        });
    }

    // Slowmode
    if (settings.slowmodeEnabled && pairData.totalScore >= level.slowmodeThreshold && !pairData.slowmodeTriggered) {
        pairData.slowmodeTriggered = true;
        const result = await enableTemporarySlowmode(message.channel);
        if (result.success && !result.alreadyActive) {
            await message.channel.send(`\u{1F40C} Argument continued. This channel now has ${SLOWMODE_SECONDS}-second slowmode for 5 minutes.`);
            await sendConflictLog(message.guild, settings, {
                action: "Temporary slowmode enabled", channelId: message.channel.id,
                userOneId: pairData.userIds[0], userTwoId: pairData.userIds[1],
                score: pairData.totalScore, exchanges
            });
        }
    }

    // Timeout
    if (settings.timeoutEnabled && pairData.totalScore >= level.timeoutThreshold && !pairData.timeoutTriggered) {
        pairData.timeoutTriggered = true;
        const timedOut = await timeoutMember(message.member, "Repeated targeted hostility detected by Beloved Conflict Guard");
        if (timedOut) {
            await message.channel.send({
                content: `\u23F0 <@${message.author.id}> has been timed out for 10 minutes after continuing the argument.`,
                allowedMentions: { users: [message.author.id] }
            });
            await sendConflictLog(message.guild, settings, {
                action: `Timed out ${message.author.tag}`, channelId: message.channel.id,
                userOneId: pairData.userIds[0], userTwoId: pairData.userIds[1],
                score: pairData.totalScore, exchanges
            });
        }
    }
}

// Cleanup old memory
setInterval(() => {
    const expiry = Date.now() - PAIR_EXPIRY;
    for (const [key, pair] of conflictPairs) {
        if (pair.lastUpdated < expiry) conflictPairs.delete(key);
    }
    for (const [key, at] of recentlyWarnedPairs) {
        if (Date.now() - at > WARNING_COOLDOWN) recentlyWarnedPairs.delete(key);
    }
    for (const [channelId] of recentChannelMessages) {
        getRecentMessages(channelId);
    }
}, 60 * 1000);

module.exports = {
    processConflictMessage,
    sensitivityLevels,
    getSettings: db.getConflictSettings,
    updateSettings: db.updateConflictSettings
};
