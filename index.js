require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");

const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
    SlashCommandBuilder,
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    REST,
    Routes,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    Partials
} = require("discord.js");


// ==================================================
// WEB SERVER
// ==================================================

const app = express();

app.get("/", (req, res) => {
    res.send("💖 Beloved is online");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web server running");
});


// ==================================================
// DISCORD CLIENT
// ==================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});




// ==================================================
// ECONOMY + CASINO
// ==================================================

const ECONOMY_FILE = path.join(__dirname, "beloved-economy.json");
const STARTING_BALANCE = 1000;
const activeBlackjackGames = new Map();
const economyLocks = new Set();
let economyData = { users: {} };

function loadEconomy() {
    try {
        if (fs.existsSync(ECONOMY_FILE)) {
            const parsed = JSON.parse(fs.readFileSync(ECONOMY_FILE, "utf8"));
            if (parsed && typeof parsed === "object" && parsed.users) economyData = parsed;
        }
    } catch (error) {
        console.error("Economy load failed:", error);
    }
}

function saveEconomy() {
    try {
        const temp = `${ECONOMY_FILE}.tmp`;
        fs.writeFileSync(temp, JSON.stringify(economyData, null, 2));
        fs.renameSync(temp, ECONOMY_FILE);
    } catch (error) {
        console.error("Economy save failed:", error);
    }
}

function economyKey(guildId, userId) { return `${guildId}:${userId}`; }
function getEconomyUser(guildId, userId) {
    const key = economyKey(guildId, userId);
    if (!economyData.users[key]) {
        economyData.users[key] = {
            balance: STARTING_BALANCE, bank: 0, totalWon: 0, totalLost: 0,
            lastDaily: 0, lastWork: 0, lastBeg: 0
        };
        saveEconomy();
    }
    return economyData.users[key];
}
function coins(amount) { return `🪙 ${Number(amount).toLocaleString()}`; }
function clampBet(balance, amount) { return Number.isInteger(amount) && amount >= 10 && amount <= balance; }
function randomItem(items) { return items[Math.floor(Math.random() * items.length)]; }
function formatCooldown(ms) {
    const sec = Math.ceil(ms / 1000), min = Math.floor(sec / 60), hrs = Math.floor(min / 60);
    if (hrs) return `${hrs}h ${min % 60}m`;
    if (min) return `${min}m ${sec % 60}s`;
    return `${sec}s`;
}
function progressBar(value, max, length = 10) {
    const filled = Math.max(0, Math.min(length, Math.round((value / max) * length)));
    return "█".repeat(filled) + "░".repeat(length - filled);
}
loadEconomy();

const BELOVED_PINK = 0xFF69B4;

function belovedEmbed(title) {
    return new EmbedBuilder()
        .setColor(BELOVED_PINK)
        .setTitle(title);
}

const SLOT_SYMBOLS = [
    { emoji: "🍒", weight: 28, mult: 3 }, { emoji: "🍋", weight: 24, mult: 4 },
    { emoji: "🍇", weight: 19, mult: 5 }, { emoji: "🔔", weight: 14, mult: 8 },
    { emoji: "💎", weight: 9, mult: 12 }, { emoji: "7️⃣", weight: 5, mult: 20 },
    { emoji: "👑", weight: 1, mult: 50 }
];
function weightedSlotSymbol() {
    const total = SLOT_SYMBOLS.reduce((a, s) => a + s.weight, 0);
    let roll = Math.random() * total;
    for (const symbol of SLOT_SYMBOLS) { roll -= symbol.weight; if (roll <= 0) return symbol; }
    return SLOT_SYMBOLS[0];
}
function slotGrid(finalRow = null) {
    const rows = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => weightedSlotSymbol()));
    if (finalRow) rows[1] = finalRow;
    return rows;
}

function renderSlotReels(grid, status = "SPINNING") {
    const rows = grid.map(row => row.map(item => item.emoji));

    return [
        "```",
        "┌─────────────────┐",
        `│  ${rows[0][0]}  │  ${rows[0][1]}  │  ${rows[0][2]}  │`,
        `│  ${rows[1][0]}  │  ${rows[1][1]}  │  ${rows[1][2]}  │  ◀`,
        `│  ${rows[2][0]}  │  ${rows[2][1]}  │  ${rows[2][2]}  │`,
        "├─────────────────┤",
        `│     ${status.padStart(5).padEnd(9)}     │`,
        "└─────────────────┘",
        "```"
    ].join("\n");
}

function evaluateSlots(row, bet) {
    const [a,b,c] = row;
    if (a.emoji === b.emoji && b.emoji === c.emoji) return { payout: bet * a.mult, label: a.emoji === "👑" ? "ROYAL JACKPOT" : "THREE OF A KIND" };
    if (a.emoji === b.emoji || b.emoji === c.emoji || a.emoji === c.emoji) return { payout: Math.floor(bet * 1.5), label: "PAIR WIN" };
    if (row.some(x => x.emoji === "7️⃣") && row.some(x => x.emoji === "💎")) return { payout: bet * 2, label: "LUCKY COMBO" };
    return { payout: 0, label: "HOUSE WINS" };
}

const CARD_SUITS = ["♠️", "♥️", "♦️", "♣️"];
const CARD_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
function createDeck() {
    const deck = [];
    for (const suit of CARD_SUITS) for (const rank of CARD_RANKS) deck.push({ suit, rank });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    return deck;
}
function handValue(hand) {
    let value = 0, aces = 0;
    for (const card of hand) { if (card.rank === "A") { value += 11; aces++; } else if (["K","Q","J"].includes(card.rank)) value += 10; else value += Number(card.rank); }
    while (value > 21 && aces) { value -= 10; aces--; }
    return value;
}
function renderHand(hand, hidden = false) {
    if (hidden) return `${hand[0].rank}${hand[0].suit}  🎴`;
    return hand.map(card => `${card.rank}${card.suit}`).join("  ");
}
function blackjackButtons(id, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`blackjack:hit:${id}`).setLabel("Hit").setEmoji("➕").setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`blackjack:stand:${id}`).setLabel("Stand").setEmoji("✋").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`blackjack:double:${id}`).setLabel("Double").setEmoji("💰").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}
function blackjackEmbed(game, reveal = false, result = null) {
    const playerValue = handValue(game.player);
    const dealerValue = reveal ? handValue(game.dealer) : "?";

    return belovedEmbed("🃏 Beloved Blackjack")
        .setDescription(result || "Choose your move below.")
        .addFields(
            {
                name: `Dealer ${reveal ? `• ${dealerValue}` : "• hidden"}`,
                value: `> ${renderHand(game.dealer, !reveal)}`,
                inline: false
            },
            {
                name: `Your hand • ${playerValue}`,
                value: `> ${renderHand(game.player)}`,
                inline: false
            },
            { name: "Bet", value: coins(game.bet), inline: true },
            { name: "Status", value: playerValue > 21 ? "Busted 💥" : `${progressBar(Math.min(playerValue, 21), 21, 10)} ${playerValue}/21`, inline: true }
        )
        .setFooter({ text: "Dealer stands on 17 • Blackjack pays 3:2" })
        .setTimestamp();
}

async function finishBlackjack(interaction, game, reason = "stand") {
    if (game.ended) return;
    game.ended = true;
    if (reason !== "bust") while (handValue(game.dealer) < 17) game.dealer.push(game.deck.pop());
    const pv = handValue(game.player), dv = handValue(game.dealer);
    let payout = 0, result;
    const natural = game.player.length === 2 && pv === 21;
    if (pv > 21) result = `💥 **BUST!** You lost ${coins(game.bet)}.`;
    else if (dv > 21 || pv > dv) { payout = natural ? Math.floor(game.bet * 2.5) : game.bet * 2; result = natural ? `✨ **BLACKJACK!** You won ${coins(payout - game.bet)} profit.` : `🏆 **YOU WIN!** Profit: ${coins(game.bet)}.`; }
    else if (pv === dv) { payout = game.bet; result = "🤝 **PUSH.** Your bet was returned."; }
    else result = `💀 **DEALER WINS.** You lost ${coins(game.bet)}.`;
    const user = getEconomyUser(game.guildId, game.userId);
    user.balance += payout;
    if (payout > game.bet) user.totalWon += payout - game.bet; else if (!payout) user.totalLost += game.bet;
    saveEconomy();
    activeBlackjackGames.delete(game.id);
    await interaction.update({ embeds: [blackjackEmbed(game, true, `${result}

**Balance:** ${coins(user.balance)}`)], components: [blackjackButtons(game.id, true)] });
}


// ==================================================
// CONFLICT GUARD V2 CONFIG
// ==================================================

const DEFAULT_CONFLICT_SETTINGS = {
    enabled: true,
    sensitivity: "normal",
    funnyMessages: true,
    slowmodeEnabled: true,
    timeoutEnabled: false,
    logChannelId: null
};

const sensitivityLevels = {
    low: {
        warningThreshold: 8,
        slowmodeThreshold: 13,
        timeoutThreshold: 19
    },
    normal: {
        warningThreshold: 6,
        slowmodeThreshold: 10,
        timeoutThreshold: 15
    },
    high: {
        warningThreshold: 4,
        slowmodeThreshold: 7,
        timeoutThreshold: 11
    }
};

const CONVERSATION_WINDOW = 90 * 1000;
const PAIR_EXPIRY = 10 * 60 * 1000;
const WARNING_COOLDOWN = 45 * 1000;

const SLOWMODE_SECONDS = 10;
const SLOWMODE_DURATION = 5 * 60 * 1000;
const AUTO_TIMEOUT_DURATION = 10 * 60 * 1000;

const conflictSettings = new Map();
const conflictPairs = new Map();
const recentChannelMessages = new Map();
const channelConflictStates = new Map();
const recentlyWarnedPairs = new Map();


// ==================================================
// HOSTILITY DETECTION
// ==================================================

// Ordinary swearing is not enough to trigger the guard.
// These patterns focus on words aimed at another person.

const severeHostilityPatterns = [
    /\bk\s*y\s*s\b/i,
    /\bkill\s+yourself\b/i,
    /\bgo\s+die\b/i,
    /\bi\s+hope\s+you\s+die\b/i,
    /\byou\s+should\s+die\b/i,
    /\bnobody\s+would\s+miss\s+you\b/i,
    /\bfall\s+on\s+your\s+neck\b/i
];

