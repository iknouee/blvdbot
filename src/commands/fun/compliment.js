const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");
const { BELOVED_PINK } = require("../../utils/embeds");

const COMPLIMENTS = [
    { text: "has **main character energy** and honestly? The show is better for it.", tier: "S+" },
    { text: "is officially **Beloved-approved.** This is a legally binding endorsement.", tier: "S" },
    { text: "radiates the kind of energy that makes strangers hold doors open.", tier: "A+" },
    { text: "is actually **built different** — lab tested, server confirmed.", tier: "S+" },
    { text: "could charge admission for their presence and nobody would complain.", tier: "A" },
    { text: "is the reason the group chat stays active past midnight.", tier: "S" },
    { text: "has an aura that could cure a bad day through the screen.", tier: "S+" },
    { text: "walked in and the server's property value went up 400%.", tier: "A+" }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("compliment")
        .setDescription("Give someone a Beloved-certified compliment")
        .addUserOption(opt => opt.setName("user").setDescription("Person to uplift").setRequired(true)),

    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const comp = randomItem(COMPLIMENTS);

        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "BELOVED COMPLIMENT BUREAU", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## ✨ Official Appraisal\n\n<@${user.id}> ${comp.text}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
                { name: "🏆 Rating", value: `**Tier ${comp.tier}**`, inline: true },
                { name: "📊 Validity", value: "Permanent", inline: true },
                { name: "🎫 Certificate #", value: `#${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`, inline: true }
            )
            .setFooter({ text: `Issued by ${interaction.user.username} • Frame this and put it on your wall` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
