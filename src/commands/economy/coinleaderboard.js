const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

module.exports = {
    data: new SlashCommandBuilder().setName("coinleaderboard").setDescription("See who's running this server's economy"),

    async execute(interaction) {
        const rows = economy.getLeaderboard(interaction.guild.id, 10);

        if (!rows.length) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x808080)
                    .setDescription("## 💀 Nobody Has Money\n\nThis server's economy is deader than a ghost town.\nSomeone use `/daily` and start the revolution.")
                    .setTimestamp()],
            });
        }

        const topUser = rows[0];
        const description = rows.map((row, i) => {
            const medal = MEDALS[i] || `**${i + 1}.**`;
            const bar = "█".repeat(Math.max(1, Math.floor((row.total / topUser.total) * 8)));
            return `${medal} <@${row.user_id}>\n┗ ${bar} **${coins(row.total)}**`;
        }).join("\n\n");

        const totalWealth = rows.reduce((sum, r) => sum + r.total, 0);

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setAuthor({ name: `${interaction.guild.name} RICH LIST`, iconURL: interaction.guild.iconURL({ size: 64 }) })
            .setDescription(`## 👑 Top ${rows.length} Wealthiest\n\n${description}`)
            .addFields(
                { name: "💎 Server Wealth", value: `Total: **${coins(totalWealth)}**`, inline: true },
                { name: "👥 Tracked Users", value: `**${rows.length}** on the board`, inline: true }
            )
            .setFooter({ text: "Rich today, destroyed by /slots tomorrow • Updated live" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
    }
};
