const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, formatCooldown, randomItem } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder().setName("work").setDescription("Work a questionable job for coins"),

    async execute(interaction) {
        const account = economy.getUser(interaction.guild.id, interaction.user.id);
        const cooldown = 30 * 60 * 1000;
        const left = account.last_work + cooldown - Date.now();

        if (left > 0) {
            return interaction.reply({ content: `\u{1F552} Your next shift starts in **${formatCooldown(left)}**.`, ephemeral: true });
        }

        const jobs = [
            "tested suspicious toasters", "moderated the Yap Olympics", "sold premium air",
            "counted Beloved's pixels", "guarded the casino bathroom", "became a professional third wheel"
        ];
        const job = randomItem(jobs);
        const reward = Math.floor(Math.random() * 351) + 250;

        economy.update(interaction.guild.id, interaction.user.id, {
            balance: account.balance + reward,
            last_work: Date.now()
        });

        return interaction.reply({
            embeds: [belovedEmbed("\u{1F4BC} Shift Complete")
                .setDescription(`You **${job}** and somehow got paid.`)
                .addFields(
                    { name: "Pay cheque", value: `**${coins(reward)}**`, inline: true },
                    { name: "Balance", value: `**${coins(account.balance + reward)}**`, inline: true }
                )
                .setFooter({ text: "Another shift unlocks in 30 minutes" })]
        });
    }
};
