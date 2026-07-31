const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins, randomItem } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const activeHeists = new Map();

const ROLES = [
    { id: "hacker", name: "Hacker", emoji: "💻", desc: "Disables security systems" },
    { id: "driver", name: "Getaway Driver", emoji: "🚗", desc: "Ensures the escape" },
    { id: "muscle", name: "Muscle", emoji: "💪", desc: "Handles the guards" },
    { id: "insider", name: "Inside Man", emoji: "🕵️", desc: "Has the vault codes" }
];

const SUCCESS_STORIES = [
    "The hacker killed the cameras. The muscle distracted the guards with a dance-off. The driver was already running. The insider opened the vault with a wink. **CLEAN.**",
    "Everything went wrong at first — alarms blared, guards appeared, someone sneezed. But somehow, through pure chaos energy, the crew escaped with the bag.",
    "Beloved's vault was supposedly impenetrable. It took exactly 47 seconds. The security team is updating their resumes.",
    "The plan was flawless. Too flawless. Beloved is now questioning whether this was an inside job. (It was.)"
];

const FAIL_STORIES = [
    "The hacker accidentally locked THEMSELVES out. The driver started the car... in reverse. Into a wall. The vault was empty anyway.",
    "The crew showed up wearing matching outfits. The guards immediately knew something was wrong. Everyone pointed fingers. Nobody escaped.",
    "One crew member sneezed during the stealth phase. Alarms everywhere. Beloved's security drones deployed. It was a massacre.",
    "The plan was perfect on paper. Unfortunately, nobody on the team can read. They robbed the wrong building."
];

const ENTRY_COST = 500;
const JOIN_TIME = 60; // seconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName("heist")
        .setDescription("Start a cooperative heist on Beloved's vault (costs 500 coins to join)")
        .addIntegerOption(opt => opt.setName("players").setDescription("Max crew size (2-6)").setMinValue(2).setMaxValue(6)),

    activeHeists,

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "Heists are server-only.", ephemeral: true });

        const existing = [...activeHeists.values()].find(h => h.channelId === interaction.channel.id && !h.ended);
        if (existing) return interaction.reply({ content: "🚨 There's already a heist in progress in this channel.", ephemeral: true });

        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        if (account.balance < ENTRY_COST) {
            return interaction.reply({ content: `You need **${coins(ENTRY_COST)}** to start a heist. You have ${coins(account.balance)}.`, ephemeral: true });
        }

        economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - ENTRY_COST });
        const maxPlayers = interaction.options.getInteger("players") || 4;
        const gameId = interaction.id;

        const game = {
            id: gameId, guildId: interaction.guild.id, channelId: interaction.channel.id,
            hostId: interaction.user.id, players: new Map(), maxPlayers,
            ended: false, message: null, timer: null,
            endsAt: Date.now() + JOIN_TIME * 1000
        };
        game.players.set(interaction.user.id, { id: interaction.user.id, role: null });
        activeHeists.set(gameId, game);

        const embed = heistLobbyEmbed(game);
        const row = heistButtons(gameId);

        await interaction.reply({ embeds: [embed], components: [row] });
        game.message = await interaction.fetchReply();

        game.timer = setTimeout(() => executeHeist(game, interaction.client).catch(console.error), JOIN_TIME * 1000);
    },

    async handleButton(interaction, action, gameId) {
        const game = activeHeists.get(gameId);
        if (!game || game.ended) return interaction.reply({ content: "This heist is over.", ephemeral: true });

        if (action === "join") {
            if (game.players.has(interaction.user.id)) return interaction.reply({ content: "You're already in the crew.", ephemeral: true });
            if (game.players.size >= game.maxPlayers) return interaction.reply({ content: "The crew is full.", ephemeral: true });

            const account = economy.getUser(interaction.guild.id, interaction.user.id);
            if (account.balance < ENTRY_COST) {
                return interaction.reply({ content: `You need **${coins(ENTRY_COST)}** to join. You have ${coins(account.balance)}.`, ephemeral: true });
            }

            economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - ENTRY_COST });
            game.players.set(interaction.user.id, { id: interaction.user.id, role: null });
            return interaction.update({ embeds: [heistLobbyEmbed(game)], components: [heistButtons(gameId)] });
        }

        if (action === "start") {
            if (interaction.user.id !== game.hostId) return interaction.reply({ content: "Only the host can start early.", ephemeral: true });
            if (game.players.size < 2) return interaction.reply({ content: "Need at least 2 crew members.", ephemeral: true });
            clearTimeout(game.timer);
            await interaction.deferUpdate();
            return executeHeist(game, interaction.client);
        }
    }
};

