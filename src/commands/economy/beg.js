const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, formatCooldown } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder().setName("beg").setDescription("Beg Beloved for spare change"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 10 * 60 * 1000;
        const left = account.last_beg + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({ content: `\u{1F97A} Beg again in **${formatCooldown(left)}**.`, ephemeral: true });
        }

        const success = Math.random() < 0.75;
        const reward = success ? Math.floor(Math.random() * 121) + 20 : 0;

        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_beg: Date.now()
        });

        return interaction.reply({
            embeds: [belovedEmbed(success ? "\u{1F97A} Pity Coins Secured" : "\u{1F997} Painful Silence")
                .setDescription(success ? "A suspiciously generous stranger felt bad for you." : "You held out your hand. Everyone looked away.")
                .addFields(
                    { name: "Received", value: `**${coins(reward)}**`, inline: true },
                    { name: "Balance", value: `**${coins(account.balance + reward)}**`, inline: true }
                )
                .setFooter({ text: "You may embarrass yourself again in 10 minutes" })]
        });
    }
};
