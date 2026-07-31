const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { randomItem } = require("../../utils/helpers");

const cancelReasons = [
    "putting milk in before cereal", "typing 'k' after a five-paragraph message",
    "stealing fries and calling it tax", "having 47 unread notifications",
    "saying 'one more game' at 3 AM", "using light mode at full brightness",
    "laughing before telling the joke", "being emotionally attached to their Wi-Fi router",
    "leaving people on delivered while actively posting memes", "calling every animal a dog",
    "owning a suspicious number of charging cables", "saying 'it is what it is' after causing the problem",
    "being too loud in the group chat", "replying 'who asked' when nobody asked them either",
    "losing an argument to autocorrect", "eating the last snack without announcing it"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel someone for completely ridiculous reasons")
        .addUserOption(opt => opt.setName("user").setDescription("Who is getting cancelled?").setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser("user");
        const reasons = [...cancelReasons].sort(() => Math.random() - 0.5).slice(0, 3);
        const percentage = Math.floor(Math.random() * 31) + 69;

        const embed = new EmbedBuilder()
            .setTitle("\u{1F6AB} Official Beloved Cancellation Notice")
            .setThumbnail(target.displayAvatarURL({ size: 256 }))
            .setDescription(`<@${target.id}> has been **${percentage}% cancelled** for:`)
            .addFields({ name: "\u{1F4CB} Charges", value: reasons.map((r, i) => `${i + 1}. ${r}`).join("\n") })
            .setFooter({ text: "Appeals may be submitted directly to the nearest toaster." })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], allowedMentions: { users: [target.id] } });
    }
};
