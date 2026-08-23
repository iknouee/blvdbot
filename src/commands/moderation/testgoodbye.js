const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testgoodbye")
        .setDescription("Test the Beloved goodbye message")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const channelId = process.env.GOODBYE_CHANNEL_ID;

            if (!channelId) {
                return interaction.reply({
                    content: "GOODBYE_CHANNEL_ID isn't set on Render.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.guild.channels.cache.get(channelId) ||
                await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: "I couldn't find the goodbye channel.",
                    ephemeral: true
                });
            }

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

            await interaction.reply({
                content: `goodbye message sent in ${channel} 💔`,
                ephemeral: true
            });

        } catch (error) {
            console.error("Test goodbye error:", error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: "something went wrong testing the goodbye message.",
                    ephemeral: true
                });
            }
        }
    }
};
