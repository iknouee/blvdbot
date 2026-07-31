const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const marriageSys = require("../../systems/marriage");
const economy = require("../../systems/economy");

const GIFTS = {
    flowers: { name: "a bouquet of flowers", emoji: "\u{1F490}", price: 250 },
    chocolate: { name: "a luxury box of chocolates", emoji: "\u{1F36B}", price: 500 },
    teddy: { name: "a giant teddy bear", emoji: "\u{1F9F8}", price: 1000 },
    bag: { name: "a designer bag", emoji: "\u{1F45C}", price: 7500 },
    jet: { name: "a completely unnecessary private jet", emoji: "\u2708\uFE0F", price: 100000 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("gift")
        .setDescription("Buy your spouse a gift")
        .addStringOption(opt => opt.setName("gift").setDescription("Choose a gift").setRequired(true)
            .addChoices(
                { name: "Flowers \u2014 250 coins", value: "flowers" },
                { name: "Chocolate \u2014 500 coins", value: "chocolate" },
                { name: "Teddy bear \u2014 1,000 coins", value: "teddy" },
                { name: "Designer bag \u2014 7,500 coins", value: "bag" },
                { name: "Private jet \u2014 100,000 coins", value: "jet" }
            )),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You need to be married before buying spouse gifts.", ephemeral: true });

        const gift = GIFTS[interaction.options.getString("gift")];
        const wallet = economy.getUser(interaction.guild.id, interaction.user.id);
        if (wallet.balance < gift.price) {
            return interaction.reply({ content: `You need ${coins(gift.price)} for that gift. Your wallet has ${coins(wallet.balance)}.`, ephemeral: true });
        }

        economy.update(interaction.guild.id, interaction.user.id, { balance: wallet.balance - gift.price });
        marriageSys.update(interaction.guild.id, interaction.user.id, { gifts: (m.gifts || 0) + 1 });

        return interaction.reply({
            embeds: [belovedEmbed(`${gift.emoji} Marriage Gift`)
                .setDescription(`<@${interaction.user.id}> bought <@${m.partner_id}> **${gift.name}**!\n\nCost: ${coins(gift.price)}\nNew balance: ${coins(wallet.balance - gift.price)}`)],
            allowedMentions: { users: [m.partner_id] }
        });
    }
};