function heistLobbyEmbed(game) {
    const playerList = [...game.players.values()].map((p, i) => `${i + 1}. <@${p.id}>`).join("\n");
    return new EmbedBuilder()
        .setColor(BELOVED_PINK)
        .setAuthor({ name: "🏦 HEIST RECRUITMENT", iconURL: undefined })
        .setDescription(`## 💰 Beloved Vault Robbery\n\n**Mastermind:** <@${game.hostId}>\n**Entry Fee:** ${coins(ENTRY_COST)} per person\n\n**Crew (${game.players.size}/${game.maxPlayers}):**\n${playerList}\n\n*Heist begins <t:${Math.floor(game.endsAt / 1000)}:R> or when the host clicks Start*`)
        .setFooter({ text: "Join the crew • Higher crew = higher reward (but split more ways)" })
        .setTimestamp();
}

function heistButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`heist:join:${gameId}`).setLabel(`Join Heist (${ENTRY_COST} coins)`).setEmoji("💰").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`heist:start:${gameId}`).setLabel("Start Now").setEmoji("▶️").setStyle(ButtonStyle.Primary).setDisabled(disabled)
    );
}

async function executeHeist(game, client) {
    if (game.ended) return;
    game.ended = true;
    activeHeists.delete(game.id);
    clearTimeout(game.timer);

    const crewSize = game.players.size;
    if (crewSize < 2) {
        // Refund the solo player
        for (const [uid] of game.players) {
            const acc = economy.getUser(game.guildId, uid);
            economy.update(game.guildId, uid, { balance: acc.balance + ENTRY_COST });
        }
        const embed = new EmbedBuilder().setColor(0x808080)
            .setDescription("## 😐 Heist Cancelled\n\nNobody joined. Your entry fee has been refunded.\n\nCan't rob a vault alone. Well, you CAN. But you shouldn't.")
            .setTimestamp();
        if (game.message) await game.message.edit({ embeds: [embed], components: [heistButtons(game.id, true)] }).catch(() => {});
        return;
    }

    // Assign random roles
    const shuffledRoles = [...ROLES].sort(() => Math.random() - 0.5);
    let i = 0;
    for (const [, player] of game.players) {
        player.role = shuffledRoles[i % shuffledRoles.length];
        i++;
    }

    // Success chance scales with crew size
    const baseChance = 0.35 + (crewSize * 0.08);
    const success = Math.random() < baseChance;
    const pot = crewSize * ENTRY_COST;

    if (success) {
        const multiplier = 2 + Math.random() * 2;
        const totalPayout = Math.floor(pot * multiplier);
        const perPerson = Math.floor(totalPayout / crewSize);

        for (const [uid] of game.players) {
            const acc = economy.getUser(game.guildId, uid);
            economy.update(game.guildId, uid, { balance: acc.balance + perPerson, total_won: acc.total_won + (perPerson - ENTRY_COST) });
        }

        const roleList = [...game.players.values()].map(p => `${p.role.emoji} **${p.role.name}** — <@${p.id}>`).join("\n");

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setAuthor({ name: "💰 HEIST SUCCESSFUL 💰" })
            .setDescription(`## 🎉 THE VAULT IS EMPTY\n\n${randomItem(SUCCESS_STORIES)}\n\n**Crew & Roles:**\n${roleList}`)
            .addFields(
                { name: "💎 Total Haul", value: `**${coins(totalPayout)}**`, inline: true },
                { name: "💸 Per Person", value: `**${coins(perPerson)}** (+${coins(perPerson - ENTRY_COST)} profit)`, inline: true },
                { name: "👥 Crew Size", value: `${crewSize}`, inline: true }
            )
            .setFooter({ text: "Beloved's insurance premiums just went up" })
            .setTimestamp();

        if (game.message) await game.message.edit({ embeds: [embed], components: [heistButtons(game.id, true)] }).catch(() => {});
    } else {
        const roleList = [...game.players.values()].map(p => `${p.role.emoji} **${p.role.name}** — <@${p.id}>`).join("\n");

        for (const [uid] of game.players) {
            const acc = economy.getUser(game.guildId, uid);
            economy.update(game.guildId, uid, { total_lost: acc.total_lost + ENTRY_COST });
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setAuthor({ name: "🚨 HEIST FAILED 🚨" })
            .setDescription(`## 💀 BUSTED\n\n${randomItem(FAIL_STORIES)}\n\n**Crew & Roles:**\n${roleList}`)
            .addFields(
                { name: "💸 Lost (each)", value: `**-${coins(ENTRY_COST)}**`, inline: true },
                { name: "👥 Crew Size", value: `${crewSize}`, inline: true },
                { name: "🎯 Success Rate", value: `${Math.floor(baseChance * 100)}% (and you missed)`, inline: true }
            )
            .setFooter({ text: "Better luck next time. Beloved's vault remains undefeated." })
            .setTimestamp();

        if (game.message) await game.message.edit({ embeds: [embed], components: [heistButtons(game.id, true)] }).catch(() => {});
    }
}
