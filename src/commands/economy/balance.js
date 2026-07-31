const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("balance")
        .setDescription("Check your Beloved coin balance")
        .addUserOption(opt => opt.setName("user").setDescription("Whose balance?").setRequired(false)),

    async execute(interaction) {
        const target = interaction.options.getUser("user") || interaction.user;
        const account = economy.getUser(interaction.guild.id, target.id);

        const embed = belovedEmbed("\u{1F497} Beloved Wallet")
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(`### ${target.username}'s purse`)
            .addFields(
                { name: "Pocket", value: `**${coins(account.balance)}**`, inline: true },
                { name: "Bank", value: `**${coins(account.bank)}**`, inline: true },
                { name: "Net worth", value: `**${coins(account.balance + account.bank)}**`, inline: true },
                { name: "Casino wins", value: coins(account.total_won), inline: true },
                { name: "Casino losses", value: coins(account.total_lost), inline: true }
            )
            .setFooter({ text: "Beloved coins are for fun only" });

        return interaction.reply({ embeds: [embed] });
    }
};
