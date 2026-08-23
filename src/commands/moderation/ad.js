const {
    SlashCommandBuilder,
    PermissionFlagsBits
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ad")
        .setDescription("Send the official Beloved advertisement")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        if (!interaction.inGuild()) {
            return interaction.reply({
                content: "❌ This command can only be used in a server.",
                ephemeral: true
            });
        }

        const ad = `݁   .   ݁  .     ݁. ݁   .   ݁  .     ݁. ݁   .   ݁  .     ݁. ݁   .   ݁  .     ݁.

[/beloved](https://discord.gg/joinblvd)
 𝙬𝙚𝙡𝙘𝙤𝙢𝙚 𝙩𝙤 𝙗𝙚𝙡𝙤𝙫𝙚𝙙

        𝙖𝙘𝙩𝙞𝙫𝙚 .  𝙜𝙬𝙨 . 𝙛𝙜 . 𝙝𝙤𝙨𝙩𝙞𝙣𝙜𝙨 . 𝙨𝙤𝙘𝙞𝙖𝙡

𝙧𝙚𝙥- <@756261049082314903> <@1448513860356018247>  𝙥𝙞𝙣𝙜- || @everyone @here ||
**join today** ↴
https://discord.gg/joinblvd`;
        
        try {
            await interaction.channel.send({
                content: ad,
                allowedMentions: {
                    parse: ["everyone", "users"]
                }
            });

            await interaction.reply({
                content: "✅ Advertisement sent.",
                ephemeral: true
            });

        } catch (error) {
            console.error("Failed to send advertisement:", error);

            if (!interaction.replied) {
                await interaction.reply({
                    content: "❌ I couldn't send the advertisement.",
                    ephemeral: true
                });
            }
        }
    }
};
