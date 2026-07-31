const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { randomItem, normaliseCountryGuess } = require("../../utils/helpers");
const COUNTRY_QUESTIONS = require("../../data/countries.json");

const activeGames = new Map();
const gameByChannel = new Map();
const COUNTRY_JOIN_EMOJI = "\u{1F30D}";
const seenByChannel = new Map();

function chooseQuestion(game) {
    let seen = seenByChannel.get(game.channelId);
    if (!seen) { seen = new Set(); seenByChannel.set(game.channelId, seen); }
    let choices = COUNTRY_QUESTIONS.filter(q => !game.usedCountries.has(q.country) && !seen.has(q.country));
    if (!choices.length) { seen.clear(); choices = COUNTRY_QUESTIONS.filter(q => !game.usedCountries.has(q.country)); }
    if (!choices.length) { game.usedCountries.clear(); choices = [...COUNTRY_QUESTIONS]; }
    const question = randomItem(choices);
    seen.add(question.country); game.usedCountries.add(question.country);
    return question;
}

function playerLines(game) {
    const players = [...game.players.values()]
        .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.score - a.score || b.lives - a.lives);
    if (!players.length) return "Nobody has joined yet.";
    return players.map((p, i) => {
        const crown = i === 0 && game.status === "ended" ? "\u{1F451} " : "";
        const state = p.eliminated ? "\u{1F480} ELIMINATED" : `${"\u2764\uFE0F".repeat(p.lives)}${"\u{1F5A4}".repeat(Math.max(0, game.startingLives - p.lives))}`;
        return `${crown}<@${p.id}> \u2014 ${state} \u2022 **${p.score}** pt${p.score === 1 ? "" : "s"} \u2022 misses **${p.misses || 0}/2**`;
    }).join("\n").slice(0, 3900);
}

function lobbyButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`country:start:${gameId}`).setLabel("Start Now").setEmoji("\u25B6\uFE0F").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`country:cancel:${gameId}`).setLabel("Cancel").setEmoji("\u2716\uFE0F").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function lobbyEmbed(game) {
    return belovedEmbed("\u{1F30D} Guess the Country \u2014 Tournament Lobby")
        .setDescription(`React with ${COUNTRY_JOIN_EMOJI} to enter!\n\n**How it works**\nEvery round shows a **country flag image**. The **first living player** to type the correct country is safe and earns a point. Other players gain a miss; every **2 misses** costs 1 life.`)
        .addFields(
            { name: "\u{1F3AE} Host", value: `<@${game.hostId}>`, inline: true },
            { name: "\u2764\uFE0F Lives", value: `${game.startingLives}`, inline: true },
            { name: "\u23F1\uFE0F Round time", value: `${game.roundSeconds} seconds`, inline: true },
            { name: `\u{1F465} Players (${game.players.size})`, value: playerLines(game), inline: false },
            { name: "\u{1F6AA} Lobby closes", value: `<t:${Math.floor(game.lobbyEndsAt / 1000)}:R>` }
        )
        .setFooter({ text: "Minimum 2 players \u2022 Game guesses are cleaned automatically" });
}

function flagUrl(question, width = 640) {
    return `https://flagcdn.com/w${width}/${question.code}.png?v=${Date.now()}`;
}

function roundEmbed(game, question, hintLevel = 1) {
    let desc = "## \u{1F6A9} GUESS THIS FLAG\n\nLook closely at the flag image and type the country name in chat.\n\n**First correct living player wins the round!**";
    if (hintLevel >= 2) desc += `\n\n### \u{1F4A1} Hint\n> ${question.hints[0]}`;
    return belovedEmbed(`\u{1F30D} Guess the Country \u2022 Round ${game.round}`)
        .setDescription(desc)
        .addFields(
            { name: "\u23F3 Time remaining", value: `<t:${Math.floor(game.roundEndsAt / 1000)}:R>`, inline: true },
            { name: "\u{1F9CD} Still alive", value: `${getAlive(game).length}`, inline: true },
            { name: "\u{1F3C6} Scores & lives", value: playerLines(game), inline: false }
        )
        .setImage(flagUrl(question))
        .setFooter({ text: "Spelling is flexible \u2022 Eliminated players spectate" });
}

function getAlive(game) { return [...game.players.values()].filter(p => !p.eliminated); }

async function deleteGuesses(game) {
    if (!game?.channel?.isTextBased()) return;
    const ids = [...(game.guessMessageIds || new Set())];
    game.guessMessageIds?.clear();
    if (ids.length) {
        try { await game.channel.bulkDelete(ids, true); } catch (_) {
            for (const id of ids) await game.channel.messages.delete(id).catch(() => {});
        }
    }
}