const strongHostilityPatterns = [
    /\bfuck\s+you\b/i,
    /\bfuck\s+off\b/i,
    /\bget\s+the\s+fuck\s+out(?:ta| of)\s+my\s+face\b/i,
    /\bstfu\b/i,
    /\bshut\s+(?:the\s+fuck\s+)?up\b/i,
    /\bi\s+hate\s+(?:you|u)\b/i,
    /\bnobody\s+likes\s+you\b/i,
    /\bnobody\s+cares\s+about\s+you\b/i,
    /\byou(?:'re| are)\s+(?:a\s+)?(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo|failure|bitch)\b/i,
    /\byou\s+(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo|bitch)\b/i,
    /\bbitch\s+ass\b/i,
    /\bface\s*bitch\b/i
];

const mediumHostilityPatterns = [
    /\byou(?:'re| are)\s+(?:so\s+)?(?:stupid|dumb|pathetic|useless|annoying|embarrassing|delusional|ugly)\b/i,
    /\bare\s+you\s+(?:actually\s+)?(?:stupid|dumb)\b/i,
    /\bget\s+a\s+life\b/i,
    /\bkeep\s+crying\b/i,
    /\bcry\s+more\b/i,
    /\bcry\s+about\s+it\b/i,
    /\bstay\s+mad\b/i,
    /\byou(?:'re| are)\s+mad\b/i,
    /\byou(?:'re| are)\s+obsessed\b/i,
    /\bno\s+one\s+asked\s+you\b/i,
    /\byou\s+make\s+no\s+sense\b/i,
    /\bwhat\s+is\s+wrong\s+with\s+you\b/i
];

const lightHostilityPatterns = [
    /\bidiot\b/i,
    /\bmoron\b/i,
    /\bloser\b/i,
    /\bclown\b/i,
    /\bweirdo\b/i,
    /\bdumbass\b/i,
    /\bbitch\b/i,
    /\bshut\s+up\b/i,
    /\bget\s+lost\b/i,
    /\bcan\s+you\s+read\b/i
];

const funnyConflictWarnings = [
    "🚨 Certified yap battle detected. Both of you take a breather 😭",
    "🍿 Beloved enjoyed the first episode, but this drama needs a commercial break.",
    "🛑 Friendship.exe has stopped responding. Please restart peacefully.",
    "⚔️ The argument expansion pack has been temporarily disabled.",
    "💖 Beloved requests peace before somebody writes a twelve-page response.",
    "📢 Both contestants have been disqualified from the Yap Olympics.",
    "🧯 This conversation is beginning to smoke. Everybody step back.",
    "🎬 Cut! The argument scene was convincing, but we are moving on now.",
    "😭 You two are arguing like there is prize money involved."
];

const seriousConflictWarnings = [
    "⚠️ This conversation is becoming hostile. Please take a break.",
    "⚠️ Stop the personal attacks and move on from this conversation.",
    "⚠️ This argument is escalating. Further hostility may trigger slowmode.",
    "⚠️ Keep the conversation respectful. Personal attacks are not allowed."
];


// ==================================================
// CONFLICT GUARD HELPERS
// ==================================================

function getGuildSettings(guildId) {
    if (!conflictSettings.has(guildId)) {
        conflictSettings.set(guildId, {
            ...DEFAULT_CONFLICT_SETTINGS
        });
    }

    return conflictSettings.get(guildId);
}

function normaliseMessage(content) {
    return content
        .toLowerCase()
        .replace(/<@!?\d+>/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[^\w\s']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function matchesAnyPattern(content, patterns) {
    return patterns.some(pattern => pattern.test(content));
}

function calculateHostilityScore(content, hasTargetContext) {
    const clean = normaliseMessage(content);

    let score = 0;
    let severity = "none";

    if (matchesAnyPattern(clean, severeHostilityPatterns)) {
        score += 8;
        severity = "severe";
    }

    if (matchesAnyPattern(clean, strongHostilityPatterns)) {
        score += 4;

        if (severity === "none") {
            severity = "strong";
        }
    }

    if (matchesAnyPattern(clean, mediumHostilityPatterns)) {
        score += 2;

        if (severity === "none") {
            severity = "medium";
        }
    }

    if (
        hasTargetContext &&
        matchesAnyPattern(clean, lightHostilityPatterns)
    ) {
        score += 1;

        if (severity === "none") {
            severity = "light";
        }
    }

    if (hasTargetContext && score > 0) {
        score += 0.5;
    }

    return {
        score,
        severity
    };
}

function getPairKey(guildId, firstUserId, secondUserId) {
    const sorted = [firstUserId, secondUserId].sort();
    return `${guildId}:${sorted[0]}:${sorted[1]}`;
}

function isModerator(member) {
    if (!member) {
        return false;
    }

    return member.permissions.has(
        PermissionFlagsBits.Administrator
    ) || member.permissions.has(
        PermissionFlagsBits.ModerateMembers
    ) || member.permissions.has(
        PermissionFlagsBits.ManageMessages
    );
}

function getRecentMessages(channelId) {
    const messages = recentChannelMessages.get(channelId) || [];
    const cutoff = Date.now() - CONVERSATION_WINDOW;

    const fresh = messages.filter(
        item => item.timestamp >= cutoff
    );

    recentChannelMessages.set(channelId, fresh);
    return fresh;
}

function rememberChannelMessage(message, hostility) {
    const messages = getRecentMessages(message.channel.id);

    messages.push({
        authorId: message.author.id,
        member: message.member,
        content: message.content,
        hostilityScore: hostility.score,
        severity: hostility.severity,
        timestamp: Date.now()
    });

    while (messages.length > 30) {
        messages.shift();
    }

    recentChannelMessages.set(message.channel.id, messages);
}

async function findExplicitTarget(message) {
    if (message.reference?.messageId) {
        try {
            const repliedMessage = await message.channel.messages.fetch(
                message.reference.messageId
            );

            if (
                repliedMessage &&
                !repliedMessage.author.bot &&
                repliedMessage.author.id !== message.author.id
            ) {
                return {
                    user: repliedMessage.author,
                    member: repliedMessage.member,
                    method: "reply"
                };
            }
        } catch (error) {
            console.error(
                "Could not fetch replied message:",
                error.message
            );
        }
    }

    const mentionedMember = message.mentions.members.find(
        member =>
            !member.user.bot &&
            member.id !== message.author.id
    );

    if (mentionedMember) {
        return {
            user: mentionedMember.user,
            member: mentionedMember,
            method: "mention"
        };
    }

    return null;
}

function inferConversationTarget(message) {
    const recent = getRecentMessages(message.channel.id);

    // Look backwards for the most recent different human speaker.
    // This lets the bot catch normal channel arguments without replies.
    for (let index = recent.length - 1; index >= 0; index--) {
        const previous = recent[index];

        if (previous.authorId === message.author.id) {
            continue;
        }

        // Only infer a target when the previous message was recent enough.
        if (Date.now() - previous.timestamp > 30 * 1000) {
            return null;
        }

        return {
            userId: previous.authorId,
            member: previous.member,
            method: "conversation-flow",
            previousWasHostile: previous.hostilityScore > 0
        };
    }

    return null;
}

function cleanConflictPair(pairData) {
    const cutoff = Date.now() - CONVERSATION_WINDOW;

    pairData.messages = pairData.messages.filter(
        item => item.timestamp >= cutoff
    );

    pairData.totalScore = pairData.messages.reduce(
        (total, item) => total + item.score,
        0
    );
}

function hasMutualArgument(pairData) {
    return new Set(
        pairData.messages.map(item => item.authorId)
    ).size >= 2;
}

function getExchangeCount(pairData) {
    let exchanges = 0;

    for (let index = 1; index < pairData.messages.length; index++) {
        if (
            pairData.messages[index].authorId !==
            pairData.messages[index - 1].authorId
        ) {
            exchanges++;
        }
    }

    return exchanges;
}

function pairWasRecentlyWarned(pairKey) {
    const warnedAt = recentlyWarnedPairs.get(pairKey);

    if (!warnedAt) {
        return false;
    }

    if (Date.now() - warnedAt > WARNING_COOLDOWN) {
        recentlyWarnedPairs.delete(pairKey);
        return false;
    }

    return true;
}

async function sendConflictLog(guild, settings, data) {
    if (!settings.logChannelId) {
        return;
    }

    const logChannel = guild.channels.cache.get(
        settings.logChannelId
    );

    if (!logChannel || !logChannel.isTextBased()) {
        return;
    }

    try {
        await logChannel.send({
            content:
                `🛡️ **Beloved Conflict Guard V2**\n` +
                `**Action:** ${data.action}\n` +
                `**Channel:** <#${data.channelId}>\n` +
                `**Members:** <@${data.userOneId}> and <@${data.userTwoId}>\n` +
                `**Score:** ${data.score}\n` +
                `**Exchanges:** ${data.exchanges}`,
            allowedMentions: {
                parse: []
            }
        });
    } catch (error) {
        console.error(
            "Could not send Conflict Guard log:",
            error.message
        );
    }
}

async function enableTemporarySlowmode(channel) {
    if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
    ) {
        return {
            success: false,
            reason: "unsupported-channel"
        };
    }

    const key = `${channel.guild.id}:${channel.id}`;

    if (channelConflictStates.has(key)) {
        return {
            success: true,
            alreadyActive: true
        };
    }

    const botMember = channel.guild.members.me;

    if (
        !botMember ||
        !channel.permissionsFor(botMember)?.has(
            PermissionFlagsBits.ManageChannels
        )
    ) {
        return {
            success: false,
            reason: "missing-permission"
        };
    }

    const originalSlowmode = channel.rateLimitPerUser || 0;

    try {
        await channel.setRateLimitPerUser(
            Math.max(originalSlowmode, SLOWMODE_SECONDS),
            "Beloved Conflict Guard detected an escalating argument"
        );

        const timeout = setTimeout(async () => {
            try {
                const state = channelConflictStates.get(key);

                if (!state) {
                    return;
                }

                await channel.setRateLimitPerUser(
                    state.originalSlowmode,
                    "Beloved Conflict Guard slowmode expired"
                );

                channelConflictStates.delete(key);

                await channel.send(
                    "🕊️ Temporary slowmode has ended. Keep it peaceful."
                );
            } catch (error) {
                console.error(
                    "Could not restore slowmode:",
                    error.message
                );

                channelConflictStates.delete(key);
            }
        }, SLOWMODE_DURATION);

        channelConflictStates.set(key, {
            originalSlowmode,
            timeout
        });

        return {
            success: true,
            alreadyActive: false
        };
    } catch (error) {
        console.error(
            "Could not enable slowmode:",
            error.message
        );

        return {
            success: false,
            reason: "discord-error"
        };
    }
}

async function timeoutMember(member, reason) {
    if (!member || isModerator(member) || !member.moderatable) {
        return false;
    }

    try {
        await member.timeout(
            AUTO_TIMEOUT_DURATION,
            reason
        );

        return true;
    } catch (error) {
        console.error(
            "Could not timeout member:",
            error.message
        );

        return false;
    }
}


// ==================================================
// CONFLICT GUARD V2 PROCESSOR
// ==================================================

async function processConflictMessage(message) {
    if (!message.guild || !message.member) {
        return;
    }

    const settings = getGuildSettings(message.guild.id);

    if (!settings.enabled || isModerator(message.member)) {
        return;
    }

    const explicitTarget = await findExplicitTarget(message);
    const inferredTarget = explicitTarget
        ? null
        : inferConversationTarget(message);

    const hasTargetContext = Boolean(
        explicitTarget || inferredTarget
    );

    const hostility = calculateHostilityScore(
        message.content,
        hasTargetContext
    );

    // Remember every message so future messages can use conversation flow.
    rememberChannelMessage(message, hostility);

    if (hostility.score <= 0 || !hasTargetContext) {
        return;
    }

    const targetId = explicitTarget
        ? explicitTarget.user.id
        : inferredTarget.userId;

    if (!targetId || targetId === message.author.id) {
        return;
    }

    const pairKey = getPairKey(
        message.guild.id,
        message.author.id,
        targetId
    );

    let pairData = conflictPairs.get(pairKey);

    if (!pairData) {
        pairData = {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userIds: [message.author.id, targetId],
            messages: [],
            totalScore: 0,
            warned: false,
            slowmodeTriggered: false,
            timeoutTriggered: false,
            lastUpdated: Date.now()
        };
    }

    cleanConflictPair(pairData);

    let score = hostility.score;

    // Conversation-flow detection gets stronger when the previous speaker
    // was also hostile, because that is a clear back-and-forth fight.
    if (
        inferredTarget &&
        inferredTarget.previousWasHostile
    ) {
        score += 1.5;
    }

    const sameAuthorCount = pairData.messages.filter(
        item => item.authorId === message.author.id
    ).length;

    if (sameAuthorCount >= 2) {
        score += 1;
    }

    pairData.messages.push({
        authorId: message.author.id,
        targetId,
        score,
        severity: hostility.severity,
        timestamp: Date.now(),
        messageId: message.id,
        targetMethod: explicitTarget
            ? explicitTarget.method
            : inferredTarget.method
    });

    pairData.channelId = message.channel.id;
    pairData.lastUpdated = Date.now();

    cleanConflictPair(pairData);
    conflictPairs.set(pairKey, pairData);

    const level = sensitivityLevels[
        settings.sensitivity
    ] || sensitivityLevels.normal;

    const mutual = hasMutualArgument(pairData);
    const exchanges = getExchangeCount(pairData);
    const severe = pairData.messages.some(
        item => item.severity === "severe"
    );
    const repeatedTargeting = pairData.messages.length >= 3;

    // A severe threat can trigger immediately.
    // Otherwise require back-and-forth or repeated targeting.
    if (!severe && !mutual && !repeatedTargeting) {
        return;
    }

    if (
        pairData.totalScore >= level.warningThreshold &&
        !pairData.warned &&
        !pairWasRecentlyWarned(pairKey)
    ) {
        pairData.warned = true;
        recentlyWarnedPairs.set(pairKey, Date.now());

        const warningPool = settings.funnyMessages
            ? funnyConflictWarnings
            : seriousConflictWarnings;

        const warning = warningPool[
            Math.floor(Math.random() * warningPool.length)
        ];

        await message.channel.send({
            content:
                `${warning}\n\n` +
                `<@${pairData.userIds[0]}> and ` +
                `<@${pairData.userIds[1]}>, move on or take a break.`,
            allowedMentions: {
                users: pairData.userIds
            }
        });

        await sendConflictLog(
            message.guild,
            settings,
            {
                action: "Warning issued",
                channelId: message.channel.id,
                userOneId: pairData.userIds[0],
                userTwoId: pairData.userIds[1],
                score: pairData.totalScore,
                exchanges
            }
        );
    }

    if (
        settings.slowmodeEnabled &&
        pairData.totalScore >= level.slowmodeThreshold &&
        !pairData.slowmodeTriggered
    ) {
        pairData.slowmodeTriggered = true;

        const result = await enableTemporarySlowmode(
            message.channel
        );

        if (result.success && !result.alreadyActive) {
            await message.channel.send(
                `🐌 Argument continued. This channel now has ` +
                `${SLOWMODE_SECONDS}-second slowmode for 5 minutes.`
            );

            await sendConflictLog(
                message.guild,
                settings,
                {
                    action: "Temporary slowmode enabled",
                    channelId: message.channel.id,
                    userOneId: pairData.userIds[0],
                    userTwoId: pairData.userIds[1],
                    score: pairData.totalScore,
                    exchanges
                }
            );
        }
    }

    if (
        settings.timeoutEnabled &&
        pairData.totalScore >= level.timeoutThreshold &&
        !pairData.timeoutTriggered
    ) {
        pairData.timeoutTriggered = true;

        const timedOut = await timeoutMember(
            message.member,
            "Repeated targeted hostility detected by Beloved Conflict Guard"
        );

        if (timedOut) {
            await message.channel.send({
                content:
                    `⏰ <@${message.author.id}> has been timed out ` +
                    `for 10 minutes after continuing the argument.`,
                allowedMentions: {
                    users: [message.author.id]
                }
            });

            await sendConflictLog(
                message.guild,
                settings,
                {
                    action: `Timed out ${message.author.tag}`,
                    channelId: message.channel.id,
                    userOneId: pairData.userIds[0],
                    userTwoId: pairData.userIds[1],
                    score: pairData.totalScore,
                    exchanges
                }
            );
        }
    }
}


// Clean old memory.

setInterval(() => {
    const expiry = Date.now() - PAIR_EXPIRY;

    for (const [key, pair] of conflictPairs) {
        if (pair.lastUpdated < expiry) {
            conflictPairs.delete(key);
        }
    }

    for (const [key, warnedAt] of recentlyWarnedPairs) {
        if (Date.now() - warnedAt > WARNING_COOLDOWN) {
            recentlyWarnedPairs.delete(key);
        }
    }

    for (const [channelId] of recentChannelMessages) {
        getRecentMessages(channelId);
    }
}, 60 * 1000);


// ==================================================
// SMASH OR PASS GAME
// ==================================================

const activeSmashOrPassGames = new Map();

function buildSmashOrPassButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`sop:smash:${gameId}`)
            .setLabel("Smash")
            .setEmoji("❤️")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`sop:pass:${gameId}`)
            .setLabel("Pass")
            .setEmoji("❌")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function buildSmashOrPassEmbed(game, ended = false) {
    const smashCount = [...game.votes.values()].filter(vote => vote === "smash").length;
    const passCount = [...game.votes.values()].filter(vote => vote === "pass").length;

    const embed = new EmbedBuilder()
        .setTitle(ended ? "🔥 Smash or Pass — Results" : "🔥 Smash or Pass")
        .setDescription(
            `**Target:** <@${game.targetId}>\n` +
            `**Started by:** <@${game.hostId}>`
        )
        .addFields(
            {
                name: "❤️ Smash",
                value: `${smashCount} vote${smashCount === 1 ? "" : "s"}`,
                inline: true
            },
            {
                name: "❌ Pass",
                value: `${passCount} vote${passCount === 1 ? "" : "s"}`,
                inline: true
            }
        )
        .setThumbnail(game.targetAvatar)
        .setFooter({
            text: ended
                ? "Voting has ended — Beloved brought receipts."
                : "One vote per person. Click again to change your vote."
        })
        .setTimestamp();

    if (!ended) {
        embed.addFields({
            name: "⏳ Time remaining",
            value: `<t:${Math.floor(game.endsAt / 1000)}:R>`,
            inline: false
        });
    }

    return embed;
}

function formatVoterList(userIds) {
    if (userIds.length === 0) {
        return "Nobody 😭";
    }

    const mentions = userIds.map(userId => `<@${userId}>`);
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

    if (current) {
        lines.push(current);
    }

    return lines.join("\n").slice(0, 1024);
}

async function finishSmashOrPassGame(gameId) {
    const game = activeSmashOrPassGames.get(gameId);

    if (!game || game.ended) {
        return;
    }

    game.ended = true;
    activeSmashOrPassGames.delete(gameId);

    const smashVoters = [];
    const passVoters = [];

    for (const [userId, vote] of game.votes) {
        if (vote === "smash") {
            smashVoters.push(userId);
        } else {
            passVoters.push(userId);
        }
    }

    let result;

    if (smashVoters.length > passVoters.length) {
        result = "❤️ **SMASH WINS**";
    } else if (passVoters.length > smashVoters.length) {
        result = "❌ **PASS WINS**";
    } else {
        result = "🤝 **IT'S A TIE**";
    }

    const embed = buildSmashOrPassEmbed(game, true)
        .addFields(
            {
                name: `❤️ Voted Smash (${smashVoters.length})`,
                value: formatVoterList(smashVoters),
                inline: false
            },
            {
                name: `❌ Voted Pass (${passVoters.length})`,
                value: formatVoterList(passVoters),
                inline: false
            },
            {
                name: "🏆 Final result",
                value: result,
                inline: false
            }
        );

    try {
        await game.message.edit({
            embeds: [embed],
            components: [buildSmashOrPassButtons(gameId, true)],
            allowedMentions: {
                parse: []
            }
        });
    } catch (error) {
        console.error("Could not finish Smash or Pass game:", error.message);
    }
}


// ==================================================
// EXTRA CHAOS GAMES
// ==================================================

const activeMarriages = new Map();
const activeCourts = new Map();
const activeFights = new Map();

function disableRow(row) {
    return new ActionRowBuilder().addComponents(
        row.components.map(component =>
            ButtonBuilder.from(component).setDisabled(true)
        )
    );
}

function buildMarriageEmbed(game, result = null) {
    const embed = new EmbedBuilder()
        .setTitle(result ? "💍 Proposal Results" : "💍 A Very Serious Proposal")
        .setDescription(
            `<@${game.proposerId}> has proposed to <@${game.targetId}>!\n\n` +
            (result || "Will they accept this legally questionable Discord marriage?")
        )
        .setFooter({ text: result ? "Beloved has witnessed everything." : "Only the proposed user can answer." })
        .setTimestamp();
    return embed;
}

function buildMarriageButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`marry:accept:${gameId}`)
            .setLabel("Accept")
            .setEmoji("💖")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`marry:reject:${gameId}`)
            .setLabel("Reject")
            .setEmoji("💔")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    );
}

function buildCourtButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`court:guilty:${gameId}`)
            .setLabel("Guilty")
            .setEmoji("🔨")
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`court:notguilty:${gameId}`)
            .setLabel("Not Guilty")
            .setEmoji("😇")
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled)
    );
}

function buildCourtEmbed(game, ended = false) {
    const guilty = [...game.votes.values()].filter(v => v === "guilty").length;
    const notGuilty = [...game.votes.values()].filter(v => v === "notguilty").length;
    const embed = new EmbedBuilder()
        .setTitle(ended ? "⚖️ Court Verdict" : "⚖️ Beloved Court Is Now In Session")
        .setDescription(
            `**Defendant:** <@${game.accusedId}>\n` +
            `**Accused by:** <@${game.hostId}>\n` +
            `**Charge:** ${game.charge}`
        )
        .addFields(
            { name: "🔨 Guilty", value: `${guilty} vote${guilty === 1 ? "" : "s"}`, inline: true },
            { name: "😇 Not Guilty", value: `${notGuilty} vote${notGuilty === 1 ? "" : "s"}`, inline: true }
        )
        .setFooter({ text: ended ? "The jury has spoken. Receipts are public." : "One vote each. You may change your vote." })
        .setTimestamp();
    if (!ended) {
        embed.addFields({ name: "⏳ Court closes", value: `<t:${Math.floor(game.endsAt / 1000)}:R>` });
    }
    return embed;
}

async function finishCourt(gameId) {
    const game = activeCourts.get(gameId);
    if (!game || game.ended) return;
    game.ended = true;
    activeCourts.delete(gameId);

    const guilty = [];
    const notGuilty = [];
    for (const [id, vote] of game.votes) {
        (vote === "guilty" ? guilty : notGuilty).push(id);
    }
    const verdict = guilty.length > notGuilty.length
        ? "🔨 **GUILTY!** Sentenced to public embarrassment."
        : notGuilty.length > guilty.length
            ? "😇 **NOT GUILTY!** The defendant walks free."
            : "🤝 **HUNG JURY!** Everyone argued and achieved nothing.";

    const embed = buildCourtEmbed(game, true)
        .addFields(
            { name: "📢 Verdict", value: verdict },
            { name: `🔨 Guilty voters (${guilty.length})`, value: formatVoterList(guilty) },
            { name: `😇 Not Guilty voters (${notGuilty.length})`, value: formatVoterList(notGuilty) }
        );
    await game.message.edit({ embeds: [embed], components: [buildCourtButtons(gameId, true)] }).catch(() => {});
}

function buildFightButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`fight:punch:${gameId}`).setLabel("Punch").setEmoji("👊").setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fight:block:${gameId}`).setLabel("Block").setEmoji("🛡️").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fight:special:${gameId}`).setLabel("Special").setEmoji("💥").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function healthBar(hp) {
    const full = Math.max(0, Math.min(10, Math.round(hp / 10)));
    return "█".repeat(full) + "░".repeat(10 - full);
}

function buildFightEmbed(game, ended = false, finalText = null) {
    const one = game.players[0];
    const two = game.players[1];
    return new EmbedBuilder()
        .setTitle(ended ? "🏆 Fight Finished" : "⚔️ Beloved Fight Club")
        .setDescription(
            `<@${one}>  **${game.hp[one]} HP**\n${healthBar(game.hp[one])}\n\n` +
            `<@${two}>  **${game.hp[two]} HP**\n${healthBar(game.hp[two])}\n\n` +
            (finalText || `🎯 **Current turn:** <@${game.turn}>\n${game.lastAction}`)
        )
        .setFooter({ text: ended ? "Beloved accepts no liability for hurt feelings." : "Punch, block, or use your special attack." })
        .setTimestamp();
}

function buildFightInviteButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`fightaccept:yes:${gameId}`).setLabel("Accept Fight").setEmoji("⚔️").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`fightaccept:no:${gameId}`).setLabel("Run Away").setEmoji("🏃").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

const cancelReasons = [
    "putting milk in before cereal", "typing ‘k’ after a five-paragraph message",
    "stealing fries and calling it tax", "having 47 unread notifications",
    "saying ‘one more game’ at 3 AM", "using light mode at full brightness",
    "laughing before telling the joke", "being emotionally attached to their Wi-Fi router",
    "leaving people on delivered while actively posting memes", "calling every animal a dog",
    "owning a suspicious number of charging cables", "saying ‘it is what it is’ after causing the problem",
    "being too loud in the group chat", "replying ‘who asked’ when nobody asked them either",
    "losing an argument to autocorrect", "eating the last snack without announcing it"
];


// ==================================================
// GUESS THE COUNTRY TOURNAMENT
// ==================================================

const activeCountryGames = new Map();
const countryGameByChannel = new Map();
const COUNTRY_JOIN_EMOJI = "🌍";

