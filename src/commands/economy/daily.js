const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, formatCooldown } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily Beloved coins"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 24 * 60 * 60 * 1000;
        const left = account.last_daily + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({ content: `\u23F3 Daily already claimed. Come back in **${formatCooldown(left)}**.`, ephemeral: true });
        }

        const reward = Math.floor(Math.random() * 501) + 750;
        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_daily: Date.now()
        });

        return interaction.reply({
            embeds: [belovedEmbed("\u{1F381} Daily Pink Drop")
                .setDescription(`Beloved slipped <@${interaction.user.id}> a fresh bag of coins.`)
                .addFields(
                    { name: "You received", value: `**${coins(reward)}**`, inline: true },
                    { name: "New balance", value: `**${coins(account.balance + reward)}**`, inline: true }
                )
                .setFooter({ text: "Your next gift arrives in 24 hours" })]
        });
    }
};