async function endCountryGame(game, reason = "winner") {
    if (!game || game.status === "ended") return;
    game.status = "ended"; clearTimeout(game.lobbyTimer); clearTimeout(game.roundTimer); clearTimeout(game.hintTimer);
    activeGames.delete(game.id); gameByChannel.delete(game.channelId);
    const ranked = [...game.players.values()].sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.lives - a.lives || b.score - a.score);
    const winner = ranked[0];
    let description;
    if (reason === "cancelled") description = `The tournament was cancelled by <@${game.hostId}>.`;
    else if (reason === "not-enough") description = "At least **2 players** were needed to begin.";
    else if (winner) description = `# \u{1F451} <@${winner.id}> WINS!\nThey survived **${game.round} round${game.round === 1 ? "" : "s"}** with **${winner.score} point${winner.score === 1 ? "" : "s"}**.`;
    else description = "Nobody survived the country chaos.";
    const title = reason === "cancelled" ? "\u2716\uFE0F Country Game Cancelled" : reason === "not-enough" ? "\u{1F614} Country Game Cancelled" : "\u{1F3C6} Guess the Country Champion";
    const embed = belovedEmbed(title).setDescription(description).addFields({ name: "\u{1F4CA} Final standings", value: playerLines(game) }).setFooter({ text: "Beloved Geography Department" });
    await deleteGuesses(game);
    if (game.roundMessage) await game.roundMessage.delete().catch(() => {});
    if (game.message) await game.message.delete().catch(() => {});
    await game.channel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}

async function resolveRound(game, winnerId) {
    if (!game || game.status !== "round" || game.roundResolved) return;
    game.roundResolved = true; clearTimeout(game.roundTimer); clearTimeout(game.hintTimer);
    const aliveBefore = getAlive(game);
    if (winnerId && game.players.has(winnerId)) game.players.get(winnerId).score += 1;
    const eliminatedNow = [], lostLifeNow = [];
    for (const p of aliveBefore) {
        if (p.id === winnerId) { p.misses = 0; continue; }
        p.misses = (p.misses || 0) + 1;
        if (p.misses >= 2) {
            p.misses = 0; p.lives -= 1; lostLifeNow.push(p.id);
            if (p.lives <= 0) { p.lives = 0; p.eliminated = true; eliminatedNow.push(p.id); }
        }
    }
    const answer = `${game.currentQuestion.flag} **${game.currentQuestion.country}**`;
    const resultText = winnerId ? `\u26A1 <@${winnerId}> guessed first!` : "\u23F0 Nobody answered in time.";
    const lifeLoss = lostLifeNow.length ? `\n\n\u{1F494} **Lost a life:** ${lostLifeNow.map(id => `<@${id}>`).join(", ")}` : "";
    const elim = eliminatedNow.length ? `\n\n\u{1F480} **Eliminated:** ${eliminatedNow.map(id => `<@${id}>`).join(", ")}` : "";
    const embed = belovedEmbed(`\u2705 Round ${game.round} Complete`)
        .setDescription(`${resultText}\n\nThe answer was ${answer}.${lifeLoss}${elim}`)
        .addFields({ name: "\u{1F4CA} Tournament status", value: playerLines(game) })
        .setThumbnail(flagUrl(game.currentQuestion, 320))
        .setFooter({ text: "Next round begins in 4 seconds" });
    await game.roundMessage.edit({ embeds: [embed] }).catch(() => {});
    if (getAlive(game).length <= 1) return setTimeout(() => endCountryGame(game, "winner").catch(console.error), 4000);
    game.status = "between";
    setTimeout(() => startRound(game).catch(console.error), 4000);
}

async function startRound(game) {
    if (!game || game.status === "ended") return;
    const alive = getAlive(game);
    if (alive.length <= 1) return endCountryGame(game, "winner");
    await deleteGuesses(game);
    if (game.roundMessage) await game.roundMessage.delete().catch(() => {});
    if (game.round === 0 && game.message) await game.message.delete().catch(() => {});
    game.status = "round"; game.round += 1; game.roundResolved = false;
    game.guessMessageIds = new Set(); game.currentQuestion = chooseQuestion(game);
    game.roundEndsAt = Date.now() + game.roundSeconds * 1000;
    game.roundMessage = await game.channel.send({ embeds: [roundEmbed(game, game.currentQuestion, 1)] });
    game.hintTimer = setTimeout(async () => {
        if (game.status !== "round" || game.roundResolved) return;
        await game.roundMessage.edit({ embeds: [roundEmbed(game, game.currentQuestion, 2)] }).catch(() => {});
    }, Math.floor(game.roundSeconds * 500));
    game.roundTimer = setTimeout(() => resolveRound(game, null).catch(console.error), game.roundSeconds * 1000);
}

