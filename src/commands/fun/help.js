const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { BELOVED_PINK } = require("../../utils/embeds");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("See all Beloved commands — the full chaos menu"),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(BELOVED_PINK)
            .setAuthor({ name: "BELOVED COMMAND MENU", iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription("## 💖 Everything I Can Do\nUse `/command` to run any of these. Good luck.")
            .addFields(
                {
                    name: "🎭 Fun & Social",
                    value: "`/love` `/roast` `/compliment` `/ship` `/rate` `/tweet` `/cancel` `/wheel` `/beef`",
                    inline: false
                },
                {
                    name: "🔥 Chaos & Exposure",
                    value: "`/expose` `/mugshot` `/fbi` `/aura` `/obituary` `/plottwist` `/paranoia` `/confess`",
                    inline: false
                },
                {
                    name: "💰 Economy",
                    value: "`/balance` `/daily` `/work` `/beg` `/pay` `/coinleaderboard` `/rob` `/heist`",
                    inline: false
                },
                {
                    name: "🎰 Casino",
                    value: "`/slots` `/coinflip` `/roulette` `/blackjack`",
                    inline: false
                },
                {
                    name: "💍 Marriage",
                    value: "`/marry` `/divorce` `/married` `/kiss` `/hug` `/date` `/gift` `/ring buy`",
                    inline: false
                },
                {
                    name: "🎮 Multiplayer Games",
                    value: "`/smashorpass` `/court` `/fight` `/redlight` `/countrygame`",
                    inline: false
                },
                {
                    name: "🛡️ Moderation",
                    value: "`/blacklist` `/conflict` `/say`\n*Requires Manage Guild/Messages permission*",
                    inline: false
                }
            )
            .setFooter({ text: "Beloved • 45+ commands of pure chaos • Built with love and zero accountability" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
