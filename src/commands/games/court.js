const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { formatVoterList } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

const activeCourts = new Map();

function courtButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`court:guilty:${gameId}`).setLabel("Guilty").setEmoji("\u{1F528}").setStyle(ButtonStyle.Danger).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`court:notguilty:${gameId}`).setLabel("Not Guilty").setEmoji("\u{1F607}").setStyle(ButtonStyle.Success).setDisabled(disabled)
    );
}

function courtEmbed(game, ended = false) {
    const guilty = [...game.votes.values()].filter(v => v === "guilty").length;
    const notGuilty = [...game.votes.values()].filter(v => v === "notguilty").length;
    const embed = new EmbedBuilder().setColor(BELOVED_PINK)
        .setTitle(ended ? "\u2696\uFE0F Court Verdict" : "\u2696\uFE0F Beloved Court Is Now In Session")
        .setDescription(`**Defendant:** <@${game.accusedId}>\n**Accused by:** <@${game.hostId}>\n**Charge:** ${game.charge}`)
        .addFields(
            { name: "\u{1F528} Guilty", value: `${guilty} vote${guilty === 1 ? "" : "s"}`, inline: true },
            { name: "\u{1F607} Not Guilty", value: `${notGuilty} vote${notGuilty === 1 ? "" : "s"}`, inline: true }
        )
        .setFooter({ text: ended ? "The jury has spoken. Receipts are public." : "One vote each. You may change your vote." })
        .setTimestamp();
    if (!ended) embed.addFields({ name: "\u23F3 Court closes", value: `<t:${Math.floor(game.endsAt / 1000)}:R>` });
    return embed;
}

async function finishCourt(gameId) {
    const game = activeCourts.get(gameId);
    if (!game || game.ended) return;
    game.ended = true; activeCourts.delete(gameId);
    const guilty = [], notGuilty = [];
    for (const [id, vote] of game.votes) (vote === "guilty" ? guilty : notGuilty).push(id);
    const verdict = guilty.length > notGuilty.length ? "\u{1F528} **GUILTY!** Sentenced to public embarrassment."
        : notGuilty.length > guilty.length ? "\u{1F607} **NOT GUILTY!** The defendant walks free."
        : "\u{1F91D} **HUNG JURY!** Everyone argued and achieved nothing.";
    const embed = courtEmbed(game, true).addFields(
        { name: "\u{1F4E2} Verdict", value: verdict },
        { name: `\u{1F528} Guilty voters (${guilty.length})`, value: formatVoterList(guilty) },
        { name: `\u{1F607} Not Guilty voters (${notGuilty.length})`, value: formatVoterList(notGuilty) }
    );
    await game.message.edit({ embeds: [embed], components: [courtButtons(gameId, true)] }).catch(() => {});
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("court")
        .setDescription("Put someone on trial and let the server vote")
        .addUserOption(opt => opt.setName("user").setDescription("The defendant").setRequired(true))
        .addStringOption(opt => opt.setName("charge").setDescription("What are they accused of?").setRequired(true).setMaxLength(200))
        .addIntegerOption(opt => opt.setName("duration").setDescription("Voting time in seconds (15-300)").setMinValue(15).setMaxValue(300)),

    activeCourts,

    async execute(interaction) {
        const accused = interaction.options.getUser("user");
        const charge = interaction.options.getString("charge");
        const duration = interaction.options.getInteger("duration") || 60;
        if (accused.bot) return interaction.reply({ content: "\u{1F916} Bots are above Beloved law.", ephemeral: true });
        const gameId = interaction.id;
        const game = { id: gameId, accusedId: accused.id, hostId: interaction.user.id, charge, endsAt: Date.now() + duration * 1000, votes: new Map(), ended: false, message: null };
        await interaction.reply({ embeds: [courtEmbed(game)], components: [courtButtons(gameId)], allowedMentions: { users: [accused.id, interaction.user.id] } });
        game.message = await interaction.fetchReply();
        activeCourts.set(gameId, game);
        setTimeout(() => finishCourt(gameId).catch(console.error), duration * 1000);
    },

    async handleButton(interaction, vote, gameId) {
        const game = activeCourts.get(gameId);
        if (!game || game.ended || Date.now() >= game.endsAt) return interaction.reply({ content: "\u2696\uFE0F Court is closed.", ephemeral: true });
        game.votes.set(interaction.user.id, vote);
        await interaction.update({ embeds: [courtEmbed(game)], components: [courtButtons(gameId)] });
        return interaction.followUp({ content: `\u{1F5F3}\uFE0F Your jury vote is locked in.`, ephemeral: true });
    }
};
