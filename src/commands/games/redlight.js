const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");

const activeGames = new Map();
const gameByChannel = new Map();

function alivePlayers(game) { return [...game.players.values()].filter(p => !p.eliminated); }

function track(progress, distance) {
    const len = 16;
    const filled = Math.max(0, Math.min(len, Math.floor((progress / distance) * len)));
    return "\u{1F7E9}".repeat(filled) + "\u2B1C".repeat(len - filled) + " \u{1F3C1}";
}

function playerList(game) {
    const players = [...game.players.values()].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.progress - a.progress);
    if (!players.length) return "Nobody has joined yet.";
    return players.map(p => {
        if (p.eliminated) return `\u{1F480} <@${p.id}> \u2014 eliminated`;
        return `<@${p.id}> \u2014 **${p.progress}/${game.distance}**\n${track(p.progress, game.distance)}`;
    }).join("\n\n").slice(0, 3900);
}

function lobbyEmbed(game) {
    return belovedEmbed("\u{1F6A6} Red Light, Green Light")
        .setDescription(`Press **Join Game** below to enter!\n\n\u{1F7E2} On **GREEN LIGHT**, spam **RUN** to move.\n\u{1F534} On **RED LIGHT**, do not touch the button or you are instantly eliminated.\n\u{1F3C1} First player to reach the finish line wins.\n\n**Players (${game.players.size}/${game.maxPlayers})**\n${playerList(game)}`)
        .addFields({ name: "\u23F3 Lobby closes", value: `<t:${Math.floor(game.lobbyEndsAt / 1000)}:R>`, inline: true })
        .setFooter({ text: "The host can start early with 2 or more players." });
}

function gameEmbed(game, finalText = null) {
    const phaseTitle = game.phase === "green" ? "\u{1F7E2} GREEN LIGHT \u2014 RUN!" : game.phase === "red" ? "\u{1F534} RED LIGHT \u2014 FREEZE!" : "\u23F3 Get ready...";
    return belovedEmbed(finalText ? "\u{1F3C6} Red Light, Green Light \u2014 Finished" : phaseTitle)
        .setDescription(`${finalText || (game.phase === "green" ? "Spam the **RUN** button now!" : game.phase === "red" ? "Do **NOT** click. One click means elimination." : "The game is about to begin...")}\n\n**Cycle:** ${game.cycle}\n**Players remaining:** ${alivePlayers(game).length}\n\n${playerList(game)}`)
        .setFooter({ text: finalText ? "Beloved saw every illegal movement." : "The light changes at a random time \u2014 stay alert." });
}

function lobbyButtons(gameId, disabled = false) {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`rlgl:join:${gameId}`).setLabel("Join Game").setEmoji("\u{1F6A6}").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`rlgl:leave:${gameId}`).setLabel("Leave").setEmoji("\u{1F6AA}").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`rlgl:start:${gameId}`).setLabel("Start Now").setEmoji("\u25B6\uFE0F").setStyle(ButtonStyle.Primary).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`rlgl:cancel:${gameId}`).setLabel("Cancel").setEmoji("\u2716\uFE0F").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    )];
}

