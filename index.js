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
    ChannelType
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
// CONFLICT GUARD CONFIGURATION
// ==================================================

const conflictSettings = new Map();
const conflictPairs = new Map();
const channelConflictStates = new Map();
const recentlyWarnedPairs = new Map();

const DEFAULT_CONFLICT_SETTINGS = {
    enabled: true,
    sensitivity: "normal",
    funnyMessages: true,
    slowmodeEnabled: true,
    timeoutEnabled: false,
    logChannelId: null
};

const CONFLICT_WINDOW = 75 * 1000;
const WARNING_COOLDOWN = 45 * 1000;
const PAIR_EXPIRY = 10 * 60 * 1000;

const SLOWMODE_SECONDS = 10;
const SLOWMODE_DURATION = 5 * 60 * 1000;

const AUTO_TIMEOUT_DURATION = 10 * 60 * 1000;

const sensitivityLevels = {
    low: {
        warningThreshold: 7,
        slowmodeThreshold: 11,
        timeoutThreshold: 16
    },

    normal: {
        warningThreshold: 5,
        slowmodeThreshold: 9,
        timeoutThreshold: 14
    },

    high: {
        warningThreshold: 4,
        slowmodeThreshold: 7,
        timeoutThreshold: 11
    }
};


// ==================================================
// HOSTILITY PATTERNS
// ==================================================

// These focus on targeted insults.
//
// Ordinary swear words are deliberately not included.
// Something like "I am so fucking bad at this game" will not trigger it.

const severeHostilityPatterns = [
    /\bk\s*y\s*s\b/i,
    /\bkill\s+yourself\b/i,
    /\bgo\s+die\b/i,
    /\bi\s+hope\s+you\s+die\b/i,
    /\bnobody\s+would\s+miss\s+you\b/i,
    /\byou\s+should\s+die\b/i
];

