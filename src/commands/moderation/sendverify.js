const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sendverify")
        .setDescription("Send the Beloved verification panel")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        await interaction.deferReply({
            ephemeral: true
        });

        try {
            if (!interaction.inGuild()) {
                return interaction.editReply(
                    "❌ This command can only be used in a server."
                );
            }

            const verifyChannelId = process.env.VERIFY_CHANNEL_ID;

            if (!verifyChannelId) {
                return interaction.editReply(
                    "❌ VERIFY_CHANNEL_ID isn't set on Render."
                );
            }

            const channel =
                interaction.guild.channels.cache.get(verifyChannelId) ||
                await interaction.guild.channels
                    .fetch(verifyChannelId)
                    .catch(() => null);

            if (!channel || !channel.isTextBased()) {
                return interaction.editReply(
                    "❌ I couldn't find the verification channel."
                );
            }

            const embed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("verification system | ♡")
                .setDescription(
                    `type **verify** below and you'll soon become verified!\n\n` +
                    `once verified, you'll get access to the rest of **Beloved**.\n\n` +
                    `if it doesn't work, open a ticket and a moderator will help you ♡`
                )
                .setFooter({
                    text: "Beloved • BLVD"
                })
                .setTimestamp();

            // Optional verification image from Render
            if (process.env.VERIFY_IMAGE_URL) {
                embed.setImage(process.env.VERIFY_IMAGE_URL);
            }

            await channel.send({
                embeds: [embed]
            });

            return interaction.editReply(
                `✅ Verification panel sent in ${channel}.`
            );

        } catch (error) {
            console.error("SEND VERIFY ERROR:", error);

            return interaction.editReply(
                `❌ Couldn't send the verification panel.\n\n` +
                `Error: \`${error.message || error}\``
            ).catch(() => null);
        }
    }
};
