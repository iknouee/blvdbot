const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testwelcome")
        .setDescription("Test the Beloved welcome message")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const channelId = process.env.WELCOME_CHANNEL_ID;

            if (!channelId) {
                return interaction.reply({
                    content: "WELCOME_CHANNEL_ID isn't set on Render.",
                    ephemeral: true
                });
            }

            const channel =
                interaction.guild.channels.cache.get(channelId) ||
                await interaction.guild.channels.fetch(channelId).catch(() => null);

            if (!channel || !channel.isTextBased()) {
                return interaction.reply({
                    content: "I couldn't find the welcome channel.",
                    ephemeral: true
                });
            }

            const welcomeImage =
                "https://cdn.discordapp.com/attachments/1540882634568368139/1540883508845613128/C2A8B411-7B4A-48DF-A4E2-EA5F623A6D86.png?ex=6a8b9318&is=6a8a4198&hm=4e4e92bd7cf0f81515776527bf61417bad17bd30ce8a89abe839c5382d7413fd";

            const embed = new EmbedBuilder()
                .setColor("#ff8fc7")
                .setTitle("welcome to beloved 💗")
                .setDescription(
                    `hey ${interaction.user}, welcome to **Beloved**\n\n` +
                    `glad to have you here, make yourself at home <3`
                )
                .setImage(welcomeImage)
                .setFooter({
                    text: `BLVD • member #${interaction.guild.memberCount}`
                })
                .setTimestamp();

            await channel.send({
                content: `${interaction.user}`,
                embeds: [embed]
            });

            await interaction.reply({
                content: `welcome message sent in ${channel} 💗`,
                ephemeral: true
            });

        } catch (error) {
            console.error("Test welcome error:", error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: "something went wrong testing the welcome message.",
                    ephemeral: true
                });
            }
        }
    }
};
