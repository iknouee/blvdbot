const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

function netWorthTier(total) {
    if (total >= 1000000) return { title: "💎 Billionaire Arc", color: 0xB9F2FF };
    if (total >= 500000) return { title: "👑 Old Money", color: 0xFFD700 };
    if (total >= 100000) return { title: "💰 Upper Class", color: 0xC0C0C0 };
    if (total >= 50000) return { title: "🏠 Middle Class", color: 0x90EE90 };
    if (total >= 10000) return { title: "🍞 Getting By", color: BELOVED_PINK };
    if (total >= 1000) return { title: "🥺 Humble Beginnings", color: 0xFFA500 };
    return { title: "💀 Below Poverty Line", color: 0x808080 };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your Beloved coin balance")
        .addUserOption(opt => opt.setName("user").setDescription("Whose wallet?").setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const account = economy.getUser(interaction.guild.id, target.id);
        const total = account.balance + account.bank;
        const tier = netWorthTier(total);
        const profitLoss = account.total_won - account.total_lost;
        const plEmoji = profitLoss >= 0 ? "📈" : "📉";

        const embed = new EmbedBuilder()
            .setColor(tier.color)
            .setAuthor({ name: `${tier.title}`, iconURL: target.displayAvatarURL({ size: 64 }) })
            .setDescription(`## 💳 ${target.username}'s Wallet`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "👛 Pocket", value: `**${coins(account.balance)}**`, inline: true },
                { name: "🏦 Bank", value: `**${coins(account.bank)}**`, inline: true },
                { name: "💎 Net Worth", value: `**${coins(total)}**`, inline: true },
                { name: "\u200b", value: "───────────────────────", inline: false },
                { name: "🎰 Casino Wins", value: `+${coins(account.total_won)}`, inline: true },
                { name: "💸 Casino Losses", value: `-${coins(account.total_lost)}`, inline: true },
                { name: `${plEmoji} Profit/Loss`, value: `**${profitLoss >= 0 ? "+" : ""}${coins(profitLoss)}**`, inline: true }
            )
            .setFooter({ text: "Beloved coins • Accepted nowhere except here" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
