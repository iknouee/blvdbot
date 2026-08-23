const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("testwelcome")
        .setDescription("Test the Beloved welcome message")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: "❌ This command can only be used in a server.",
                ephemeral: true
            });
        }

        const channelId = process.env.WELCOME_CHANNEL_ID;

        if (!channelId) {
            return interaction.reply({
                content: "❌ WELCOME_CHANNEL_ID is not set on Render.",
                ephemeral: true
            });
        }

        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel || !channel.isTextBased()) {
            return interaction.reply({
                content: "❌ I couldn't find the welcome channel.",
                ephemeral: true
            });
        }

        await interaction.deferReply({
            ephemeral: true
        });

        try {
            const embed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("welcome to beloved 🖤")
                .setDescription(
                    `hey ${interaction.user}, welcome to **Beloved**\n\n` +
                    `before you get started, make sure you verify so you can access the server.\n\n` +
                    `head over to <#1499900580431396987> and type **verify**\n\n` +
                    `welcome to BLVD <3`
                )
                .setImage(
                    "https://cdn.discordapp.com/attachments/1540882634568368139/1540883508845613128/C2A8B411-7B4A-48DF-A4E2-EA5F623A6D86.png?ex=6a8b9318&is=6a8a4198&hm=4e4e92bd7cf0f81515776527bf61417bad17bd30ce8a89abe839c5382d7413fd"
                )
                .setFooter({
                    text: `BLVD • member #${interaction.guild.memberCount}`
                })
                .setTimestamp();

            await channel.send({
                content: `${interaction.user}`,
                embeds: [embed]
            });

            return interaction.editReply(
                `✅ Welcome test sent in ${channel}.`
            );

        } catch (error) {
            console.error(error);

            return interaction.editReply(
                "❌ I couldn't send the welcome test."
            );
        }
    }
};
