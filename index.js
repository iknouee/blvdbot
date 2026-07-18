require("dotenv").config();

const express = require("express");

const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
    SlashCommandBuilder,
    REST,
    Routes,
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
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
        GatewayIntentBits.GuildMembers
    ]
});


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
// SLASH COMMANDS
// ==================================================

const commands = [
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
        if (interaction.isButton()) {
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
// MESSAGE HANDLER
// ==================================================

client.on(Events.MessageCreate, async message => {
    if (message.author.bot) {
        return;
    }

    try {
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
