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
                content: "❌ GOODBYE_CHANNEL_ID isn't set on Render.",
                ephemeral: true
            });
        }

        const channel = await interaction.guild.channels
            .fetch(channelId)
            .catch(() => null);

        if (!channel) {
            return interaction.reply({
                content: `❌ I couldn't find the goodbye channel.\nID: \`${channelId}\``,
                ephemeral: true
            });
        }

        if (!channel.isTextBased()) {
            return interaction.reply({
                content: "❌ The goodbye channel isn't a text channel.",
                ephemeral: true
            });
        }

        const botMember = interaction.guild.members.me;

        const permissions = channel.permissionsFor(botMember);

        if (!permissions?.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({
                content: "❌ I don't have **View Channel** permission in the goodbye channel.",
                ephemeral: true
            });
        }

        if (!permissions?.has(PermissionFlagsBits.SendMessages)) {
            return interaction.reply({
                content: "❌ I don't have **Send Messages** permission in the goodbye channel.",
                ephemeral: true
            });
        }

        if (!permissions?.has(PermissionFlagsBits.EmbedLinks)) {
            return interaction.reply({
                content: "❌ I don't have **Embed Links** permission in the goodbye channel.",
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
                    `**${interaction.user.username}** left Beloved\n\n` +
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
                `❌ Couldn't send goodbye message.\n\n` +
                `**Error:** \`${error.message || error}\``
            );
        }
    }
};