const COUNTRY_QUESTIONS = [
    { country: "France", flag: "🇫🇷", aliases: ["france"], hints: ["The Eiffel Tower is here.", "Its capital is Paris.", "Famous for croissants and the Louvre."] },
    { country: "Japan", flag: "🇯🇵", aliases: ["japan"], hints: ["This island nation is in East Asia.", "Its capital is Tokyo.", "Famous for anime, sushi, and Mount Fuji."] },
    { country: "Brazil", flag: "🇧🇷", aliases: ["brazil", "brasil"], hints: ["The largest country in South America.", "The Amazon rainforest covers much of it.", "Famous for carnival and football."] },
    { country: "Canada", flag: "🇨🇦", aliases: ["canada"], hints: ["It has the world's longest coastline.", "Its capital is Ottawa.", "Its flag features a maple leaf."] },
    { country: "Italy", flag: "🇮🇹", aliases: ["italy"], hints: ["This country is shaped like a boot.", "Its capital is Rome.", "Famous for pizza, pasta, and the Colosseum."] },
    { country: "Egypt", flag: "🇪🇬", aliases: ["egypt"], hints: ["The River Nile runs through it.", "Its capital is Cairo.", "Home of the Great Pyramids of Giza."] },
    { country: "Australia", flag: "🇦🇺", aliases: ["australia"], hints: ["It is both a country and a continent.", "Its capital is Canberra.", "Known for kangaroos and the Great Barrier Reef."] },
    { country: "India", flag: "🇮🇳", aliases: ["india"], hints: ["It is the world's most populous country.", "Its capital is New Delhi.", "The Taj Mahal is here."] },
    { country: "Mexico", flag: "🇲🇽", aliases: ["mexico"], hints: ["It borders the United States to the north.", "Its capital is Mexico City.", "Famous for tacos and ancient Maya sites."] },
    { country: "South Korea", flag: "🇰🇷", aliases: ["south korea", "korea", "republic of korea"], hints: ["This East Asian country shares a peninsula with North Korea.", "Its capital is Seoul.", "Known worldwide for K-pop and K-dramas."] },
    { country: "United Kingdom", flag: "🇬🇧", aliases: ["united kingdom", "uk", "great britain", "britain"], hints: ["It consists of four nations.", "Its capital is London.", "Big Ben and Buckingham Palace are here."] },
    { country: "United States", flag: "🇺🇸", aliases: ["united states", "usa", "us", "america", "united states of america"], hints: ["It has 50 states.", "Its capital is Washington, D.C.", "Its flag is known as the Stars and Stripes."] },
    { country: "Spain", flag: "🇪🇸", aliases: ["spain"], hints: ["It occupies most of the Iberian Peninsula.", "Its capital is Madrid.", "Famous for flamenco and paella."] },
    { country: "Germany", flag: "🇩🇪", aliases: ["germany"], hints: ["This country is in central Europe.", "Its capital is Berlin.", "Known for Oktoberfest and the Autobahn."] },
    { country: "Greece", flag: "🇬🇷", aliases: ["greece"], hints: ["Often called the birthplace of democracy.", "Its capital is Athens.", "The Acropolis is here."] },
    { country: "China", flag: "🇨🇳", aliases: ["china", "people's republic of china", "peoples republic of china", "prc"], hints: ["This country is in East Asia.", "Its capital is Beijing.", "The Great Wall runs across its north."] },
    { country: "Argentina", flag: "🇦🇷", aliases: ["argentina"], hints: ["This country lies in southern South America.", "Its capital is Buenos Aires.", "Famous for tango and Lionel Messi."] },
    { country: "Turkey", flag: "🇹🇷", aliases: ["turkey", "turkiye", "türkiye"], hints: ["It spans Europe and Asia.", "Its capital is Ankara.", "Istanbul is its largest city."] },
    { country: "Thailand", flag: "🇹🇭", aliases: ["thailand"], hints: ["This Southeast Asian country was formerly called Siam.", "Its capital is Bangkok.", "Known for temples, beaches, and pad thai."] },
    { country: "Saudi Arabia", flag: "🇸🇦", aliases: ["saudi arabia", "saudi"], hints: ["It occupies most of the Arabian Peninsula.", "Its capital is Riyadh.", "Mecca and Medina are here."] },
    { country: "Nigeria", flag: "🇳🇬", aliases: ["nigeria"], hints: ["It is Africa's most populous country.", "Its capital is Abuja.", "Its film industry is called Nollywood."] },
    { country: "South Africa", flag: "🇿🇦", aliases: ["south africa"], hints: ["It has three capital cities.", "Nelson Mandela became its first Black president.", "Table Mountain overlooks Cape Town."] },
    { country: "Kenya", flag: "🇰🇪", aliases: ["kenya"], hints: ["This East African country sits on the equator.", "Its capital is Nairobi.", "Known for safaris and elite distance runners."] },
    { country: "Morocco", flag: "🇲🇦", aliases: ["morocco"], hints: ["This North African country borders the Atlantic and Mediterranean.", "Its capital is Rabat.", "Marrakesh and the Atlas Mountains are here."] },
    { country: "Portugal", flag: "🇵🇹", aliases: ["portugal"], hints: ["It is the westernmost country of mainland Europe.", "Its capital is Lisbon.", "Famous for port wine and Cristiano Ronaldo."] },
    { country: "Netherlands", flag: "🇳🇱", aliases: ["netherlands", "the netherlands", "holland"], hints: ["Much of this European country lies below sea level.", "Its capital is Amsterdam.", "Known for windmills, canals, and tulips."] },
    { country: "Switzerland", flag: "🇨🇭", aliases: ["switzerland"], hints: ["This Alpine country is famously neutral.", "Its capital is Bern.", "Known for watches, chocolate, and mountains."] },
    { country: "Sweden", flag: "🇸🇪", aliases: ["sweden"], hints: ["This Nordic country is part of Scandinavia.", "Its capital is Stockholm.", "IKEA and Spotify started here."] },
    { country: "Norway", flag: "🇳🇴", aliases: ["norway"], hints: ["This Nordic country is famous for fjords.", "Its capital is Oslo.", "Its coastline faces the North Atlantic and Arctic oceans."] },
    { country: "Finland", flag: "🇫🇮", aliases: ["finland"], hints: ["It is known as the land of a thousand lakes.", "Its capital is Helsinki.", "Saunas are a major part of its culture."] },
    { country: "Ireland", flag: "🇮🇪", aliases: ["ireland", "republic of ireland"], hints: ["This island country lies west of Great Britain.", "Its capital is Dublin.", "Its national symbol is the harp."] },
    { country: "New Zealand", flag: "🇳🇿", aliases: ["new zealand", "nz", "aotearoa"], hints: ["This Pacific nation has North and South Islands.", "Its capital is Wellington.", "The Lord of the Rings films were shot here."] },
    { country: "Indonesia", flag: "🇮🇩", aliases: ["indonesia"], hints: ["This Southeast Asian nation contains thousands of islands.", "Jakarta is its largest city.", "Bali is one of its most famous islands."] },
    { country: "Philippines", flag: "🇵🇭", aliases: ["philippines", "the philippines"], hints: ["This Southeast Asian archipelago has over 7,000 islands.", "Its capital is Manila.", "It was named after a Spanish king."] },
    { country: "Vietnam", flag: "🇻🇳", aliases: ["vietnam", "viet nam"], hints: ["This long, narrow country is in Southeast Asia.", "Its capital is Hanoi.", "Known for pho and Ha Long Bay."] },
    { country: "Pakistan", flag: "🇵🇰", aliases: ["pakistan"], hints: ["This South Asian country borders India and Afghanistan.", "Its capital is Islamabad.", "K2 lies on its northern border region."] },
    { country: "Bangladesh", flag: "🇧🇩", aliases: ["bangladesh"], hints: ["This densely populated country lies on the Bay of Bengal.", "Its capital is Dhaka.", "Most of it sits in the Ganges-Brahmaputra delta."] },
    { country: "United Arab Emirates", flag: "🇦🇪", aliases: ["united arab emirates", "uae", "emirates"], hints: ["This Gulf country is a federation of seven emirates.", "Its capital is Abu Dhabi.", "Dubai and the Burj Khalifa are here."] },
    { country: "Iceland", flag: "🇮🇸", aliases: ["iceland"], hints: ["This Nordic island sits in the North Atlantic.", "Its capital is Reykjavik.", "Known for volcanoes, glaciers, and geysers."] },
    { country: "Jamaica", flag: "🇯🇲", aliases: ["jamaica"], hints: ["This Caribbean island nation lies south of Cuba.", "Its capital is Kingston.", "Reggae and Bob Marley are closely associated with it."] }
];

function normaliseCountryGuess(text) {
    return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function countryPlayerLines(game, includeEliminated = true) {
    const players = [...game.players.values()]
        .filter(player => includeEliminated || !player.eliminated)
        .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score || b.lives - a.lives);
    if (!players.length) return "Nobody has joined yet.";
    return players.map((player, index) => {
        const crown = index === 0 && game.status === "ended" ? "👑 " : "";
        const state = player.eliminated ? "💀 ELIMINATED" : `${"❤️".repeat(player.lives)}${"🖤".repeat(Math.max(0, game.startingLives - player.lives))}`;
        return `${crown}<@${player.id}> — ${state} • **${player.score}** point${player.score === 1 ? "" : "s"}`;
    }).join("\n").slice(0, 3900);
}

function countryLobbyButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`country:start:${gameId}`).setLabel("Start Now").setEmoji("▶️").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`country:cancel:${gameId}`).setLabel("Cancel").setEmoji("✖️").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function countryLobbyEmbed(game) {
    return belovedEmbed("🌍 Guess the Country — Tournament Lobby")
        .setDescription(`React with ${COUNTRY_JOIN_EMOJI} to enter!\n\n**How it works**\nA country is described with clues. The **first living player** to type the correct country is safe and earns a point. Everyone else loses a life. Lose all lives and you are eliminated.`)
        .addFields(
            { name: "🎮 Host", value: `<@${game.hostId}>`, inline: true },
            { name: "❤️ Lives", value: `${game.startingLives}`, inline: true },
            { name: "⏱️ Round time", value: `${game.roundSeconds} seconds`, inline: true },
            { name: `👥 Players (${game.players.size})`, value: countryPlayerLines(game), inline: false },
            { name: "🚪 Lobby closes", value: `<t:${Math.floor(game.lobbyEndsAt / 1000)}:R>`, inline: false }
        )
        .setFooter({ text: "Minimum 2 players • Host can press Start Now" })
        .setTimestamp();
}

function countryRoundEmbed(game, question) {
    return belovedEmbed(`🌍 Guess the Country • Round ${game.round}`)
        .setDescription(`## ❓ WHICH COUNTRY IS IT?\n\n### Clue 1\n> ${question.hints[0]}\n\nType the country name in chat. First correct answer wins the round!`)
        .addFields(
            { name: "⏳ Time remaining", value: `<t:${Math.floor(game.roundEndsAt / 1000)}:R>`, inline: true },
            { name: "🧍 Still alive", value: `${getAliveCountryPlayers(game).length}`, inline: true },
            { name: "🏆 Scores & lives", value: countryPlayerLines(game), inline: false }
        )
        .setFooter({ text: "Spelling is flexible • Eliminated players cannot answer" })
        .setTimestamp();
}

function getAliveCountryPlayers(game) {
    return [...game.players.values()].filter(player => !player.eliminated);
}

async function updateCountryLobby(game) {
    if (!game.message || game.status !== "lobby") return;
    await game.message.edit({ embeds: [countryLobbyEmbed(game)], components: [countryLobbyButtons(game.id)] }).catch(() => {});
}

async function endCountryGame(game, reason = "winner") {
    if (!game || game.status === "ended") return;
    game.status = "ended";
    clearTimeout(game.lobbyTimer);
    clearTimeout(game.roundTimer);
    clearTimeout(game.hintTimer);
    activeCountryGames.delete(game.id);
    countryGameByChannel.delete(game.channelId);
    const ranked = [...game.players.values()].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.lives - a.lives || b.score - a.score);
    const winner = ranked[0];
    const title = reason === "cancelled" ? "✖️ Country Game Cancelled" : reason === "not-enough" ? "😔 Country Game Cancelled" : "🏆 Guess the Country Champion";
    let description;
    if (reason === "cancelled") description = `The tournament was cancelled by <@${game.hostId}>.`;
    else if (reason === "not-enough") description = `At least **2 players** were needed to begin.`;
    else if (winner) description = `# 👑 <@${winner.id}> WINS!\nThey survived **${game.round} round${game.round === 1 ? "" : "s"}** with **${winner.score} point${winner.score === 1 ? "" : "s"}**.`;
    else description = "Nobody survived the country chaos.";
    const embed = belovedEmbed(title).setDescription(description).addFields({ name: "📊 Final standings", value: countryPlayerLines(game) }).setFooter({ text: "Beloved Geography Department" }).setTimestamp();
    if (game.message) await game.message.edit({ embeds: [embed], components: [countryLobbyButtons(game.id, true)] }).catch(() => {});
    if (game.roundMessage && game.roundMessage.id !== game.message?.id) await game.roundMessage.edit({ components: [] }).catch(() => {});
}

async function startCountryRound(game) {
    if (!game || game.status === "ended") return;
    const alive = getAliveCountryPlayers(game);
    if (alive.length <= 1) return endCountryGame(game, "winner");
    game.status = "round";
    game.round += 1;
    game.roundResolved = false;
    let choices = COUNTRY_QUESTIONS.filter(item => !game.usedCountries.has(item.country));
    if (!choices.length) { game.usedCountries.clear(); choices = COUNTRY_QUESTIONS; }
    game.currentQuestion = randomItem(choices);
    game.usedCountries.add(game.currentQuestion.country);
    game.roundEndsAt = Date.now() + game.roundSeconds * 1000;
    const payload = { embeds: [countryRoundEmbed(game, game.currentQuestion)], components: [] };
    if (game.roundMessage) game.roundMessage = await game.roundMessage.edit(payload).catch(() => null);
    if (!game.roundMessage) game.roundMessage = await game.channel.send(payload);
    game.hintTimer = setTimeout(async () => {
        if (game.status !== "round" || game.roundResolved) return;
        const embed = countryRoundEmbed(game, game.currentQuestion);
        embed.setDescription(`## ❓ WHICH COUNTRY IS IT?\n\n### Clue 1\n> ${game.currentQuestion.hints[0]}\n\n### Clue 2\n> ${game.currentQuestion.hints[1]}\n\nType the country name in chat. First correct answer wins the round!`);
        await game.roundMessage.edit({ embeds: [embed] }).catch(() => {});
    }, Math.floor(game.roundSeconds * 500));
    game.roundTimer = setTimeout(() => resolveCountryRound(game, null).catch(console.error), game.roundSeconds * 1000);
}

