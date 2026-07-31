const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, clampBet } = require("../../utils/helpers");
const economy = require("../../systems/economy");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("coinflip")
        .setDescription("Bet on heads or tails")
        .addStringOption(opt => opt.setName("choice").setDescription("Heads or tails").setRequired(true)
            .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" }))
        .addIntegerOption(opt => opt.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const choice = interaction.options.getString("choice");
        const bet = interaction.options.getInteger("bet");
        const account = economy.getUser(interaction.guild.id, interaction.user.id);

        if (!clampBet(account.balance, bet)) {
            return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });
        }

        const result = Math.random() < 0.5 ? "heads" : "tails";
        const win = result === choice;
        const newBalance = win ? account.balance + bet : account.balance - bet;

        const updates = { balance: newBalance };
        if (win) updates.total_won = account.total_won + bet;
        else updates.total_lost = account.total_lost + bet;
        economy.update(interaction.guild.id, interaction.user.id, updates);

        return interaction.reply({
            embeds: [belovedEmbed(win ? "\u{1F496} Coin Flip Win" : "\u{1F494} Coin Flip Loss")
                .setDescription(`# ${result === "heads" ? "\u{1F451} HEADS" : "\u{1F985} TAILS"}`)
                .addFields(
                    { name: "Your call", value: choice.toUpperCase(), inline: true },
                    { name: "Result", value: result.toUpperCase(), inline: true },
                    { name: win ? "Profit" : "Lost", value: `**${coins(bet)}**`, inline: true },
                    { name: "Balance", value: `**${coins(newBalance)}**`, inline: false }
                )]
        });
    }
};