async function startCountryGame(game) {
    if (!game || game.status !== "lobby") return;
    clearTimeout(game.lobbyTimer);
    if (game.players.size < 2) return endCountryGame(game, "not-enough");
    game.status = "starting";
    await game.message.edit({ embeds: [belovedEmbed("\u{1F30D} Tournament Starting!").setDescription(`**${game.players.size} players** have entered.\n\nFirst flag appears in **3 seconds**!`).addFields({ name: "\u{1F465} Competitors", value: playerLines(game) })], components: [lobbyButtons(game.id, true)] }).catch(() => {});
    setTimeout(() => startRound(game).catch(console.error), 3000);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("countrygame")
        .setDescription("Start an elimination Guess the Country tournament")
        .addIntegerOption(opt => opt.setName("lives").setDescription("Lives per player (3-10, default 5)").setMinValue(3).setMaxValue(10))
        .addIntegerOption(opt => opt.setName("lobby").setDescription("Join time in seconds (15-60)").setMinValue(15).setMaxValue(60))
        .addIntegerOption(opt => opt.setName("roundtime").setDescription("Seconds per flag (15-45, default 25)").setMinValue(15).setMaxValue(45)),

    activeGames, gameByChannel, COUNTRY_JOIN_EMOJI,

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "This game can only be played in a server.", ephemeral: true });
        if (gameByChannel.has(interaction.channel.id)) return interaction.reply({ content: "\u{1F30D} A country tournament is already active in this channel.", ephemeral: true });
        const startingLives = interaction.options.getInteger("lives") || 5;
        const lobbySeconds = interaction.options.getInteger("lobby") || 30;
        const roundSeconds = interaction.options.getInteger("roundtime") || 25;
        const gameId = interaction.id;
        const game = {
            id: gameId, guildId: interaction.guild.id, channelId: interaction.channel.id, channel: interaction.channel,
            hostId: interaction.user.id, startingLives, roundSeconds, status: "lobby", round: 0,
            players: new Map(), usedCountries: new Set(), currentQuestion: null, message: null, roundMessage: null,
            guessMessageIds: new Set(), lobbyEndsAt: Date.now() + lobbySeconds * 1000, roundEndsAt: 0, roundResolved: false,
            lobbyTimer: null, roundTimer: null, hintTimer: null
        };
        game.players.set(interaction.user.id, { id: interaction.user.id, lives: startingLives, score: 0, misses: 0, eliminated: false });
        activeGames.set(gameId, game); gameByChannel.set(interaction.channel.id, gameId);
        await interaction.reply({ embeds: [lobbyEmbed(game)], components: [lobbyButtons(gameId)], fetchReply: true });
        game.message = await interaction.fetchReply();
        await game.message.react(COUNTRY_JOIN_EMOJI).catch(() => {});
        game.lobbyTimer = setTimeout(() => startCountryGame(game).catch(console.error), lobbySeconds * 1000);
    },

    async handleButton(interaction, action, gameId) {
        const game = activeGames.get(gameId);
        if (!game || game.status !== "lobby") return interaction.reply({ content: "This country lobby is no longer open.", ephemeral: true });
        if (interaction.user.id !== game.hostId) return interaction.reply({ content: "Only the host can control this tournament.", ephemeral: true });
        await interaction.deferUpdate();
        if (action === "start") return startCountryGame(game);
        if (action === "cancel") return endCountryGame(game, "cancelled");
    },

    // Called from messageCreate for guess checking
    checkGuess(message) {
        const gameId = gameByChannel.get(message.channel.id);
        const game = gameId ? activeGames.get(gameId) : null;
        if (!game || game.status !== "round" || game.roundResolved) return false;
        const player = game.players.get(message.author.id);
        if (!player || player.eliminated) return false;
        game.guessMessageIds.add(message.id);
        const guess = normaliseCountryGuess(message.content);
        const correct = game.currentQuestion.aliases.some(alias => normaliseCountryGuess(alias) === guess);
        if (correct) {
            message.react("\u2705").catch(() => {});
            resolveRound(game, message.author.id).catch(console.error);
            return true;
        }
        return false;
    }
};
