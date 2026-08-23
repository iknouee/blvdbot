const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testgoodbye")
        .setDescription("Test the Beloved goodbye message")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: "❌ This command can only be used in a server.",
                ephemeral: true
            });
        }

        const channelId = process.env.GOODBYE_CHANNEL_ID;

        if (!channelId) {
            return interaction.reply({
                content: "❌ GOODBYE_CHANNEL_ID is not set on Render.",
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({
                content: "❌ I couldn't find the goodbye channel.",
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        try {
            const embed = new EmbedBuilder()
                .setColor("#e978a9")
                .setTitle("someone left beloved 💔")
                .setDescription(
                    `**${interaction.user.username}** left the server\n\n` +
                    `take care, maybe we'll see you again`
                )
                .setThumbnail(
                    interaction.user.displayAvatarURL({
                        size: 256
                    })
                )
                .setFooter({
                    text: `BLVD • ${interaction.guild.memberCount} members`
                })
                .setTimestamp();

            await channel.send({
                embeds: [embed]
            });

            return interaction.editReply(
                `✅ Goodbye test sent in ${channel}.`
            );

        } catch (error) {
            console.error(error);

            return interaction.editReply(
                "❌ I couldn't send the goodbye test."
            );
        }
    }
};
