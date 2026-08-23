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
        // Acknowledge Discord immediately
        await interaction.deferReply({
            ephemeral: true
        });

        try {
            if (!interaction.inGuild()) {
                return interaction.editReply(
                    "❌ This command can only be used in a server."
                );
            }

            const channelId = process.env.GOODBYE_CHANNEL_ID;

            if (!channelId) {
                return interaction.editReply(
                    "❌ GOODBYE_CHANNEL_ID isn't set on Render."
                );
            }

            const channel = await interaction.guild.channels
                .fetch(channelId)
                .catch(() => null);

            if (!channel) {
                return interaction.editReply(
                    `❌ I couldn't find the goodbye channel.\nChannel ID: \`${channelId}\``
                );
            }

            if (!channel.isTextBased()) {
                return interaction.editReply(
                    "❌ The goodbye channel isn't a text channel."
                );
            }

            const botMember = interaction.guild.members.me;
            const permissions = channel.permissionsFor(botMember);

            if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
                return interaction.editReply(
                    "❌ I don't have **View Channel** in the goodbye channel."
                );
            }

            if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
                return interaction.editReply(
                    "❌ I don't have **Send Messages** in the goodbye channel."
                );
            }

            if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
                return interaction.editReply(
                    "❌ I don't have **Embed Links** in the goodbye channel."
                );
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

            return interaction.editReply(
                `✅ Goodbye test sent in ${channel}.`
            );

        } catch (error) {
            console.error("TEST GOODBYE ERROR:", error);

            return interaction.editReply(
                `❌ Couldn't send goodbye message.\n\nError: \`${error.message || error}\``
            ).catch(() => null);
        }
    }
};
