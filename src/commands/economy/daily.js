const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins, formatCooldown, randomItem } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const FLAVORS = [
    "Beloved reached into the void and pulled out coins for you.",
    "Your daily government-issued serotonin has arrived in coin form.",
    "Beloved taxed the rich (source: trust me) and gave you a cut.",
    "Found these in the couch cushions of the universe.",
    "Printed these fresh off the Beloved Federal Reserve.",
    "Someone donated to the 'keep you alive fund.' Anonymous."
];

module.exports = {
    data: new SlashCommandBuilder().setName("daily").setDescription("Claim your daily Beloved coins"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 24 * 60 * 60 * 1000;
        const left = account.last_daily + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`## ⏰ Already Claimed\n\nYour next daily drops in **${formatCooldown(left)}**.\n\nBeloved isn't an ATM. Come back later.`)
                    .setFooter({ text: "Patience is a virtue you clearly lack" })
                    .setTimestamp()],
                ephemeral: true
            });
        }

        const reward = Math.floor(Math.random() * 501) + 750;
        const streak = "🔥"; // future: track streaks
        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_daily: Date.now()
        });

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "DAILY DROP", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## 🎁 ${randomItem(FLAVORS)}\n\n>>> **+${coins(reward)}** deposited into your pocket.`)
            .addFields(
                { name: "💰 New Balance", value: `**${coins(account.balance + reward)}**`, inline: true },
                { name: "⏰ Next Claim", value: "<t:" + Math.floor((Date.now() + cooldown) / 1000) + ":R>", inline: true }
            )
            .setFooter({ text: `${interaction.user.username}'s daily • Come back tomorrow for more` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
