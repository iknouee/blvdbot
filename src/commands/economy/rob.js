const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");
const { coins, randomItem, formatCooldown } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const SUCCESS_MSGS = [
    "You distracted them with a fake notification and grabbed the coins.",
    "You hacked their wallet using social engineering (you asked nicely and they weren't looking).",
    "Ocean's Eleven vibes. Clean getaway. No witnesses.",
    "You performed the heist of the century. They didn't notice for 3 whole minutes.",
    "Smooth criminal energy. The coins are yours now."
];

const FAIL_MSGS = [
    { text: "You tripped over your own confidence and dropped coins everywhere.", penalty: true },
    { text: "They caught you mid-steal and you panicked so hard you dropped YOUR money.", penalty: true },
    { text: "You accidentally robbed yourself. We don't know how either.", penalty: true },
    { text: "Beloved's security system activated. You've been fined for attempted theft.", penalty: true },
    { text: "You wore a disguise but forgot to cover your username. Embarrassing.", penalty: true },
    { text: "They had a reverse-robbery card. Your coins are now THEIR coins.", penalty: true },
    { text: "You pulled off the robbery perfectly... then realized you stole Monopoly money.", penalty: false },
    { text: "Their guard dog (a Shiba Inu emoji) scared you away.", penalty: false }
];

const ROB_COOLDOWN = 15 * 60 * 1000; // 15 minutes
const robCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rob")
        .setDescription("Attempt to steal coins from someone (risky business)")
        .addUserOption(opt => opt.setName("user").setDescription("Your target").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        if (target.bot || target.id === interaction.user.id) {
            return interaction.reply({ content: "❌ You can't rob that target.", ephemeral: true });
        }

        const cdKey = `${interaction.guild.id}:${interaction.user.id}`;
        const lastRob = robCooldowns.get(cdKey) || 0;
        const remaining = lastRob + ROB_COOLDOWN - Date.now();
        if (remaining > 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xFF0000)
                    .setDescription(`## 🚨 Laying Low\n\nYou need to wait **${formatCooldown(remaining)}** before robbing again.\n\nThe cops are still looking for you.`)
                    .setTimestamp()],
                ephemeral: true
            });
        }

        const robber = economy.getUser(interaction.guild.id, interaction.user.id);
        const victim = economy.getUser(interaction.guild.id, target.id);

        if (victim.balance < 100) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0x808080)
                    .setDescription(`## 😐 Not Worth It\n\n<@${target.id}> only has **${coins(victim.balance)}**.\n\nThat's barely enough to rob. Have some standards.`)
                    .setTimestamp()],
                ephemeral: true
            });
        }

        robCooldowns.set(cdKey, Date.now());
        const successChance = 0.45;
        const success = Math.random() < successChance;

        if (success) {
            const maxSteal = Math.min(Math.floor(victim.balance * 0.35), 5000);
            const stolen = Math.floor(Math.random() * maxSteal) + Math.floor(maxSteal * 0.3);
            economy.update(interaction.guild.id, interaction.user.id, { balance: robber.balance + stolen });
            economy.update(interaction.guild.id, target.id, { balance: victim.balance - stolen });

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setAuthor({ name: "🔓 ROBBERY SUCCESSFUL", iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`## 💰 Clean Getaway\n\n> *${randomItem(SUCCESS_MSGS)}*`)
                .addFields(
                    { name: "🎯 Victim", value: `<@${target.id}>`, inline: true },
                    { name: "💸 Stolen", value: `**+${coins(stolen)}**`, inline: true },
                    { name: "💰 Your Balance", value: `**${coins(robber.balance + stolen)}**`, inline: true }
                )
                .setFooter({ text: `${interaction.user.username} just committed a crime • Next rob available in 15min` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
        } else {
            const fail = randomItem(FAIL_MSGS);
            let penalty = 0;
            if (fail.penalty) {
                penalty = Math.floor(Math.random() * 300) + 100;
                penalty = Math.min(penalty, robber.balance);
                economy.update(interaction.guild.id, interaction.user.id, { balance: robber.balance - penalty });
            }

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setAuthor({ name: "🚨 ROBBERY FAILED", iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`## 💀 Caught in 4K\n\n> *${fail.text}*`)
                .addFields(
                    { name: "🎯 Target", value: `<@${target.id}>`, inline: true },
                    { name: "💸 Lost", value: penalty > 0 ? `**-${coins(penalty)}**` : "Nothing (lucky)", inline: true },
                    { name: "💰 Your Balance", value: `**${coins(robber.balance - penalty)}**`, inline: true }
                )
                .setFooter({ text: `${interaction.user.username} fumbled the robbery • Think smarter next time` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
        }
    }
};
