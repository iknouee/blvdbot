const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins, formatCooldown, randomItem } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const SUCCESS_MSGS = [
    { giver: "A suspicious stranger", line: "felt bad for you and threw coins at your face." },
    { giver: "Someone's alt account", line: "accidentally sent you money thinking you were someone else." },
    { giver: "A passing millionaire", line: "looked at you, sighed deeply, and dropped some change." },
    { giver: "Beloved themselves", line: "took pity on your financial incompetence." },
    { giver: "A random Discord kitten", line: "donated their life savings (it wasn't much)." }
];

const FAIL_MSGS = [
    "You held out your hand. Everyone walked faster.",
    "A tumbleweed rolled past. Even it avoided eye contact.",
    "Someone took a photo of you begging and posted it to #memes.",
    "Beloved considered it, then remembered your gambling history.",
    "You stood there for 10 minutes. A bird landed on you. That's all you got."
];

module.exports = {
    data: new SlashCommandBuilder().setName("beg").setDescription("Humiliate yourself for spare change"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 10 * 60 * 1000;
        const left = account.last_beg + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setDescription(`## 🦗 Beg Cooldown\n\nYou can embarrass yourself again in **${formatCooldown(left)}**.\n\nEven begging has a schedule.`)
                    .setTimestamp()],
                ephemeral: true
            });
        }

        const success = Math.random() < 0.7;
        const reward = success ? Math.floor(Math.random() * 151) + 30 : 0;
        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_beg: Date.now()
        });

        if (success) {
            const msg = randomItem(SUCCESS_MSGS);
            const embed = new EmbedBuilder()
                .setColor(BELOVED_PINK)
                .setAuthor({ name: "PITY COINS SECURED", iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`## 🥺 Begging Successful\n\n**${msg.giver}** ${msg.line}`)
                .addFields(
                    { name: "🪙 Received", value: `**+${coins(reward)}**`, inline: true },
                    { name: "💰 Balance", value: `**${coins(account.balance + reward)}**`, inline: true }
                )
                .setFooter({ text: "Dignity remaining: 0%" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x808080)
                .setAuthor({ name: "BEGGING FAILED", iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`## 💀 Painful Silence\n\n> *${randomItem(FAIL_MSGS)}*`)
                .addFields(
                    { name: "🪙 Received", value: "**Absolutely nothing**", inline: true },
                    { name: "💰 Balance", value: `**${coins(account.balance)}** (unchanged)`, inline: true }
                )
                .setFooter({ text: "Maybe get a job next time" })
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        }
    }
};