function runButton(game, disabled = false) {
    const isGreen = game.phase === "green";
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rlgl:run:${game.id}`)
            .setLabel(isGreen ? "RUN!" : game.phase === "red" ? "FREEZE!" : "GET READY")
            .setEmoji(isGreen ? "\u{1F3C3}" : game.phase === "red" ? "\u{1F6D1}" : "\u23F3")
            .setStyle(isGreen ? ButtonStyle.Success : game.phase === "red" ? ButtonStyle.Danger : ButtonStyle.Secondary)
            .setDisabled(disabled)
    )];
}

function clearTimers(game) { clearTimeout(game.lobbyTimer); clearTimeout(game.phaseTimer); clearTimeout(game.renderTimer); }

async function renderGame(game) {
    if (!game.message || game.status === "ended") return;
    await game.message.edit({ embeds: [gameEmbed(game)], components: runButton(game) }).catch(() => {});
}

function scheduleRender(game) {
    if (game.renderTimer || game.status !== "playing") return;
    game.renderTimer = setTimeout(async () => { game.renderTimer = null; await renderGame(game); }, 350);
}

async function endGame(game, reason = "winner", winnerId = null) {
    if (!game || game.status === "ended") return;
    game.status = "ended"; clearTimers(game);
    activeGames.delete(game.id); gameByChannel.delete(game.channelId);

    let text;
    if (reason === "cancelled") text = "\u{1F6AB} The host cancelled the game.";
    else if (reason === "not-enough") text = "\u{1F62D} The game ended because fewer than two players joined.";
    else if (winnerId) text = `\u{1F389} <@${winnerId}> crossed the finish line first and wins **Red Light, Green Light**!`;
    else {
        const survivors = alivePlayers(game);
        text = survivors.length === 1 ? `\u{1F389} <@${survivors[0].id}> is the last player standing and wins!` : "\u{1F480} Everyone was eliminated. The doll wins.";
    }
    if (game.message) await game.message.edit({ embeds: [gameEmbed(game, text)], components: runButton(game, true), allowedMentions: { parse: [] } }).catch(() => {});
}

async function setPhase(game, phase) {
    if (!game || game.status !== "playing") return;
    game.phase = phase; game.phaseToken += 1; game.phaseClicks.clear();
    await renderGame(game);

    if (phase === "green") {
        const duration = 2200 + Math.floor(Math.random() * 2300);
        game.phaseTimer = setTimeout(() => setPhase(game, "red").catch(console.error), duration);
    } else {
        const alive = alivePlayers(game);
        if (alive.length <= 1) return endGame(game, "last-standing", alive[0]?.id || null);
        game.cycle += 1;
        const duration = 1400 + Math.floor(Math.random() * 2100);
        game.phaseTimer = setTimeout(() => setPhase(game, "green").catch(console.error), duration);
    }
}

async function startGame(game) {
    if (!game || game.status !== "lobby") return;
    clearTimeout(game.lobbyTimer);
    if (game.players.size < 2) return endGame(game, "not-enough");
    game.status = "playing"; game.phase = "ready"; game.cycle = 1;
    await game.message.edit({ embeds: [gameEmbed(game)], components: runButton(game, true) }).catch(() => {});
    game.phaseTimer = setTimeout(() => setPhase(game, "green").catch(console.error), 2500);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("redlight")
        .setDescription("Start a Red Light, Green Light elimination race")
        .addIntegerOption(opt => opt.setName("lobby").setDescription("Join time in seconds (15-60)").setMinValue(15).setMaxValue(60))
        .addIntegerOption(opt => opt.setName("distance").setDescription("Finish distance (20-50, default 30)").setMinValue(20).setMaxValue(50)),

    activeGames,

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "This game can only be played in a server.", ephemeral: true });
        if (gameByChannel.has(interaction.channel.id)) return interaction.reply({ content: "\u{1F6A6} A Red Light, Green Light game is already active in this channel.", ephemeral: true });

        const lobbySeconds = interaction.options.getInteger("lobby") || 30;
        const distance = interaction.options.getInteger("distance") || 30;
        const gameId = interaction.id;
        const game = {
            id: gameId, guildId: interaction.guild.id, channelId: interaction.channel.id, channel: interaction.channel,
            hostId: interaction.user.id, status: "lobby", phase: "lobby", cycle: 0, distance, maxPlayers: 25,
            maxMovesPerGreen: 4, players: new Map(), phaseClicks: new Map(), phaseToken: 0,
            message: null, lobbyEndsAt: Date.now() + lobbySeconds * 1000,
            lobbyTimer: null, phaseTimer: null, renderTimer: null
        };
        game.players.set(interaction.user.id, { id: interaction.user.id, progress: 0, eliminated: false, lastClickAt: 0 });
        activeGames.set(gameId, game); gameByChannel.set(interaction.channel.id, gameId);

        await interaction.reply({ embeds: [lobbyEmbed(game)], components: lobbyButtons(gameId), fetchReply: true });
        game.message = await interaction.fetchReply();
        game.lobbyTimer = setTimeout(() => startGame(game).catch(console.error), lobbySeconds * 1000);
    },

    async handleButton(interaction, action, gameId) {
        const game = activeGames.get(gameId);
        if (!game || game.status === "ended") return interaction.reply({ content: "This Red Light, Green Light game is over.", ephemeral: true });

        if (action === "join" || action === "leave") {
            if (game.status !== "lobby") return interaction.reply({ content: "The race has already started.", ephemeral: true });
            if (action === "join") {
                if (game.players.has(interaction.user.id)) return interaction.reply({ content: "\u{1F6A6} You are already in the game.", ephemeral: true });
                if (game.players.size >= game.maxPlayers) return interaction.reply({ content: "This lobby is full.", ephemeral: true });
                game.players.set(interaction.user.id, { id: interaction.user.id, progress: 0, eliminated: false, lastClickAt: 0 });
            } else {
                if (interaction.user.id === game.hostId) return interaction.reply({ content: "The host cannot leave. Use Cancel instead.", ephemeral: true });
                game.players.delete(interaction.user.id);
            }
            return interaction.update({ embeds: [lobbyEmbed(game)], components: lobbyButtons(game.id) });
        }

        if (action === "start" || action === "cancel") {
            if (interaction.user.id !== game.hostId) return interaction.reply({ content: "Only the host can control this game.", ephemeral: true });
            await interaction.deferUpdate();
            return action === "start" ? startGame(game) : endGame(game, "cancelled");
        }

        if (action === "run") {
            const player = game.players.get(interaction.user.id);
            if (game.status !== "playing" || !player || player.eliminated) return interaction.reply({ content: "\u{1F37F} You are only spectating this race.", ephemeral: true });
            const now = Date.now();
            if (now - player.lastClickAt < 180) return interaction.deferUpdate();
            player.lastClickAt = now;

            if (game.phase === "red") {
                player.eliminated = true;
                await interaction.deferUpdate();
                const alive = alivePlayers(game);
                if (alive.length <= 1) return endGame(game, "last-standing", alive[0]?.id || null);
                await renderGame(game);
                return;
            }

            if (game.phase !== "green") return interaction.deferUpdate();
            const clickKey = `${game.phaseToken}:${interaction.user.id}`;
            const clicks = game.phaseClicks.get(clickKey) || 0;
            if (clicks >= game.maxMovesPerGreen) return interaction.deferUpdate();
            game.phaseClicks.set(clickKey, clicks + 1);
            player.progress = Math.min(game.distance, player.progress + 1);
            await interaction.deferUpdate();
            if (player.progress >= game.distance) return endGame(game, "winner", player.id);
            scheduleRender(game);
        }
    }
};
