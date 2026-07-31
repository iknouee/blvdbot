const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Send coins to another person")
        .addUserOption(opt => opt.setName("user").setDescription("Who gets paid?").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount to send").setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        if (target.bot || target.id === interaction.user.id) {
            return interaction.reply({ content: "You cannot pay that account.", ephemeral: true });
        }

        const sender = economy.getUser(interaction.guild.id, interaction.user.id);
        if (sender.balance < amount) {
            return interaction.reply({ content: `You only have ${coins(sender.balance)}.`, ephemeral: true });
        }

        const receiver = economy.getUser(interaction.guild.id, target.id);
        economy.update(interaction.guild.id, interaction.user.id, { balance: sender.balance - amount });
        economy.update(interaction.guild.id, target.id, { balance: receiver.balance + amount });

        return interaction.reply({
            embeds: [belovedEmbed("\u{1F4B8} Coin Transfer")
                .setDescription(`<@${interaction.user.id}> sent <@${target.id}> some Beloved coins.`)
                .addFields(
                    { name: "Amount", value: `**${coins(amount)}**`, inline: true },
                    { name: "Your balance", value: `**${coins(sender.balance - amount)}**`, inline: true }
                )]
        });
    }
};
