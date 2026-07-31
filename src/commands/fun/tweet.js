const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tweet")
        .setDescription("Make a funny fake tweet")
        .addUserOption(opt => opt.setName("user").setDescription("Who is supposedly tweeting?").setRequired(true))
        .addStringOption(opt => opt.setName("text").setDescription("What should the fake tweet say?").setRequired(true).setMaxLength(280)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const text = interaction.options.getString("text");
        const likes = Math.floor(Math.random() * 98000) + 1200;
        const reposts = Math.floor(likes * (0.05 + Math.random() * 0.25));
        const replies = Math.floor(likes * (0.01 + Math.random() * 0.08));
        const handle = `@${target.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15) || "blvduser"}`;

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(0x000000)
                .setAuthor({ name: `${target.displayName || target.username}  \u2713`, iconURL: target.displayAvatarURL({ size: 256 }) })
                .setDescription(`**${handle}**\n\n${text}`)
                .addFields({ name: "", value: `\u{1F4AC} ${replies.toLocaleString()}     \u{1F501} ${reposts.toLocaleString()}     \u2764\uFE0F ${likes.toLocaleString()}     \u{1F4CA} ${(likes * 8).toLocaleString()}` })
                .setFooter({ text: "Fake Tweet \u2022 Made by Beloved" })
                .setTimestamp()],
            allowedMentions: { parse: [] }
        });
    }
};
