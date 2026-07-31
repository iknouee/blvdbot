const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, randomItem } = require("../../utils/helpers");
const marriage = require("../../systems/marriage");
const economy = require("../../systems/economy");

const activeProposals = new Map();

function proposalButtons(gameId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`marry:accept:${gameId}`).setLabel("Accept").setEmoji("\u{1F496}").setStyle(ButtonStyle.Success).setDisabled(disabled),
        new ButtonBuilder().setCustomId(`marry:reject:${gameId}`).setLabel("Reject").setEmoji("\u{1F494}").setStyle(ButtonStyle.Danger).setDisabled(disabled)
    );
}

function proposalEmbed(game, result = null) {
    return belovedEmbed(result ? "\u{1F48D} Proposal Results" : "\u{1F48D} A Very Serious Proposal")
        .setDescription(`<@${game.proposerId}> has proposed to <@${game.targetId}>!\n\n${result || "Will they accept this legally questionable Discord marriage?"}`)
        .setFooter({ text: result ? "Beloved has witnessed everything." : "Only the proposed user can answer." });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("marry")
        .setDescription("Propose a totally legitimate Discord marriage")
        .addUserOption(opt => opt.setName("user").setDescription("Who are you proposing to?").setRequired(true)),

    activeProposals,

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        if (target.bot) return interaction.reply({ content: "\u{1F916} Bots are not emotionally available.", ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ content: "\u{1F48D} Self-love is important, but you cannot marry yourself here.", ephemeral: true });

        const yours = marriage.get(interaction.guild.id, interaction.user.id);
        if (yours) return interaction.reply({ content: `\u{1F48D} You are already married to <@${yours.partner_id}>. Use **/divorce** first.`, ephemeral: true });
        const theirs = marriage.get(interaction.guild.id, target.id);
        if (theirs) return interaction.reply({ content: `\u{1F48D} <@${target.id}> is already married to <@${theirs.partner_id}>.`, ephemeral: true });

        const pending = [...activeProposals.values()].some(g => !g.ended && [g.proposerId, g.targetId].includes(interaction.user.id));
        if (pending) return interaction.reply({ content: "\u23F3 You already have an active marriage proposal.", ephemeral: true });

        const gameId = interaction.id;
        const game = { proposerId: interaction.user.id, targetId: target.id, ended: false, timer: null };
        activeProposals.set(gameId, game);

        await interaction.reply({ embeds: [proposalEmbed(game)], components: [proposalButtons(gameId)], allowedMentions: { users: [target.id, interaction.user.id] } });

        game.timer = setTimeout(async () => {
            if (!activeProposals.has(gameId)) return;
            game.ended = true; activeProposals.delete(gameId);
            await interaction.editReply({ embeds: [proposalEmbed(game, `\u23F0 <@${game.targetId}> ignored the proposal. Silence is legally considered devastating.`)], components: [proposalButtons(gameId, true)] }).catch(() => {});
        }, 60_000);
    },

    async handleButton(interaction, choice, gameId) {
        const game = activeProposals.get(gameId);
        if (!game || game.ended) return interaction.reply({ content: "This proposal is already over.", ephemeral: true });
        if (interaction.user.id !== game.targetId) return interaction.reply({ content: "\u{1F62D} This proposal is not for you.", ephemeral: true });

        game.ended = true; activeProposals.delete(gameId); clearTimeout(game.timer);
        let result;
        if (choice === "accept") {
            const p = marriage.get(interaction.guildId, game.proposerId);
            const t = marriage.get(interaction.guildId, game.targetId);
            if (p || t) { result = "\u{1F494} This wedding cannot happen because one of you is already married."; }
            else {
                const at = marriage.create(interaction.guildId, game.proposerId, game.targetId);
                result = `\u{1F496} <@${game.targetId}> said **YES!**\n\nBeloved now pronounces you chronically online and chronically online.\n\u{1F48D} Married <t:${Math.floor(at / 1000)}:R>.`;
            }
        } else {
            result = `\u{1F494} <@${game.targetId}> said **NO!**\n\n<@${game.proposerId}> has been left at the digital altar.`;
        }
        return interaction.update({ embeds: [proposalEmbed(game, result)], components: [proposalButtons(gameId, true)] });
    }
};