async function resolveCountryRound(game, winnerId) {
    if (!game || game.status !== "round" || game.roundResolved) return;
    game.roundResolved = true;
    clearTimeout(game.roundTimer);
    clearTimeout(game.hintTimer);
    const aliveBefore = getAliveCountryPlayers(game);
    if (winnerId && game.players.has(winnerId)) game.players.get(winnerId).score += 1;
    const eliminatedNow = [];
    for (const player of aliveBefore) {
        if (player.id === winnerId) continue;
        player.lives -= 1;
        if (player.lives <= 0) { player.lives = 0; player.eliminated = true; eliminatedNow.push(player.id); }
    }
    const answer = `${game.currentQuestion.flag} **${game.currentQuestion.country}**`;
    const resultText = winnerId ? `⚡ <@${winnerId}> guessed first and is **SAFE**!` : "⏰ Nobody answered in time. Every living player lost a life!";
    const eliminationText = eliminatedNow.length ? `\n\n💀 **Eliminated:** ${eliminatedNow.map(id => `<@${id}>`).join(", ")}` : "";
    const embed = belovedEmbed(`✅ Round ${game.round} Complete`).setDescription(`${resultText}\n\nThe answer was ${answer}.${eliminationText}`).addFields({ name: "📊 Tournament status", value: countryPlayerLines(game) }).setFooter({ text: "Next round begins in 4 seconds" }).setTimestamp();
    await game.roundMessage.edit({ embeds: [embed] }).catch(() => {});
    if (getAliveCountryPlayers(game).length <= 1) return setTimeout(() => endCountryGame(game, "winner").catch(console.error), 4000);
    game.status = "between";
    setTimeout(() => startCountryRound(game).catch(console.error), 4000);
}

async function startCountryGame(game) {
    if (!game || game.status !== "lobby") return;
    clearTimeout(game.lobbyTimer);
    if (game.players.size < 2) return endCountryGame(game, "not-enough");
    game.status = "starting";
    await game.message.edit({ embeds: [belovedEmbed("🌍 Tournament Starting!").setDescription(`**${game.players.size} players** have entered.\n\nGet ready — the first country appears in **3 seconds**!`).addFields({ name: "👥 Competitors", value: countryPlayerLines(game) }).setTimestamp()], components: [countryLobbyButtons(game.id, true)] }).catch(() => {});
    setTimeout(() => startCountryRound(game).catch(console.error), 3000);
}

// ==================================================
// SLASH COMMANDS
// ==================================================

