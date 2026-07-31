const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins, clampBet } = require("../../utils/helpers");
const economy = require("../../systems/economy");

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("roulette")
        .setDescription("Play casino roulette")
        .addStringOption(opt => opt.setName("choice").setDescription("Pick a colour").setRequired(true)
            .addChoices(
                { name: "Red (2x)", value: "red" },
                { name: "Black (2x)", value: "black" },
                { name: "Green (14x)", value: "green" }
            ))
        .addIntegerOption(opt => opt.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    async execute(interaction) {
        const choice = interaction.options.getString("choice");
        const bet = interaction.options.getInteger("bet");
        const account = economy.getUser(interaction.guild.id, interaction.user.id);

        if (!clampBet(account.balance, bet)) {
            return interaction.reply({ content: `Invalid bet. Balance: ${coins(account.balance)}`, ephemeral: true });
        }

        economy.update(interaction.guild.id, interaction.user.id, { balance: account.balance - bet });

        await interaction.reply({
            embeds: [belovedEmbed("\u{1F3A1} Beloved Roulette")
                .setDescription("### \u{1F534}\u3000\u26AB\u3000\u{1F7E2}\u3000\u26AB\u3000\u{1F534}\u3000\u26AB\nThe wheel is spinning...")
                .addFields(
                    { name: "Your colour", value: choice.toUpperCase(), inline: true },
                    { name: "Bet", value: `**${coins(bet)}**`, inline: true }
                )
                .setFooter({ text: "No refunds after the dramatic suspense begins" })]
        });

        for (let i = 0; i < 4; i++) {
            await new Promise(r => setTimeout(r, 700));
            await interaction.editReply({
                embeds: [belovedEmbed("\u{1F3A1} Beloved Roulette")
                    .setDescription(`### ${"\u26AB\u3000\u{1F534}\u3000".repeat(i + 2)}\n${"\u25CF".repeat(i + 1)}${"\u25CB".repeat(4 - i)}\u3000spinning${".".repeat(i + 1)}`)
                    .addFields(
                        { name: "Your colour", value: choice.toUpperCase(), inline: true },
                        { name: "Bet", value: `**${coins(bet)}**`, inline: true }
                    )
                    .setFooter({ text: "The ball is deciding your financial future" })]
            });
        }

        const roll = Math.floor(Math.random() * 37);
        const result = roll === 0 ? "green" : (RED_NUMBERS.includes(roll) ? "red" : "black");
        const multiplier = result === "green" ? 14 : 2;
        const win = choice === result;
        const payout = win ? bet * multiplier : 0;
        const newBalance = account.balance - bet + payout;

        const updates = { balance: newBalance };
        if (win) updates.total_won = account.total_won + (payout - bet);
        else updates.total_lost = account.total_lost + bet;
        economy.update(interaction.guild.id, interaction.user.id, updates);

        const colourEmoji = result === "red" ? "\u{1F534}" : result === "black" ? "\u26AB" : "\u{1F7E2}";
        return interaction.editReply({
            embeds: [belovedEmbed(win ? "\u{1F496} Roulette Win" : "\u{1F494} Roulette Loss")
                .setDescription(`# ${colourEmoji} ${roll}`)
                .addFields(
                    { name: "Landed on", value: result.toUpperCase(), inline: true },
                    { name: win ? "Profit" : "Lost", value: `**${coins(win ? payout - bet : bet)}**`, inline: true },
                    { name: "Balance", value: `**${coins(newBalance)}**`, inline: false }
                )]
        });
    }
};
