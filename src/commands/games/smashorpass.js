const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { formatVoterList } = require("../../utils/helpers");

const activeGames = new Map();

function buildButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`sop:smash:${gameId}`).setLabel("Smash").setEmoji("\u2764\uFE0F").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`sop:pass:${gameId}`).setLabel("Pass").setEmoji("\u274C").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function buildEmbed(game, ended = false) {
    const smashCount = [...game.votes.values()].filter(v => v === "smash").length;
    const passCount = [...game.votes.values()].filter(v => v === "pass").length;
    const embed = new EmbedBuilder()
        .setTitle(ended ? "\u{1F525} Smash or Pass \u2014 Results" : "\u{1F525} Smash or Pass")
        .setDescription(`**Target:** <@${game.targetId}>\n**Started by:** <@${game.hostId}>`)
        .addFields(
            { name: "\u2764\uFE0F Smash", value: `${smashCount} vote${smashCount === 1 ? "" : "s"}`, inline: true },
            { name: "\u274C Pass", value: `${passCount} vote${passCount === 1 ? "" : "s"}`, inline: true }
        )
        .setThumbnail(game.targetAvatar)
        .setFooter({ text: ended ? "Voting has ended \u2014 Beloved brought receipts." : "One vote per person. Click again to change your vote." })
        .setTimestamp();
    if (!ended) embed.addFields({ name: "\u23F3 Time remaining", value: `<t:${Math.floor(game.endsAt / 1000)}:R>` });
    return embed;
}

async function finishGame(gameId) {
    const game = activeGames.get(gameId);
    if (!game || game.ended) return;
    game.ended = true;
    activeGames.delete(gameId);

    const smashVoters = [], passVoters = [];
    for (const [uid, vote] of game.votes) {
        (vote === "smash" ? smashVoters : passVoters).push(uid);
    }
    const result = smashVoters.length > passVoters.length ? "\u2764\uFE0F **SMASH WINS**"
        : passVoters.length > smashVoters.length ? "\u274C **PASS WINS**"
        : "\u{1F91D} **IT'S A TIE**";

    const embed = buildEmbed(game, true).addFields(
        { name: `\u2764\uFE0F Voted Smash (${smashVoters.length})`, value: formatVoterList(smashVoters) },
        { name: `\u274C Voted Pass (${passVoters.length})`, value: formatVoterList(passVoters) },
        { name: "\u{1F3C6} Final result", value: result }
    );
    try { await game.message.edit({ embeds: [embed], components: [buildButtons(gameId, true)], allowedMentions: { parse: [] } }); } catch (_) {}
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("smashorpass")
        .setDescription("Start a Smash or Pass vote for someone")
        .addUserOption(opt => opt.setName("user").setDescription("The person people will vote on").setRequired(true))
        .addIntegerOption(opt => opt.setName("duration").setDescription("Voting time in seconds (10-300)").setMinValue(10).setMaxValue(300)),

    activeGames,

    async execute(interaction) {
        if (!interaction.guild || !interaction.channel?.isTextBased()) {
            return interaction.reply({ content: "This game can only be started in a server text channel.", ephemeral: true });
        }
        const target = interaction.options.getUser("user");
        const duration = interaction.options.getInteger("duration") || 60;
        if (target.bot) return interaction.reply({ content: "\u{1F916} Leave the bots out of this one.", ephemeral: true });

        const gameId = interaction.id;
        const game = {
            id: gameId, guildId: interaction.guild.id, channelId: interaction.channel.id,
            hostId: interaction.user.id, targetId: target.id,
            targetAvatar: target.displayAvatarURL({ size: 256 }),
            endsAt: Date.now() + duration * 1000, votes: new Map(), ended: false, message: null, timer: null
        };

        await interaction.reply({ embeds: [buildEmbed(game)], components: [buildButtons(gameId)], allowedMentions: { users: [target.id, interaction.user.id] } });
        game.message = await interaction.fetchReply();
        activeGames.set(gameId, game);
        game.timer = setTimeout(() => finishGame(gameId).catch(console.error), duration * 1000);
    },

    async handleButton(interaction, vote, gameId) {
        const game = activeGames.get(gameId);
        if (!game || game.ended || Date.now() >= game.endsAt) return interaction.reply({ content: "\u23F0 Voting has already ended.", ephemeral: true });
        if (interaction.user.bot) return interaction.reply({ content: "\u{1F916} Bots cannot vote.", ephemeral: true });
        if (interaction.user.id === game.targetId) return interaction.reply({ content: "\u{1F62D} You cannot vote on yourself.", ephemeral: true });

        const prev = game.votes.get(interaction.user.id);
        game.votes.set(interaction.user.id, vote);
        await interaction.update({ embeds: [buildEmbed(game)], components: [buildButtons(gameId)] });
        const resp = prev === vote ? `Your vote is still **${vote.toUpperCase()}**.`
            : prev ? `Vote changed from **${prev.toUpperCase()}** to **${vote.toUpperCase()}**.`
            : `Vote locked in: **${vote.toUpperCase()}**.`;
        return interaction.followUp({ content: resp, ephemeral: true });
    }
};