const strongHostilityPatterns = [
    /\bfuck\s+you\b/i,
    /\bfuck\s+off\b/i,
    /\bstfu\b/i,
    /\bshut\s+(?:the\s+fuck\s+)?up\b/i,
    /\bi\s+hate\s+you\b/i,
    /\bnobody\s+likes\s+you\b/i,
    /\bnobody\s+cares\s+about\s+you\b/i,
    /\byou(?:'re| are)\s+(?:a\s+)?(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo|failure)\b/i,
    /\byou\s+(?:fucking\s+)?(?:idiot|moron|loser|clown|weirdo)\b/i
];

const mediumHostilityPatterns = [
    /\byou(?:'re| are)\s+(?:so\s+)?(?:stupid|dumb|pathetic|useless|annoying|embarrassing|delusional|ugly)\b/i,
    /\byour\s+brain\s+(?:doesn't|does not)\s+work\b/i,
    /\bget\s+a\s+life\b/i,
    /\bkeep\s+crying\b/i,
    /\bcry\s+more\b/i,
    /\bcry\s+about\s+it\b/i,
    /\bstay\s+mad\b/i,
    /\byou(?:'re| are)\s+mad\b/i,
    /\byou(?:'re| are)\s+obsessed\b/i,
    /\bno\s+one\s+asked\s+you\b/i,
    /\byou\s+make\s+no\s+sense\b/i
];

const lightHostilityPatterns = [
    /\bidiot\b/i,
    /\bmoron\b/i,
    /\bloser\b/i,
    /\bclown\b/i,
    /\bweirdo\b/i,
    /\bdumbass\b/i,
    /\bshut\s+up\b/i,
    /\bget\s+lost\b/i,
    /\bwhat\s+is\s+wrong\s+with\s+you\b/i,
    /\bare\s+you\s+stupid\b/i,
    /\bcan\s+you\s+read\b/i
];

const dismissivePatterns = [
    /\bdon't\s+care\b/i,
    /\bdidn't\s+ask\b/i,
    /\bwho\s+asked\b/i,
    /\bcope\b/i,
    /\bskill\s+issue\b/i,
    /\bwomp\s+womp\b/i,
    /\byap(?:ping)?\b/i
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
    "🕊️ Beloved is deploying emergency peace and affection.",
    "😭 You two are arguing like there is prize money involved."
];

const seriousConflictWarnings = [
    "⚠️ This conversation is becoming hostile. Please take a break and stop targeting each other.",
    "⚠️ Please stop the personal attacks and move on from this conversation.",
    "⚠️ This argument is escalating. Further hostile messages may trigger slowmode.",
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


function calculateHostilityScore(content, hasDirectTarget) {
    const cleanContent = normaliseMessage(content);

    let score = 0;
    let severity = "none";

    if (matchesAnyPattern(cleanContent, severeHostilityPatterns)) {
        score += 8;
        severity = "severe";
    }

    if (matchesAnyPattern(cleanContent, strongHostilityPatterns)) {
        score += 4;

        if (severity === "none") {
            severity = "strong";
        }
    }

    if (matchesAnyPattern(cleanContent, mediumHostilityPatterns)) {
        score += 2;

        if (severity === "none") {
            severity = "medium";
        }
    }

    if (
        hasDirectTarget &&
        matchesAnyPattern(cleanContent, lightHostilityPatterns)
    ) {
        score += 1;

        if (severity === "none") {
            severity = "light";
        }
    }

    if (
        hasDirectTarget &&
        matchesAnyPattern(cleanContent, dismissivePatterns)
    ) {
        score += 0.5;

        if (severity === "none") {
            severity = "dismissive";
        }
    }

    // A hostile phrase aimed directly at somebody is more meaningful
    // than the same phrase posted without context.
    if (hasDirectTarget && score > 0) {
        score += 0.5;
    }

    return {
        score,
        severity
    };
}


function getPairKey(guildId, firstUserId, secondUserId) {
    const users = [firstUserId, secondUserId].sort();

    return `${guildId}:${users[0]}:${users[1]}`;
}


function cleanConflictPair(pairData) {
    const cutoff = Date.now() - CONFLICT_WINDOW;

    pairData.messages = pairData.messages.filter(
        message => message.timestamp >= cutoff
    );

    pairData.totalScore = pairData.messages.reduce(
        (total, message) => total + message.score,
        0
    );
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


async function findTargetUser(message) {
    // Direct replies are the strongest sign that a message
    // is aimed at another member.

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
                "Could not fetch replied-to message:",
                error.message
            );
        }
    }

    // Otherwise, use the first direct user mention.

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


function hasMutualArgument(pairData) {
    const authors = new Set(
        pairData.messages.map(message => message.authorId)
    );

    return authors.size >= 2;
}


function getExchangeCount(pairData) {
    if (pairData.messages.length < 2) {
        return 0;
    }

    let exchanges = 0;

    for (let index = 1; index < pairData.messages.length; index++) {
        const current = pairData.messages[index];
        const previous = pairData.messages[index - 1];

        if (current.authorId !== previous.authorId) {
            exchanges++;
        }
    }

    return exchanges;
}


function pairWasRecentlyWarned(pairKey) {
    const warningTime = recentlyWarnedPairs.get(pairKey);

    if (!warningTime) {
        return false;
    }

    if (Date.now() - warningTime > WARNING_COOLDOWN) {
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

    const description = [
        `**Action:** ${data.action}`,
        `**Channel:** <#${data.channelId}>`,
        `**Members:** <@${data.userOneId}> and <@${data.userTwoId}>`,
        `**Conflict score:** ${data.score}`,
        `**Recent exchanges:** ${data.exchanges}`
    ].join("\n");

    try {
        await logChannel.send({
            content: `🛡️ **Beloved Conflict Guard**\n${description}`,
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

    const channelKey = `${channel.guild.id}:${channel.id}`;

    if (channelConflictStates.has(channelKey)) {
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
                const state = channelConflictStates.get(channelKey);

                if (!state) {
                    return;
                }

                await channel.setRateLimitPerUser(
                    state.originalSlowmode,
                    "Beloved Conflict Guard slowmode expired"
                );

                channelConflictStates.delete(channelKey);

                await channel.send(
                    "🕊️ Temporary slowmode has ended. Please keep it peaceful."
                );
            } catch (error) {
                console.error(
                    "Could not restore slowmode:",
                    error.message
                );

                channelConflictStates.delete(channelKey);
            }
        }, SLOWMODE_DURATION);

        channelConflictStates.set(channelKey, {
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
    if (!member) {
        return false;
    }

    if (isModerator(member)) {
        return false;
    }

    if (!member.moderatable) {
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
            `Could not timeout ${member.user.tag}:`,
            error.message
        );

        return false;
    }
}


async function processConflictMessage(message) {
    if (!message.guild || !message.member) {
        return;
    }

    const settings = getGuildSettings(message.guild.id);

    if (!settings.enabled) {
        return;
    }

    // Moderators can still be targeted, but their own moderation messages
    // should not accidentally count as conflict messages.

    if (isModerator(message.member)) {
        return;
    }

    const target = await findTargetUser(message);

    // The system intentionally requires a reply or direct mention.
    // Random swearing and self-directed swearing are ignored.

    if (!target) {
        return;
    }

    const hostility = calculateHostilityScore(
        message.content,
        true
    );

    if (hostility.score <= 0) {
        return;
    }

    const pairKey = getPairKey(
        message.guild.id,
        message.author.id,
        target.user.id
    );

    let pairData = conflictPairs.get(pairKey);

    if (!pairData) {
        pairData = {
            guildId: message.guild.id,
            channelId: message.channel.id,
            userIds: [
                message.author.id,
                target.user.id
            ],
            messages: [],
            totalScore: 0,
            warned: false,
            slowmodeTriggered: false,
            timeoutTriggered: false,
            lastUpdated: Date.now()
        };
    }

    cleanConflictPair(pairData);

    const repeatedBySameAuthor = pairData.messages.filter(
        item => item.authorId === message.author.id
    ).length;

    let messageScore = hostility.score;

    // Repeated targeted messages from one person gradually become
    // more concerning.

    if (repeatedBySameAuthor >= 2) {
        messageScore += 1;
    }

    pairData.messages.push({
        authorId: message.author.id,
        targetId: target.user.id,
        score: messageScore,
        severity: hostility.severity,
        timestamp: Date.now(),
        messageId: message.id
    });

    pairData.channelId = message.channel.id;
    pairData.lastUpdated = Date.now();

    cleanConflictPair(pairData);
    conflictPairs.set(pairKey, pairData);

    const sensitivity = sensitivityLevels[
        settings.sensitivity
    ] || sensitivityLevels.normal;

    const mutualArgument = hasMutualArgument(pairData);
    const exchanges = getExchangeCount(pairData);

    // Severe messages can be handled immediately.
    // Ordinary conflict requires mutual back-and-forth or repeated targeting.

    const hasSevereMessage = pairData.messages.some(
        item => item.severity === "severe"
    );

    const repeatedTargeting = pairData.messages.length >= 3;

    const qualifiesForAction =
        hasSevereMessage ||
        mutualArgument ||
        repeatedTargeting;

    if (!qualifiesForAction) {
        return;
    }

    // ------------------------------
    // Warning
    // ------------------------------

    if (
        pairData.totalScore >= sensitivity.warningThreshold &&
        !pairData.warned &&
        !pairWasRecentlyWarned(pairKey)
    ) {
        pairData.warned = true;
        recentlyWarnedPairs.set(pairKey, Date.now());

        const warningCollection = settings.funnyMessages
            ? funnyConflictWarnings
            : seriousConflictWarnings;

        const warning = warningCollection[
            Math.floor(Math.random() * warningCollection.length)
        ];

        await message.channel.send({
            content:
                `${warning}\n\n` +
                `<@${pairData.userIds[0]}> and ` +
                `<@${pairData.userIds[1]}>, please move on or take it to DMs.`,
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

    // ------------------------------
    // Slowmode
    // ------------------------------

    if (
        settings.slowmodeEnabled &&
        pairData.totalScore >= sensitivity.slowmodeThreshold &&
        !pairData.slowmodeTriggered
    ) {
        pairData.slowmodeTriggered = true;

        const result = await enableTemporarySlowmode(
            message.channel
        );

        if (result.success && !result.alreadyActive) {
            await message.channel.send(
                `🐌 This channel has been placed in ` +
                `${SLOWMODE_SECONDS}-second slowmode for 5 minutes ` +
                `because the argument continued.`
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

        if (
            !result.success &&
            result.reason === "missing-permission"
        ) {
            console.log(
                `⚠️ Beloved needs Manage Channels in #${message.channel.name}`
            );
        }
    }

    // ------------------------------
    // Optional automatic timeout
    // ------------------------------

    if (
        settings.timeoutEnabled &&
        pairData.totalScore >= sensitivity.timeoutThreshold &&
        !pairData.timeoutTriggered
    ) {
        pairData.timeoutTriggered = true;

        const authorTimedOut = await timeoutMember(
            message.member,
            "Repeated targeted hostility detected by Beloved Conflict Guard"
        );

        if (authorTimedOut) {
            await message.channel.send({
                content:
                    `⏰ <@${message.author.id}> has been timed out for ` +
                    `10 minutes after continuing the argument.`,
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


// Remove old tracking data to prevent memory buildup.

setInterval(() => {
    const expiryTime = Date.now() - PAIR_EXPIRY;

    for (const [pairKey, pairData] of conflictPairs) {
        if (pairData.lastUpdated < expiryTime) {
            conflictPairs.delete(pairKey);
        }
    }

    for (const [pairKey, warningTime] of recentlyWarnedPairs) {
        if (Date.now() - warningTime > WARNING_COOLDOWN) {
            recentlyWarnedPairs.delete(pairKey);
        }
    }
}, 60 * 1000);


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
                                name: "High — more protective",
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
                        .setDescription("Use funny intervention messages")
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
    if (!interaction.isChatInputCommand()) {
        return;
    }

    try {
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
                fortunes[
                    Math.floor(Math.random() * fortunes.length)
                ]
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

            const coolness = Math.floor(Math.random() * 101);
            const chaos = Math.floor(Math.random() * 101);
            const approval = Math.floor(Math.random() * 101);

            return interaction.reply(
                `⭐ ${user} rating:\n\n` +
                `Coolness: ${coolness}%\n` +
                `Chaos: ${chaos}%\n` +
                `Beloved approval: ${approval}%`
            );
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
                        "🛡️ **Beloved Conflict Guard**\n\n" +
                        `**Status:** ${
                            settings.enabled ? "Enabled ✅" : "Disabled ❌"
                        }\n` +
                        `**Sensitivity:** ${settings.sensitivity}\n` +
                        `**Funny warnings:** ${
                            settings.funnyMessages
                                ? "Enabled"
                                : "Disabled"
                        }\n` +
                        `**Automatic slowmode:** ${
                            settings.slowmodeEnabled
                                ? "Enabled"
                                : "Disabled"
                        }\n` +
                        `**Automatic timeouts:** ${
                            settings.timeoutEnabled
                                ? "Enabled"
                                : "Disabled"
                        }\n` +
                        `**Log channel:** ${
                            settings.logChannelId
                                ? `<#${settings.logChannelId}>`
                                : "Not configured"
                        }\n\n` +
                        `**Warning threshold:** ${
                            thresholds.warningThreshold
                        }\n` +
                        `**Slowmode threshold:** ${
                            thresholds.slowmodeThreshold
                        }\n` +
                        `**Timeout threshold:** ${
                            thresholds.timeoutThreshold
                        }`,
                    ephemeral: true
                });
            }


            if (subcommand === "enable") {
                settings.enabled = true;

                return interaction.reply({
                    content:
                        "✅ Conflict Guard is now enabled.",
                    ephemeral: true
                });
            }


            if (subcommand === "disable") {
                settings.enabled = false;

                return interaction.reply({
                    content:
                        "❌ Conflict Guard is now disabled.",
                    ephemeral: true
                });
            }


            if (subcommand === "sensitivity") {
                settings.sensitivity =
                    interaction.options.getString("level");

                return interaction.reply({
                    content:
                        `🎚️ Conflict Guard sensitivity is now ` +
                        `**${settings.sensitivity}**.`,
                    ephemeral: true
                });
            }


            if (subcommand === "funny") {
                settings.funnyMessages =
                    interaction.options.getBoolean("enabled");

                return interaction.reply({
                    content:
                        `😂 Funny warnings are now ` +
                        `**${
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
                        `🐌 Automatic slowmode is now ` +
                        `**${
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
                        `⏰ Automatic timeouts are now ` +
                        `**${
                            settings.timeoutEnabled
                                ? "enabled"
                                : "disabled"
                        }**.\n\n` +
                        `${
                            settings.timeoutEnabled
                                ? "Members may be timed out for 10 minutes after repeated targeted hostility."
                                : "Beloved will continue warning and using slowmode without timing members out."
                        }`,
                    ephemeral: true
                });
            }


            if (subcommand === "logchannel") {
                const channel =
                    interaction.options.getChannel("channel");

                settings.logChannelId = channel.id;

                return interaction.reply({
                    content:
                        `📋 Conflict Guard logs will now be sent to ${channel}.`,
                    ephemeral: true
                });
            }


            if (subcommand === "clearlogs") {
                settings.logChannelId = null;

                return interaction.reply({
                    content:
                        "📋 Conflict Guard logging has been disabled.",
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
        // Conflict Guard runs first.

        await processConflictMessage(message);

        // Normal Beloved mention replies.

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
                "📞 Beloved customer service, how may I judge you?",
                "✨ Your favourite collection of JavaScript has appeared."
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
// PROCESS ERROR HANDLING
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
