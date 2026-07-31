const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tweet")
        .setDescription("Fabricate a completely real and legitimate tweet")
        .addUserOption(opt => opt.setName("user").setDescription("Who supposedly posted this").setRequired(true))
        .addStringOption(opt => opt.setName("text").setDescription("The tweet content").setRequired(true).setMaxLength(280)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const text = interaction.options.getString("text");
        const likes = Math.floor(Math.random() * 198000) + 2000;
        const reposts = Math.floor(likes * (0.05 + Math.random() * 0.3));
        const replies = Math.floor(likes * (0.02 + Math.random() * 0.1));
        const views = likes * (Math.floor(Math.random() * 12) + 5);
        const handle = `@${target.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15) || "user"}`;
        const verified = Math.random() > 0.5;
        const hour = Math.floor(Math.random() * 12) + 1;
        const minute = Math.floor(Math.random() * 60).toString().padStart(2, "0");
        const ampm = Math.random() > 0.5 ? "AM" : "PM";

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setAuthor({
                name: `${target.globalName || target.username} ${verified ? "☑️" : ""}`,
                iconURL: target.displayAvatarURL({ size: 256 })
            })
            .setDescription(`**${handle}**\n\n${text}\n\n*${hour}:${minute} ${ampm} · Translated from Unhinged*`)
            .addFields(
                { name: "\u200b", value: `💬 **${replies.toLocaleString()}**　　🔁 **${reposts.toLocaleString()}**　　❤️ **${likes.toLocaleString()}**　　📊 **${views.toLocaleString()}**`, inline: false }
            )
            .setFooter({ text: "𝕏 • This tweet is 100% fabricated by Beloved" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
};
