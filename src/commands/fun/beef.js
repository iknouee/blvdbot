const { SlashCommandBuilder } = require("discord.js");
const beefSystem = require("../../systems/beef");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("beef")
        .setDescription("Start a realistic funny argument with Beloved")
        .addStringOption(opt => opt.setName("opening").setDescription("Your opening line to Beloved").setMaxLength(300).setRequired(false)),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({ content: "Beef mode only works inside a server.", ephemeral: true });
        }

        const opening = interaction.options.getString("opening") || "you really think you can argue with me?";
        const existing = beefSystem.getBeefSession(interaction.channelId, interaction.user.id);

        if (existing) {
            return interaction.reply({
                content: "\u{1F969} We're already beefing. Type your next comeback in this channel, or say **end beef**.",
                ephemeral: true
            });
        }

        const session = beefSystem.startBeefSession(interaction.channelId, interaction.user);
        const first = beefSystem.pickBeefReply(opening, session);
        session.exchanges = 1;

        return interaction.reply({
            content: `\u{1F969} **BEEF MODE ACTIVATED** \u2014 <@${interaction.user.id}> vs **Beloved**\n` +
                `*You have 3 minutes. Say **end beef** whenever you've had enough.*\n\n` +
                `> ${beefSystem.cleanBeefText(opening)}\n\n` +
                `\u{1F496} **Beloved:** ${first.text}`,
            allowedMentions: { users: [interaction.user.id] }
        });
    }
};
