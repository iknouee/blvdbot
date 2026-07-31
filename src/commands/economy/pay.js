const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const TRANSFER_MSGS = [
    "The transaction was smooth. Suspiciously smooth.",
    "Beloved processed this transfer while judging both of you.",
    "Money moved. No questions asked. Several questions implied.",
    "Wire transfer complete. The IRS has been notified (joke) (maybe).",
    "Funds delivered. The sender is already regretting this."
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pay")
        .setDescription("Send coins to another person (you won't get them back)")
        .addUserOption(opt => opt.setName("user").setDescription("Who gets paid?").setRequired(true))
        .addIntegerOption(opt => opt.setName("amount").setDescription("Amount to send").setMinValue(1).setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        if (target.bot || target.id === interaction.user.id) {
            return interaction.reply({ content: "❌ You cannot pay that account. Nice try though.", ephemeral: true });
        }

        const sender = economy.getUser(interaction.guild.id, interaction.user.id);
        if (sender.balance < amount) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`## 🚫 Insufficient Funds\n\nYou tried to send **${coins(amount)}** but only have **${coins(sender.balance)}**.\n\nThis isn't a credit card.`)
                    .setTimestamp()],
                ephemeral: true
            });
        }

        const receiver = economy.getUser(interaction.guild.id, target.id);
        economy.update(interaction.guild.id, interaction.user.id, { balance: sender.balance - amount });
        economy.update(interaction.guild.id, target.id, { balance: receiver.balance + amount });

        const msg = TRANSFER_MSGS[Math.floor(Math.random() * TRANSFER_MSGS.length)];

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "BELOVED WIRE TRANSFER", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 💸 Transaction Complete\n\n> *${msg}*`)
            .addFields(
                { name: "📤 From", value: `<@${interaction.user.id}>`, inline: true },
                { name: "📥 To", value: `<@${target.id}>`, inline: true },
                { name: "💰 Amount", value: `**${coins(amount)}**`, inline: true },
                { name: "\u200b", value: "───────────────────────", inline: false },
                { name: "🧾 Sender Balance", value: `${coins(sender.balance - amount)}`, inline: true },
                { name: "🧾 Receiver Balance", value: `${coins(receiver.balance + amount)}`, inline: true }
            )
            .setFooter({ text: `Transaction ID: #${Math.floor(Math.random() * 999999).toString().padStart(6, "0")} • No refunds` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
