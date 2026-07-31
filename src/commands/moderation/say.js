const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("Make the bot send a message")
        .addStringOption(opt => opt.setName("message").setDescription("What the bot should say").setRequired(true).setMaxLength(2000))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.inGuild() || !interaction.channel?.isTextBased()) {
            return interaction.reply({ content: "\u274C This command can only be used in a server text channel.", ephemeral: true });
        }
        const message = interaction.options.getString("message", true);
        await interaction.deferReply({ ephemeral: true });
        try {
            await interaction.channel.send({ content: message, allowedMentions: { parse: [] } });
            return interaction.editReply("\u2705 Message sent. Only you can see this confirmation.");
        } catch (error) {
            return interaction.editReply("\u274C I could not send that message. Check my channel permissions.");
        }
    }
};
