const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const REASONS = [
    "Suspicious browser history detected at 3:47 AM",
    "Sent a message so unhinged it triggered 4 government agencies",
    "Typing pattern matches a known threat to public sanity",
    "That last message was flagged by 7 different AI systems",
    "Has been 'just looking' at too many things for too long",
    "Aura levels exceeded the legal limit in 38 states",
    "Their Discord activity log would make a jury weep",
    "Screenshot evidence suggests crimes against common sense",
    "Voice channel behaviour triggered a noise complaint from the CIA",
    "Their Spotify Wrapped was classified as a matter of national security"
];

const CHARGES = [
    "Possession of Unregistered Hot Takes",
    "Aggravated Online Behaviour",
    "Interstate Cringe Transportation",
    "Conspiracy to Commit Group Chat Terrorism",
    "Violation of the Geneva Convention (emoji usage)",
    "Obstruction of Vibe",
    "Weapons-Grade Delusion",
    "Tax Fraud (emotional tax on everyone in this server)"
];

const STATUSES = [
    "APPREHENDED", "IN CUSTODY", "UNDER SURVEILLANCE", "INTERROGATION IN PROGRESS"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("fbi")
        .setDescription("FBI OPEN UP — issue a federal warrant for someone")
        .addUserOption(opt => opt.setName("user").setDescription("The suspect").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reason = randomItem(REASONS);
        const charges = [...CHARGES].sort(() => Math.random() - 0.5).slice(0, 2);
        const status = randomItem(STATUSES);
        const caseId = `FBI-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        const threatLevel = Math.floor(Math.random() * 5) + 1;

        const embed = new EmbedBuilder()
            .setColor(0x003366)
            .setAuthor({ name: "🚨 FBI — FEDERAL BUREAU OF INVESTIGATION 🚨" })
            .setDescription(`# 🏛️ FEDERAL WARRANT\n\n**SUSPECT:** ${target.username}\n**STATUS:** ${status}\n**CASE ID:** ${caseId}\n\n───────────────────────\n\n**📋 PROBABLE CAUSE:**\n> ${reason}\n\n**⚖️ CHARGES:**\n${charges.map((c, i) => `**${i + 1}.** ${c}`).join("\n")}`)
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🎯 Threat Level", value: `${"🟥".repeat(threatLevel)}${"⬛".repeat(5 - threatLevel)} (${threatLevel}/5)`, inline: true },
                { name: "🕵️ Reporting Agent", value: `<@${interaction.user.id}>`, inline: true },
                { name: "📍 Last Known Location", value: `<#${interaction.channel.id}>`, inline: true }
            )
            .setFooter({ text: "⚠️ Do NOT approach suspect — they may be armed with bad opinions" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
    }
};
