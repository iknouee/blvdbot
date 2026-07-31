const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");

function shipBar(score) {
    const filled = Math.floor(score / 10);
    const heart = score > 80 ? "💖" : score > 50 ? "💕" : score > 25 ? "💔" : "🖤";
    return `${heart} ${"|".repeat(filled)}${"⠀".repeat(10 - filled)} **${score}%**`;
}

const VERDICTS = {
    high: [
        "Soulmate energy detected. Beloved ships it HARD.",
        "The wedding is already booked. Neither of you were consulted.",
        "This pairing has more chemistry than a Breaking Bad episode.",
        "Even the algorithm blushed at this one."
    ],
    mid: [
        "Potential detected. One drunk karaoke night away from something real.",
        "Could survive a shopping trip together. Maybe even an IKEA trip.",
        "There's a spark but someone needs to make a move. Beloved is watching.",
        "Situationship energy. Both of you are scared to double text."
    ],
    low: [
        "Beloved recommends friendship. Strong friendship. With a locked door between you.",
        "The compatibility scanner broke trying to find something in common.",
        "This ship is the Titanic and the iceberg is basic conversation.",
        "Beloved has seen arranged marriages with more chemistry."
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ship")
        .setDescription("Ship two people and see if love is real")
        .addUserOption(opt => opt.setName("one").setDescription("First person").setRequired(true))
        .addUserOption(opt => opt.setName("two").setDescription("Second person").setRequired(true)),

    async execute(interaction) {
        const one = interaction.options.getUser("one");
        const two = interaction.options.getUser("two");
        const score = Math.floor(Math.random() * 101);

        const verdictPool = score > 70 ? VERDICTS.high : score > 40 ? VERDICTS.mid : VERDICTS.low;
        const verdict = verdictPool[Math.floor(Math.random() * verdictPool.length)];
        const emoji = score > 80 ? "💍" : score > 60 ? "💘" : score > 40 ? "👀" : score > 20 ? "😬" : "💀";

        // Generate a ship name
        const nameOne = one.username.slice(0, Math.ceil(one.username.length / 2));
        const nameTwo = two.username.slice(Math.floor(two.username.length / 2));
        const shipName = nameOne + nameTwo;

        const embed = new EmbedBuilder()
            .setColor(score > 70 ? BELOVED_PINK : score > 40 ? 0xFFA500 : 0x808080)
            .setAuthor({ name: "BELOVED MATCHMAKING SERVICE", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`## ${emoji} Compatibility Analysis\n\n**${one.username}** × **${two.username}**\n\n${shipBar(score)}`)
            .addFields(
                { name: "💕 Ship Name", value: `**${shipName}**`, inline: true },
                { name: "🎯 Match Type", value: score > 80 ? "Soulmates" : score > 60 ? "Dating Arc" : score > 40 ? "Situationship" : score > 20 ? "Friendzone" : "Restraining Order", inline: true },
                { name: "📋 Verdict", value: `> *${verdict}*`, inline: false }
            )
            .setFooter({ text: `Shipped by ${interaction.user.username} • Results are legally binding` })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};