const commands = [
    new ContextMenuCommandBuilder()
        .setName("Clip this")
        .setType(ApplicationCommandType.Message),

    new SlashCommandBuilder()
        .setName("love")
        .setDescription("Give someone Beloved's love")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Roast someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("compliment")
        .setDescription("Compliment someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("hug")
        .setDescription("Give someone a hug")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ship")
        .setDescription("Ship two people")
        .addUserOption(option =>
            option
                .setName("one")
                .setDescription("First person")
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("two")
                .setDescription("Second person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("vibe")
        .setDescription("Check Beloved vibes"),

    new SlashCommandBuilder()
        .setName("fortune")
        .setDescription("Get a weird fortune"),

    new SlashCommandBuilder()
        .setName("mood")
        .setDescription("Check Beloved mood"),

    new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask Beloved anything")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Magic 8 ball")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("rate")
        .setDescription("Rate someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),



    new SlashCommandBuilder()
        .setName("balance").setDescription("Check your Beloved coin balance")
        .addUserOption(option => option.setName("user").setDescription("Whose balance?").setRequired(false)),

    new SlashCommandBuilder().setName("daily").setDescription("Claim your daily Beloved coins"),
    new SlashCommandBuilder().setName("work").setDescription("Work a questionable job for coins"),
    new SlashCommandBuilder().setName("beg").setDescription("Beg Beloved for spare change"),

    new SlashCommandBuilder()
        .setName("pay").setDescription("Send coins to another person")
        .addUserOption(option => option.setName("user").setDescription("Who gets paid?").setRequired(true))
        .addIntegerOption(option => option.setName("amount").setDescription("Amount to send").setMinValue(1).setRequired(true)),

    new SlashCommandBuilder().setName("coinleaderboard").setDescription("See the richest people in the server"),

    new SlashCommandBuilder()
        .setName("slots").setDescription("Spin Beloved's animated slot machine")
        .addIntegerOption(option => option.setName("bet").setDescription("Bet 10 or more coins").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("coinflip").setDescription("Bet on heads or tails")
        .addStringOption(option => option.setName("choice").setDescription("Heads or tails").setRequired(true).addChoices({name:"Heads",value:"heads"},{name:"Tails",value:"tails"}))
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("roulette").setDescription("Play casino roulette")
        .addStringOption(option => option.setName("choice").setDescription("Pick a colour").setRequired(true).addChoices({name:"Red (2x)",value:"red"},{name:"Black (2x)",value:"black"},{name:"Green (14x)",value:"green"}))
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("blackjack").setDescription("Play interactive blackjack against Beloved")
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("smashorpass")
        .setDescription("Start a Smash or Pass vote for someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person people will vote on")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription("Voting time in seconds (10-300)")
                .setMinValue(10)
                .setMaxValue(300)
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("marry")
        .setDescription("Propose a totally legitimate Discord marriage")
        .addUserOption(option => option.setName("user").setDescription("Who are you proposing to?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("court")
        .setDescription("Put someone on trial and let the server vote")
        .addUserOption(option => option.setName("user").setDescription("The defendant").setRequired(true))
        .addStringOption(option => option.setName("charge").setDescription("What are they accused of?").setRequired(true).setMaxLength(200))
        .addIntegerOption(option => option.setName("duration").setDescription("Voting time in seconds (15-300)").setMinValue(15).setMaxValue(300)),

    new SlashCommandBuilder()
        .setName("fight")
        .setDescription("Challenge someone to a button battle")
        .addUserOption(option => option.setName("user").setDescription("Who do you want to fight?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel someone for completely ridiculous reasons")
        .addUserOption(option => option.setName("user").setDescription("Who is getting cancelled?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("wheel")
        .setDescription("Spin the wheel and select a random server member"),

    new SlashCommandBuilder()
        .setName("countrygame")
        .setDescription("Start an elimination Guess the Country tournament")
        .addIntegerOption(option => option.setName("lives").setDescription("Lives per player (1-3)").setMinValue(1).setMaxValue(3).setRequired(false))
        .addIntegerOption(option => option.setName("lobby").setDescription("Join time in seconds (15-60)").setMinValue(15).setMaxValue(60).setRequired(false))
        .addIntegerOption(option => option.setName("roundtime").setDescription("Seconds per country (10-30)").setMinValue(10).setMaxValue(30).setRequired(false)),

    new SlashCommandBuilder()
        .setName("conflict")
        .setDescription("Configure Beloved Conflict Guard")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("View Conflict Guard settings")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("enable")
                .setDescription("Enable Conflict Guard")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("Disable Conflict Guard")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("sensitivity")
                .setDescription("Change detection sensitivity")
                .addStringOption(option =>
                    option
                        .setName("level")
                        .setDescription("Sensitivity level")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Low — fewer interventions",
                                value: "low"
                            },
                            {
                                name: "Normal — recommended",
                                value: "normal"
                            },
                            {
                                name: "High — fastest detection",
                                value: "high"
                            }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("funny")
                .setDescription("Enable or disable funny warnings")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Use funny warning messages")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("slowmode")
                .setDescription("Enable or disable automatic slowmode")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Automatically enable slowmode")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("timeouts")
                .setDescription("Enable or disable automatic timeouts")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Automatically timeout repeat offenders")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("logchannel")
                .setDescription("Set the Conflict Guard log channel")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel for moderation logs")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clearlogs")
                .setDescription("Disable Conflict Guard logging")
        )
];


// ==================================================
// DEPLOY COMMANDS
// ==================================================

const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);

async function deploy() {
    try {
        console.log("💖 Deploying commands");

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands.map(command => command.toJSON())
            }
        );

        console.log("✅ Commands ready");
    } catch (error) {
        console.error("Command deployment error:", error);
    }
}

deploy();


// ==================================================
// BOT READY
// ==================================================

client.once(Events.ClientReady, readyClient => {
    console.log(
        `💖 Beloved online as ${readyClient.user.tag}`
    );

    readyClient.user.setPresence({
        activities: [
            {
                name: "judging humans 💕",
                type: ActivityType.Watching
            }
        ],
        status: "online"
    });
});


// ==================================================
// COMMAND HANDLER
// ==================================================

client.on(Events.InteractionCreate, async interaction => {
    try {
        if (interaction.isMessageContextMenuCommand()) {
            if (interaction.commandName !== "Clip this") return;

            if (!interaction.inGuild()) {
                return interaction.reply({
                    content: "Clips can only be created inside the server.",
                    ephemeral: true
                });
            }

            const clippingChannelId = process.env.CLIPPING_CHANNEL_ID;
            if (!clippingChannelId) {
                return interaction.reply({
                    content: "❌ `CLIPPING_CHANNEL_ID` has not been added to the bot's environment variables.",
                    ephemeral: true
                });
            }

            const clippingChannel = await interaction.guild.channels.fetch(clippingChannelId).catch(() => null);
            if (!clippingChannel || !clippingChannel.isTextBased()) {
                return interaction.reply({
                    content: "❌ The configured clipping channel could not be found or is not a text channel.",
                    ephemeral: true
                });
            }

            const clippedMessage = interaction.targetMessage;
            const messageText = clippedMessage.content?.trim() || "*No text — attachment/embed only.*";
            const safeText = messageText.length > 3500
                ? `${messageText.slice(0, 3497)}...`
                : messageText;

            const attachmentLinks = [...clippedMessage.attachments.values()]
                .map(attachment => `[${attachment.name || "Attachment"}](${attachment.url})`);

            const clipEmbed = belovedEmbed("📸 Caught in 4K")
                .setAuthor({
                    name: clippedMessage.author.tag,
                    iconURL: clippedMessage.author.displayAvatarURL({ size: 256 })
                })
                .setDescription(safeText)
                .addFields(
                    { name: "👤 Sent by", value: `<@${clippedMessage.author.id}>`, inline: true },
                    { name: "📍 Original channel", value: `<#${clippedMessage.channel.id}>`, inline: true },
                    { name: "✂️ Clipped by", value: `<@${interaction.user.id}>`, inline: true },
                    { name: "🔗 Evidence", value: `[Jump to the original message](${clippedMessage.url})`, inline: false }
                )
                .setFooter({ text: `Message ID: ${clippedMessage.id}` })
                .setTimestamp(clippedMessage.createdAt);

            if (attachmentLinks.length) {
                clipEmbed.addFields({
                    name: "📎 Attachments",
                    value: attachmentLinks.join("\n").slice(0, 1024),
                    inline: false
                });

                const firstImage = [...clippedMessage.attachments.values()].find(attachment =>
                    attachment.contentType?.startsWith("image/")
                );
                if (firstImage) clipEmbed.setImage(firstImage.url);
            }

            await clippingChannel.send({
                embeds: [clipEmbed],
                allowedMentions: { parse: [] }
            });

            return interaction.reply({
                content: `📸 Clipped! It has been sent to <#${clippingChannel.id}>.`,
                ephemeral: true
            });
        }

        if (interaction.isButton()) {

            if (interaction.customId.startsWith("blackjack:")) {
                const [, action, gameId] = interaction.customId.split(":");
                const game = activeBlackjackGames.get(gameId);
                if (!game || game.ended) return interaction.reply({ content: "This blackjack table is closed.", ephemeral: true });
                if (interaction.user.id !== game.userId) return interaction.reply({ content: "🃏 This is not your hand.", ephemeral: true });
                if (action === "hit") {
                    game.player.push(game.deck.pop());
                    if (handValue(game.player) >= 21) return finishBlackjack(interaction, game, handValue(game.player) > 21 ? "bust" : "stand");
                    return interaction.update({ embeds: [blackjackEmbed(game)], components: [blackjackButtons(game.id)] });
                }
                if (action === "double") {
                    if (game.player.length !== 2) return interaction.reply({ content: "You can only double on your first move.", ephemeral: true });
                    const user = getEconomyUser(game.guildId, game.userId);
                    if (user.balance < game.bet) return interaction.reply({ content: `You need another ${coins(game.bet)} to double.`, ephemeral: true });
                    user.balance -= game.bet; game.bet *= 2; saveEconomy();
                    game.player.push(game.deck.pop());
                    return finishBlackjack(interaction, game, handValue(game.player) > 21 ? "bust" : "stand");
                }
                if (action === "stand") return finishBlackjack(interaction, game, "stand");
            }

            if (interaction.customId.startsWith("marry:")) {
                const [, choice, gameId] = interaction.customId.split(":");
                const game = activeMarriages.get(gameId);
                if (!game || game.ended) return interaction.reply({ content: "This proposal is already over.", ephemeral: true });
                if (interaction.user.id !== game.targetId) return interaction.reply({ content: "😭 This proposal is not for you.", ephemeral: true });
                game.ended = true;
                activeMarriages.delete(gameId);
                clearTimeout(game.timer);
                const result = choice === "accept"
                    ? `💖 <@${game.targetId}> said **YES!**\n\nBeloved now pronounces you chronically online and chronically online.`
                    : `💔 <@${game.targetId}> said **NO!**\n\n<@${game.proposerId}> has been left at the digital altar.`;
                return interaction.update({ embeds: [buildMarriageEmbed(game, result)], components: [buildMarriageButtons(gameId, true)] });
            }

            if (interaction.customId.startsWith("court:")) {
                const [, vote, gameId] = interaction.customId.split(":");
                const game = activeCourts.get(gameId);
                if (!game || game.ended || Date.now() >= game.endsAt) return interaction.reply({ content: "⚖️ Court is closed.", ephemeral: true });
                const previous = game.votes.get(interaction.user.id);
                game.votes.set(interaction.user.id, vote);
                await interaction.update({ embeds: [buildCourtEmbed(game)], components: [buildCourtButtons(gameId)] });
                return interaction.followUp({ content: previous ? `Vote changed to **${vote === "guilty" ? "GUILTY" : "NOT GUILTY"}**.` : "🗳️ Your jury vote is locked in.", ephemeral: true });
            }

            if (interaction.customId.startsWith("fightaccept:")) {
                const [, choice, gameId] = interaction.customId.split(":");
                const game = activeFights.get(gameId);
                if (!game || game.ended) return interaction.reply({ content: "That challenge is no longer active.", ephemeral: true });
                if (interaction.user.id !== game.players[1]) return interaction.reply({ content: "This challenge is not for you.", ephemeral: true });
                clearTimeout(game.inviteTimer);
                if (choice === "no") {
                    game.ended = true;
                    activeFights.delete(gameId);
                    return interaction.update({ embeds: [new EmbedBuilder().setTitle("🏃 Fight Avoided").setDescription(`<@${game.players[1]}> ran away from <@${game.players[0]}>. Tactical retreat or pure fear?`).setTimestamp()], components: [buildFightInviteButtons(gameId, true)] });
                }
                game.started = true;
                game.turn = game.players[Math.floor(Math.random() * 2)];
                game.lastAction = "The bell rings. Choose your move!";
                return interaction.update({ embeds: [buildFightEmbed(game)], components: [buildFightButtons(gameId)] });
            }

            if (interaction.customId.startsWith("fight:")) {
                const [, move, gameId] = interaction.customId.split(":");
                const game = activeFights.get(gameId);
                if (!game || game.ended || !game.started) return interaction.reply({ content: "This fight is already over.", ephemeral: true });
                if (!game.players.includes(interaction.user.id)) return interaction.reply({ content: "🍿 Spectators cannot jump into the ring.", ephemeral: true });
                if (interaction.user.id !== game.turn) return interaction.reply({ content: "⏳ It is not your turn.", ephemeral: true });
                const attacker = interaction.user.id;
                const defender = game.players.find(id => id !== attacker);
                let damage = 0;
                if (move === "block") {
                    game.blocking[attacker] = true;
                    game.lastAction = `🛡️ <@${attacker}> prepares to block the next attack.`;
                } else if (move === "special") {
                    if (game.specialUsed[attacker]) return interaction.reply({ content: "💥 You already used your special attack.", ephemeral: true });
                    game.specialUsed[attacker] = true;
                    damage = Math.floor(Math.random() * 21) + 20;
                    game.lastAction = `💥 <@${attacker}> used a special attack for **${damage} damage**!`;
                } else {
                    damage = Math.floor(Math.random() * 16) + 8;
                    game.lastAction = `👊 <@${attacker}> punched <@${defender}> for **${damage} damage**!`;
                }
                if (damage > 0) {
                    if (game.blocking[defender]) {
                        damage = Math.max(1, Math.floor(damage / 2));
                        game.blocking[defender] = false;
                        game.lastAction += ` <@${defender}> blocked, reducing it to **${damage}**.`;
                    }
                    game.hp[defender] = Math.max(0, game.hp[defender] - damage);
                }
                if (game.hp[defender] <= 0) {
                    game.ended = true;
                    activeFights.delete(gameId);
                    return interaction.update({ embeds: [buildFightEmbed(game, true, `🏆 <@${attacker}> wins!\n💀 <@${defender}> has been folded like a lawn chair.`)], components: [buildFightButtons(gameId, true)] });
                }
                game.turn = defender;
                return interaction.update({ embeds: [buildFightEmbed(game)], components: [buildFightButtons(gameId)] });
            }

            if (interaction.customId.startsWith("country:")) {
                const [, action, gameId] = interaction.customId.split(":");
                const game = activeCountryGames.get(gameId);
                if (!game || game.status !== "lobby") return interaction.reply({ content: "This country lobby is no longer open.", ephemeral: true });
                if (interaction.user.id !== game.hostId) return interaction.reply({ content: "Only the host can control this tournament.", ephemeral: true });
                if (action === "start") {
                    await interaction.deferUpdate();
                    return startCountryGame(game);
                }
                if (action === "cancel") {
                    await interaction.deferUpdate();
                    return endCountryGame(game, "cancelled");
                }
            }

            if (!interaction.customId.startsWith("sop:")) return;

            const [, vote, gameId] = interaction.customId.split(":");
            const game = activeSmashOrPassGames.get(gameId);

            if (!game || game.ended || Date.now() >= game.endsAt) {
                return interaction.reply({
                    content: "⏰ Voting has already ended.",
                    ephemeral: true
                });
            }

            if (interaction.user.bot) {
                return interaction.reply({
                    content: "🤖 Bots cannot vote.",
                    ephemeral: true
                });
            }

            if (interaction.user.id === game.targetId) {
                return interaction.reply({
                    content: "😭 You cannot vote on yourself.",
                    ephemeral: true
                });
            }

            const previousVote = game.votes.get(interaction.user.id);
            game.votes.set(interaction.user.id, vote);

            await interaction.update({
                embeds: [buildSmashOrPassEmbed(game)],
                components: [buildSmashOrPassButtons(gameId)]
            });

            const response = previousVote === vote
                ? `Your vote is still **${vote.toUpperCase()}**.`
                : previousVote
                    ? `Vote changed from **${previousVote.toUpperCase()}** to **${vote.toUpperCase()}**.`
                    : `Vote locked in: **${vote.toUpperCase()}**.`;

            return interaction.followUp({
                content: response,
                ephemeral: true
            });
        }

        if (!interaction.isChatInputCommand()) {
            return;
        }

        const command = interaction.commandName;

        if (command === "love") {
            const user = interaction.options.getUser("user");

            const replies = [
                `💖 ${user} has been blessed by Beloved. Use this power wisely.`,
                `💕 Beloved scanned ${user}. Result: dangerously lovable.`,
                `🌹 ${user} has unlocked premium friendship mode.`,
                `❤️ ${user} is now 12% more amazing.`
            ];

            return interaction.reply(
                replies[Math.floor(Math.random() * replies.length)]
            );
        }

        if (command === "roast") {
            const user = interaction.options.getUser("user");

            const replies = [
                `🔥 ${user} has the confidence of someone who skips tutorials.`,
                `💀 ${user}'s brain is running on free trial mode.`,
                `😭 ${user} probably says "trust me" before disasters.`,
                `🔥 Beloved checked ${user}. The results were deleted.`
            ];

            return interaction.reply(
                replies[Math.floor(Math.random() * replies.length)]
            );
        }

        if (command === "compliment") {
            const user = interaction.options.getUser("user");

            const replies = [
                `✨ ${user} has main character energy.`,
                `💎 ${user} is officially approved by Beloved.`,
                `🌟 Scientists tried to measure ${user}'s greatness. They gave up.`,
                `🫡 ${user} is actually built different.`
            ];

            return interaction.reply(
                replies[Math.floor(Math.random() * replies.length)]
            );
        }

        if (command === "hug") {
            const user = interaction.options.getUser("user");

            const replies = [
                `🤗 Beloved launched a hug missile at ${user}.`,
                `🫂 ${user} received a certified premium hug.`,
                `💖 Hug complete. Happiness increased by 7%.`,
                `🤖 Robot arms activated. ${user} has been hugged.`
            ];

            return interaction.reply(
                replies[Math.floor(Math.random() * replies.length)]
            );
        }

        if (command === "ship") {
            const one = interaction.options.getUser("one");
            const two = interaction.options.getUser("two");
            const score = Math.floor(Math.random() * 101);

            const result =
                score > 80
                    ? "💍 Soulmate detected."
                    : score > 50
                        ? "💕 Could survive a shopping trip together."
                        : "💀 Beloved recommends friendship.";

            return interaction.reply(
                `💘 ${one} + ${two}\n` +
                `❤️ Compatibility: ${score}%\n` +
                result
            );
        }

        if (command === "vibe") {
            const vibes = [
                "🔥 Illegal levels of vibe detected.",
                "😎 Maximum boulevard energy.",
                "💀 Suspicious but accepted.",
                "✨ Legendary vibes unlocked.",
                "🧃 Vibe scanner exploded."
            ];

            return interaction.reply(
                vibes[Math.floor(Math.random() * vibes.length)]
            );
        }

        if (command === "fortune") {
            const fortunes = [
                "🔮 You will find happiness near food.",
                "🔮 Someone will compliment you today.",
                "🔮 Your future contains questionable decisions.",
                "🔮 A mysterious snack awaits you."
            ];

            return interaction.reply(
                fortunes[Math.floor(Math.random() * fortunes.length)]
            );
        }

        if (command === "mood") {
            const moods = [
                "😊 Happy",
                "😈 Planning chaos",
                "🤖 Running on caffeine",
                "🥲 Waiting for praise",
                "💀 Slightly broken"
            ];

            return interaction.reply(
                `💖 Beloved mood: ${
                    moods[Math.floor(Math.random() * moods.length)]
                }`
            );
        }

        if (command === "ask") {
            const question =
                interaction.options.getString("question");

            const answers = [
                "Probably 👀",
                "Beloved has consulted the toaster. Yes.",
                "No. Absolutely not.",
                "I have no idea but I support you.",
                "That question hurt my circuits."
            ];

            return interaction.reply(
                `❓ ${question}\n\n💖 ${
                    answers[Math.floor(Math.random() * answers.length)]
                }`
            );
        }

        if (command === "8ball") {
            const question =
                interaction.options.getString("question");

            const answers = [
                "Yes",
                "No",
                "Maybe",
                "Definitely",
                "Ask again later",
                "Your toaster knows"
            ];

            return interaction.reply(
                `🎱 **${question}**\n\n${
                    answers[Math.floor(Math.random() * answers.length)]
                }`
            );
        }

        if (command === "rate") {
            const user =
                interaction.options.getUser("user");

            return interaction.reply(
                `⭐ ${user} rating:\n\n` +
                `Coolness: ${Math.floor(Math.random() * 101)}%\n` +
                `Chaos: ${Math.floor(Math.random() * 101)}%\n` +
                `Beloved approval: ${Math.floor(Math.random() * 101)}%`
            );
        }


        if (command === "balance") {
            const target = interaction.options.getUser("user") || interaction.user;
            const account = getEconomyUser(interaction.guild.id, target.id);

            const embed = belovedEmbed("💗 Beloved Wallet")
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .setDescription(`### ${target.username}'s purse`)
                .addFields(
                    { name: "Pocket", value: `**${coins(account.balance)}**`, inline: true },
                    { name: "Bank", value: `**${coins(account.bank)}**`, inline: true },
                    { name: "Net worth", value: `**${coins(account.balance + account.bank)}**`, inline: true },
                    { name: "Casino wins", value: coins(account.totalWon), inline: true },
                    { name: "Casino losses", value: coins(account.totalLost), inline: true }
                )
                .setFooter({ text: "Beloved coins are for fun only" })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        if (command === "daily") {
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            const cooldown = 24 * 60 * 60 * 1000;
            const left = account.lastDaily + cooldown - Date.now();

            if (left > 0) {
                return interaction.reply({ content: `⏳ Daily already claimed. Come back in **${formatCooldown(left)}**.`, ephemeral: true });
            }

            const reward = Math.floor(Math.random() * 501) + 750;
            account.balance += reward;
            account.lastDaily = Date.now();
            saveEconomy();

            return interaction.reply({
                embeds: [belovedEmbed("🎁 Daily Pink Drop")
                    .setDescription(`Beloved slipped <@${interaction.user.id}> a fresh bag of coins.`)
                    .addFields(
                        { name: "You received", value: `**${coins(reward)}**`, inline: true },
                        { name: "New balance", value: `**${coins(account.balance)}**`, inline: true }
                    )
                    .setFooter({ text: "Your next gift arrives in 24 hours" })
                    .setTimestamp()]
            });
        }

        if (command === "work") {
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            const cooldown = 30 * 60 * 1000;
            const left = account.lastWork + cooldown - Date.now();
            if (left > 0) return interaction.reply({ content: `🕒 Your next shift starts in **${formatCooldown(left)}**.`, ephemeral: true });

            const jobs = ["tested suspicious toasters", "moderated the Yap Olympics", "sold premium air", "counted Beloved's pixels", "guarded the casino bathroom", "became a professional third wheel"];
            const job = randomItem(jobs);
            const reward = Math.floor(Math.random() * 351) + 250;
            account.balance += reward;
            account.lastWork = Date.now();
            saveEconomy();

            return interaction.reply({ embeds: [belovedEmbed("💼 Shift Complete")
                .setDescription(`You **${job}** and somehow got paid.`)
                .addFields(
                    { name: "Pay cheque", value: `**${coins(reward)}**`, inline: true },
                    { name: "Balance", value: `**${coins(account.balance)}**`, inline: true }
                )
                .setFooter({ text: "Another shift unlocks in 30 minutes" })
                .setTimestamp()] });
        }

        if (command === "beg") {
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            const cooldown = 10 * 60 * 1000;
            const left = account.lastBeg + cooldown - Date.now();
            if (left > 0) return interaction.reply({ content: `🥺 Beg again in **${formatCooldown(left)}**.`, ephemeral: true });

            account.lastBeg = Date.now();
            const success = Math.random() < 0.75;
            const reward = success ? Math.floor(Math.random() * 121) + 20 : 0;
            account.balance += reward;
            saveEconomy();

            return interaction.reply({ embeds: [belovedEmbed(success ? "🥺 Pity Coins Secured" : "🦗 Painful Silence")
                .setDescription(success ? "A suspiciously generous stranger felt bad for you." : "You held out your hand. Everyone looked away.")
                .addFields(
                    { name: "Received", value: `**${coins(reward)}**`, inline: true },
                    { name: "Balance", value: `**${coins(account.balance)}**`, inline: true }
                )
                .setFooter({ text: "You may embarrass yourself again in 10 minutes" })
                .setTimestamp()] });
        }

        if (command === "pay") {
            const target = interaction.options.getUser("user");
            const amount = interaction.options.getInteger("amount");
            if (target.bot || target.id === interaction.user.id) return interaction.reply({ content: "You cannot pay that account.", ephemeral: true });

            const sender = getEconomyUser(interaction.guild.id, interaction.user.id);
            const receiver = getEconomyUser(interaction.guild.id, target.id);
            if (sender.balance < amount) return interaction.reply({ content: `You only have ${coins(sender.balance)}.`, ephemeral: true });

            sender.balance -= amount;
            receiver.balance += amount;
            saveEconomy();

            return interaction.reply({ embeds: [belovedEmbed("💸 Coin Transfer")
                .setDescription(`<@${interaction.user.id}> sent <@${target.id}> some Beloved coins.`)
                .addFields(
                    { name: "Amount", value: `**${coins(amount)}**`, inline: true },
                    { name: "Your balance", value: `**${coins(sender.balance)}**`, inline: true }
                )
                .setTimestamp()] });
        }

        if (command === "coinleaderboard") {
            const prefix = `${interaction.guild.id}:`;
            const rows = Object.entries(economyData.users)
                .filter(([key]) => key.startsWith(prefix))
                .map(([key, value]) => ({ id: key.split(":")[1], total: value.balance + value.bank }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);

            const description = rows.length
                ? rows.map((row, index) => `${["🥇", "🥈", "🥉"][index] || `**${index + 1}.**`} <@${row.id}>　**${coins(row.total)}**`).join("\n")
                : "Nobody has opened a wallet yet.";

            return interaction.reply({
                embeds: [belovedEmbed("👑 Beloved Rich List")
                    .setDescription(description)
                    .setFooter({ text: "Rich today, destroyed by slots tomorrow" })
                    .setTimestamp()],
                allowedMentions: { parse: [] }
            });
        }

        if (command === "slots") {
            const bet = interaction.options.getInteger("bet");
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            const lock = economyKey(interaction.guild.id, interaction.user.id);

            if (!clampBet(account.balance, bet)) {
                return interaction.reply({
                    content: `Bet must be at least 10 and no more than your ${coins(account.balance)} balance.`,
                    ephemeral: true
                });
            }

            if (economyLocks.has(lock)) {
                return interaction.reply({
                    content: "🎰 Your previous spin is still moving.",
                    ephemeral: true
                });
            }

            economyLocks.add(lock);
            account.balance -= bet;
            saveEconomy();

            const finalRow = [weightedSlotSymbol(), weightedSlotSymbol(), weightedSlotSymbol()];

            try {
                let animatedGrid = slotGrid();

                await interaction.reply({
                    embeds: [
                        belovedEmbed("🎰 Slot Machine")
                            .setDescription(renderSlotReels(animatedGrid, "SPINNING"))
                            .addFields(
                                { name: "Bet", value: coins(bet), inline: true },
                                { name: "Balance", value: coins(account.balance), inline: true }
                            )
                            .setFooter({ text: `${interaction.user.username} • reels spinning` })
                    ]
                });

                for (let frame = 0; frame < 8; frame++) {
                    await new Promise(resolve => setTimeout(resolve, 350));
                    animatedGrid = slotGrid();

                    if (frame >= 5) animatedGrid[1][0] = finalRow[0];
                    if (frame >= 6) animatedGrid[1][1] = finalRow[1];
                    if (frame >= 7) animatedGrid[1][2] = finalRow[2];

                    await interaction.editReply({
                        embeds: [
                            belovedEmbed("🎰 Slot Machine")
                                .setDescription(renderSlotReels(animatedGrid, frame === 7 ? "LOCKED" : "SPINNING"))
                                .addFields(
                                    { name: "Bet", value: coins(bet), inline: true },
                                    { name: "Balance", value: coins(account.balance), inline: true }
                                )
                                .setFooter({ text: `${interaction.user.username} • ${frame === 7 ? "reels locked" : "reels spinning"}` })
                        ]
                    });
                }

                const finalGrid = slotGrid(finalRow);
                const result = evaluateSlots(finalRow, bet);
                account.balance += result.payout;

                if (result.payout > bet) account.totalWon += result.payout - bet;
                else account.totalLost += bet - result.payout;
                saveEconomy();

                const net = result.payout - bet;
                const status = net > 0 ? "WIN" : net === 0 ? "PUSH" : "LOST";
                const summary = net > 0
                    ? `You won **${coins(result.payout)}** (**+${coins(net)} profit**).`
                    : net === 0
                        ? `Your **${coins(bet)}** bet was returned.`
                        : `You lost **${coins(bet)}**.`;

                await interaction.editReply({
                    embeds: [
                        belovedEmbed("🎰 Slot Machine")
                            .setDescription(renderSlotReels(finalGrid, status))
                            .addFields(
                                { name: result.label, value: summary, inline: false },
                                { name: "Payout", value: coins(result.payout), inline: true },
                                { name: "Balance", value: coins(account.balance), inline: true }
                            )
                            .setFooter({ text: `${interaction.user.username} • Beloved Casino` })
                            .setTimestamp()
                    ]
                });
            } finally {
                economyLocks.delete(lock);
            }

            return;
        }

        if (command === "coinflip") {
            const choice = interaction.options.getString("choice");
            const bet = interaction.options.getInteger("bet");
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            if (!clampBet(account.balance, bet)) return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });

            account.balance -= bet;
            const result = Math.random() < 0.5 ? "heads" : "tails";
            const win = result === choice;
            if (win) { account.balance += bet * 2; account.totalWon += bet; }
            else account.totalLost += bet;
            saveEconomy();

            return interaction.reply({
                embeds: [belovedEmbed(win ? "💖 Coin Flip Win" : "💔 Coin Flip Loss")
                    .setDescription(`# ${result === "heads" ? "👑 HEADS" : "🦅 TAILS"}`)
                    .addFields(
                        { name: "Your call", value: choice.toUpperCase(), inline: true },
                        { name: "Result", value: result.toUpperCase(), inline: true },
                        { name: win ? "Profit" : "Lost", value: `**${coins(bet)}**`, inline: true },
                        { name: "Balance", value: `**${coins(account.balance)}**`, inline: false }
                    )
                    .setTimestamp()]
            });
        }

        if (command === "roulette") {
            const choice = interaction.options.getString("choice");
            const bet = interaction.options.getInteger("bet");
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            if (!clampBet(account.balance, bet)) return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });

            account.balance -= bet;
            await interaction.reply({
                embeds: [belovedEmbed("🎡 Beloved Roulette")
                    .setDescription("### 🔴　⚫　🟢　⚫　🔴　⚫\nThe wheel is spinning...")
                    .addFields(
                        { name: "Your colour", value: choice.toUpperCase(), inline: true },
                        { name: "Bet", value: `**${coins(bet)}**`, inline: true }
                    )
                    .setFooter({ text: "No refunds after the dramatic suspense begins" })]
            });

            for (let i = 0; i < 4; i++) {
                await new Promise(resolve => setTimeout(resolve, 700));
                await interaction.editReply({
                    embeds: [belovedEmbed("🎡 Beloved Roulette")
                        .setDescription(`### ${"⚫　🔴　".repeat(i + 2)}\n${"●".repeat(i + 1)}${"○".repeat(4 - i)}　spinning${".".repeat(i + 1)}`)
                        .addFields(
                            { name: "Your colour", value: choice.toUpperCase(), inline: true },
                            { name: "Bet", value: `**${coins(bet)}**`, inline: true }
                        )
                        .setFooter({ text: "The ball is deciding your financial future" })]
                });
            }

            const roll = Math.floor(Math.random() * 37);
            const result = roll === 0 ? "green" : ([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(roll) ? "red" : "black");
            const multiplier = result === "green" ? 14 : 2;
            const win = choice === result;
            const payout = win ? bet * multiplier : 0;
            account.balance += payout;
            if (win) account.totalWon += payout - bet;
            else account.totalLost += bet;
            saveEconomy();

            const colourEmoji = result === "red" ? "🔴" : result === "black" ? "⚫" : "🟢";
            return interaction.editReply({
                embeds: [belovedEmbed(win ? "💖 Roulette Win" : "💔 Roulette Loss")
                    .setDescription(`# ${colourEmoji} ${roll}`)
                    .addFields(
                        { name: "Landed on", value: result.toUpperCase(), inline: true },
                        { name: win ? "Profit" : "Lost", value: `**${coins(win ? payout - bet : bet)}**`, inline: true },
                        { name: "Balance", value: `**${coins(account.balance)}**`, inline: false }
                    )
                    .setTimestamp()]
            });
        }

        if (command === "blackjack") {
            const bet = interaction.options.getInteger("bet");
            const account = getEconomyUser(interaction.guild.id, interaction.user.id);
            if (!clampBet(account.balance, bet)) return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });

            const existing = [...activeBlackjackGames.values()].find(game => game.guildId === interaction.guild.id && game.userId === interaction.user.id && !game.ended);
            if (existing) return interaction.reply({ content: "🃏 Finish your current blackjack hand first.", ephemeral: true });

            account.balance -= bet;
            saveEconomy();
            const deck = createDeck();
            const game = { id: interaction.id, guildId: interaction.guild.id, userId: interaction.user.id, bet, deck, player: [deck.pop(), deck.pop()], dealer: [deck.pop(), deck.pop()], ended: false };
            activeBlackjackGames.set(game.id, game);

            await interaction.reply({ embeds: [blackjackEmbed(game)], components: [blackjackButtons(game.id)] });
            if (handValue(game.player) === 21) {
                await new Promise(resolve => setTimeout(resolve, 800));
                const fake = { ...interaction, update: payload => interaction.editReply(payload) };
                return finishBlackjack(fake, game, "stand");
            }
            return;
        }

        if (command === "smashorpass") {
            if (!interaction.guild || !interaction.channel?.isTextBased()) {
                return interaction.reply({
                    content: "This game can only be started in a server text channel.",
                    ephemeral: true
                });
            }

            const target = interaction.options.getUser("user");
            const duration = interaction.options.getInteger("duration") || 60;

            if (target.bot) {
                return interaction.reply({
                    content: "🤖 Leave the bots out of this one.",
                    ephemeral: true
                });
            }

            const gameId = `${interaction.id}`;
            const game = {
                id: gameId,
                guildId: interaction.guild.id,
                channelId: interaction.channel.id,
                hostId: interaction.user.id,
                targetId: target.id,
                targetAvatar: target.displayAvatarURL({ size: 256 }),
                endsAt: Date.now() + duration * 1000,
                votes: new Map(),
                ended: false,
                message: null,
                timer: null
            };

            await interaction.reply({
                embeds: [buildSmashOrPassEmbed(game)],
                components: [buildSmashOrPassButtons(gameId)],
                allowedMentions: {
                    users: [target.id, interaction.user.id]
                }
            });

            game.message = await interaction.fetchReply();
            activeSmashOrPassGames.set(gameId, game);

            game.timer = setTimeout(() => {
                finishSmashOrPassGame(gameId).catch(error => {
                    console.error("Smash or Pass timer error:", error);
                });
            }, duration * 1000);

            return;
        }

        if (command === "marry") {
            const target = interaction.options.getUser("user");
            if (target.bot) return interaction.reply({ content: "🤖 Bots are not emotionally available.", ephemeral: true });
            if (target.id === interaction.user.id) return interaction.reply({ content: "💍 Self-love is important, but you cannot marry yourself here.", ephemeral: true });
            const gameId = interaction.id;
            const game = { proposerId: interaction.user.id, targetId: target.id, ended: false, timer: null };
            activeMarriages.set(gameId, game);
            await interaction.reply({ embeds: [buildMarriageEmbed(game)], components: [buildMarriageButtons(gameId)], allowedMentions: { users: [target.id, interaction.user.id] } });
            game.timer = setTimeout(async () => {
                if (!activeMarriages.has(gameId)) return;
                game.ended = true;
                activeMarriages.delete(gameId);
                await interaction.editReply({ embeds: [buildMarriageEmbed(game, `⏰ <@${game.targetId}> ignored the proposal. Silence is legally considered devastating.`)], components: [buildMarriageButtons(gameId, true)] }).catch(() => {});
            }, 60_000);
            return;
        }

        if (command === "court") {
            const accused = interaction.options.getUser("user");
            const charge = interaction.options.getString("charge");
            const duration = interaction.options.getInteger("duration") || 60;
            if (accused.bot) return interaction.reply({ content: "🤖 Bots are above Beloved law.", ephemeral: true });
            const gameId = interaction.id;
            const game = { id: gameId, accusedId: accused.id, hostId: interaction.user.id, charge, endsAt: Date.now() + duration * 1000, votes: new Map(), ended: false, message: null };
            await interaction.reply({ embeds: [buildCourtEmbed(game)], components: [buildCourtButtons(gameId)], allowedMentions: { users: [accused.id, interaction.user.id] } });
            game.message = await interaction.fetchReply();
            activeCourts.set(gameId, game);
            setTimeout(() => finishCourt(gameId).catch(console.error), duration * 1000);
            return;
        }

        if (command === "fight") {
            const opponent = interaction.options.getUser("user");
            if (opponent.bot) return interaction.reply({ content: "🤖 Fighting a bot is how robot uprisings begin.", ephemeral: true });
            if (opponent.id === interaction.user.id) return interaction.reply({ content: "🥊 You shadowboxed and somehow lost.", ephemeral: true });
            const gameId = interaction.id;
            const game = {
                players: [interaction.user.id, opponent.id], hp: {}, blocking: {}, specialUsed: {},
                started: false, ended: false, turn: null, lastAction: "", inviteTimer: null
            };
            for (const id of game.players) { game.hp[id] = 100; game.blocking[id] = false; game.specialUsed[id] = false; }
            activeFights.set(gameId, game);
            await interaction.reply({
                embeds: [new EmbedBuilder().setTitle("⚔️ Fight Challenge").setDescription(`<@${interaction.user.id}> challenged <@${opponent.id}> to a fight!\n\nDo you accept?`).setFooter({ text: "Challenge expires in 60 seconds." }).setTimestamp()],
                components: [buildFightInviteButtons(gameId)], allowedMentions: { users: game.players }
            });
            game.inviteTimer = setTimeout(async () => {
                if (!activeFights.has(gameId) || game.started) return;
                game.ended = true; activeFights.delete(gameId);
                await interaction.editReply({ embeds: [new EmbedBuilder().setTitle("⏰ Challenge Expired").setDescription(`<@${opponent.id}> did not answer. <@${interaction.user.id}> wins by boredom.`).setTimestamp()], components: [buildFightInviteButtons(gameId, true)] }).catch(() => {});
            }, 60_000);
            return;
        }

        if (command === "cancel") {
            const target = interaction.options.getUser("user");
            const reasons = [...cancelReasons].sort(() => Math.random() - 0.5).slice(0, 3);
            const percentage = Math.floor(Math.random() * 31) + 69;
            const embed = new EmbedBuilder()
                .setTitle("🚫 Official Beloved Cancellation Notice")
                .setThumbnail(target.displayAvatarURL({ size: 256 }))
                .setDescription(`<@${target.id}> has been **${percentage}% cancelled** for:`)
                .addFields({ name: "📋 Charges", value: reasons.map((reason, index) => `${index + 1}. ${reason}`).join("\n") })
                .setFooter({ text: "Appeals may be submitted directly to the nearest toaster." })
                .setTimestamp();
            return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
        }

        if (command === "wheel") {
            await interaction.deferReply();
            const members = await interaction.guild.members.fetch();
            const eligible = members.filter(member => !member.user.bot).map(member => member.user);
            if (!eligible.length) return interaction.editReply("😭 The wheel found nobody.");
            const selected = eligible[Math.floor(Math.random() * eligible.length)];
            const fakeSpins = [...eligible].sort(() => Math.random() - 0.5).slice(0, Math.min(5, eligible.length));
            const embed = new EmbedBuilder()
                .setTitle("🎡 Beloved's Wheel of Questionable Fate")
                .setDescription(`The wheel considered...\n${fakeSpins.map(user => `• ${user}`).join("\n")}\n\n🎉 **The chosen one is ${selected}!**`)
                .setThumbnail(selected.displayAvatarURL({ size: 256 }))
                .setFooter({ text: "The wheel is never wrong. Legally." })
                .setTimestamp();
            return interaction.editReply({ embeds: [embed], allowedMentions: { users: [selected.id] } });
        }

        if (command === "countrygame") {
            if (!interaction.inGuild()) return interaction.reply({ content: "This game can only be played in a server.", ephemeral: true });
            if (countryGameByChannel.has(interaction.channel.id)) return interaction.reply({ content: "🌍 A country tournament is already active in this channel.", ephemeral: true });
            const startingLives = interaction.options.getInteger("lives") || 2;
            const lobbySeconds = interaction.options.getInteger("lobby") || 30;
            const roundSeconds = interaction.options.getInteger("roundtime") || 20;
            const gameId = interaction.id;
            const game = {
                id: gameId, guildId: interaction.guild.id, channelId: interaction.channel.id, channel: interaction.channel,
                hostId: interaction.user.id, startingLives, roundSeconds, status: "lobby", round: 0,
                players: new Map(), usedCountries: new Set(), currentQuestion: null, message: null, roundMessage: null,
                lobbyEndsAt: Date.now() + lobbySeconds * 1000, roundEndsAt: 0, roundResolved: false,
                lobbyTimer: null, roundTimer: null, hintTimer: null
            };
            game.players.set(interaction.user.id, { id: interaction.user.id, lives: startingLives, score: 0, eliminated: false });
            activeCountryGames.set(gameId, game);
            countryGameByChannel.set(interaction.channel.id, gameId);
            await interaction.reply({ embeds: [countryLobbyEmbed(game)], components: [countryLobbyButtons(gameId)], fetchReply: true });
            game.message = await interaction.fetchReply();
            await game.message.react(COUNTRY_JOIN_EMOJI).catch(() => {});
            game.lobbyTimer = setTimeout(() => startCountryGame(game).catch(console.error), lobbySeconds * 1000);
            return;
        }

        if (command === "conflict") {
            if (!interaction.guild) {
                return interaction.reply({
                    content:
                        "Conflict Guard can only be configured inside a server.",
                    ephemeral: true
                });
            }

            const subcommand =
                interaction.options.getSubcommand();

            const settings =
                getGuildSettings(interaction.guild.id);

            if (subcommand === "status") {
                const thresholds =
                    sensitivityLevels[settings.sensitivity];

                return interaction.reply({
                    content:
                        "🛡️ **Beloved Conflict Guard V2**\n\n" +
                        `**Status:** ${
                            settings.enabled ? "Enabled ✅" : "Disabled ❌"
                        }\n` +
                        `**Sensitivity:** ${settings.sensitivity}\n` +
                        `**Conversation-flow detection:** Enabled ✅\n` +
                        `**Funny warnings:** ${
                            settings.funnyMessages ? "Enabled" : "Disabled"
                        }\n` +
                        `**Automatic slowmode:** ${
                            settings.slowmodeEnabled ? "Enabled" : "Disabled"
                        }\n` +
                        `**Automatic timeouts:** ${
                            settings.timeoutEnabled ? "Enabled" : "Disabled"
                        }\n` +
                        `**Log channel:** ${
                            settings.logChannelId
                                ? `<#${settings.logChannelId}>`
                                : "Not configured"
                        }\n\n` +
                        `**Warning threshold:** ${thresholds.warningThreshold}\n` +
                        `**Slowmode threshold:** ${thresholds.slowmodeThreshold}\n` +
                        `**Timeout threshold:** ${thresholds.timeoutThreshold}`,
                    ephemeral: true
                });
            }

            if (subcommand === "enable") {
                settings.enabled = true;

                return interaction.reply({
                    content: "✅ Conflict Guard V2 is enabled.",
                    ephemeral: true
                });
            }

            if (subcommand === "disable") {
                settings.enabled = false;

                return interaction.reply({
                    content: "❌ Conflict Guard is disabled.",
                    ephemeral: true
                });
            }

            if (subcommand === "sensitivity") {
                settings.sensitivity =
                    interaction.options.getString("level");

                return interaction.reply({
                    content:
                        `🎚️ Sensitivity is now **${settings.sensitivity}**.`,
                    ephemeral: true
                });
            }

            if (subcommand === "funny") {
                settings.funnyMessages =
                    interaction.options.getBoolean("enabled");

                return interaction.reply({
                    content:
                        `😂 Funny warnings are now **${
                            settings.funnyMessages
                                ? "enabled"
                                : "disabled"
                        }**.`,
                    ephemeral: true
                });
            }

            if (subcommand === "slowmode") {
                settings.slowmodeEnabled =
                    interaction.options.getBoolean("enabled");

                return interaction.reply({
                    content:
                        `🐌 Automatic slowmode is now **${
                            settings.slowmodeEnabled
                                ? "enabled"
                                : "disabled"
                        }**.`,
                    ephemeral: true
                });
            }

            if (subcommand === "timeouts") {
                settings.timeoutEnabled =
                    interaction.options.getBoolean("enabled");

                return interaction.reply({
                    content:
                        `⏰ Automatic timeouts are now **${
                            settings.timeoutEnabled
                                ? "enabled"
                                : "disabled"
                        }**.`,
                    ephemeral: true
                });
            }

            if (subcommand === "logchannel") {
                const channel =
                    interaction.options.getChannel("channel");

                settings.logChannelId = channel.id;

                return interaction.reply({
                    content:
                        `📋 Conflict logs will be sent to ${channel}.`,
                    ephemeral: true
                });
            }

            if (subcommand === "clearlogs") {
                settings.logChannelId = null;

                return interaction.reply({
                    content:
                        "📋 Conflict logging has been disabled.",
                    ephemeral: true
                });
            }
        }
    } catch (error) {
        console.error("Interaction error:", error);

        const response = {
            content:
                "💀 Beloved crashed trying to be funny.",
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response).catch(() => {});
        } else {
            await interaction.reply(response).catch(() => {});
        }
    }
});


// ==================================================
// COUNTRY GAME REACTION JOINING
// ==================================================

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => null);
        if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
        if (reaction.emoji.name !== COUNTRY_JOIN_EMOJI) return;
        const game = [...activeCountryGames.values()].find(item => item.message?.id === reaction.message.id);
        if (!game || game.status !== "lobby") return;
        if (!game.players.has(user.id)) {
            game.players.set(user.id, { id: user.id, lives: game.startingLives, score: 0, eliminated: false });
            await updateCountryLobby(game);
        }
    } catch (error) {
        console.error("Country join reaction error:", error);
    }
});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    try {
        if (user.bot) return;
        if (reaction.partial) await reaction.fetch().catch(() => null);
        if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
        if (reaction.emoji.name !== COUNTRY_JOIN_EMOJI) return;
        const game = [...activeCountryGames.values()].find(item => item.message?.id === reaction.message.id);
        if (!game || game.status !== "lobby" || user.id === game.hostId) return;
        if (game.players.delete(user.id)) await updateCountryLobby(game);
    } catch (error) {
        console.error("Country leave reaction error:", error);
    }
});

// ==================================================
// MESSAGE HANDLER
// ==================================================

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) {
        return;
    }

    try {
        const countryGameId = countryGameByChannel.get(message.channel.id);
        const countryGame = countryGameId ? activeCountryGames.get(countryGameId) : null;
        if (countryGame && countryGame.status === "round" && !countryGame.roundResolved) {
            const player = countryGame.players.get(message.author.id);
            if (player && !player.eliminated) {
                const guess = normaliseCountryGuess(message.content);
                const correct = countryGame.currentQuestion.aliases.some(alias => normaliseCountryGuess(alias) === guess);
                if (correct) {
                    await message.react("✅").catch(() => {});
                    await resolveCountryRound(countryGame, message.author.id);
                    return;
                }
            }
        }

        await processConflictMessage(message);

        if (
            message.mentions.has(client.user) &&
            !message.mentions.everyone
        ) {
            const replies = [
                "👀 You summoned me?",
                "💖 Beloved has entered the chat.",
                "🤖 I was busy doing important bot things.",
                "😭 Another ping? I just sat down.",
                "🫡 Reporting for duty.",
                "💅 I have arrived. Try to remain calm.",
                "📞 Beloved customer service, how may I judge you?"
            ];

            await message.reply(
                replies[Math.floor(Math.random() * replies.length)]
            );
        }
    } catch (error) {
        console.error("Message handler error:", error);
    }
});


// ==================================================
// ERROR HANDLING
// ==================================================

process.on("unhandledRejection", error => {
    console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", error => {
    console.error("Uncaught exception:", error);
});


// ==================================================
// LOGIN
// ==================================================

client.login(process.env.TOKEN);
