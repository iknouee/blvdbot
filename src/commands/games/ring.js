const { SlashCommandBuilder } = require("discord.js");
const { belovedEmbed } = require("../../utils/embeds");
const { coins } = require("../../utils/helpers");
const marriageSys = require("../../systems/marriage");
const economy = require("../../systems/economy");

const RINGS = {
    silver: { name: "Silver Ring", emoji: "\u{1F48D}", price: 5000, rank: 1 },
    gold: { name: "Gold Ring", emoji: "\u{1F7E1}", price: 20000, rank: 2 },
    diamond: { name: "Diamond Ring", emoji: "\u{1F48E}", price: 75000, rank: 3 },
    royal: { name: "BLVD Royal Ring", emoji: "\u{1F451}", price: 250000, rank: 4 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ring")
        .setDescription("Marriage ring commands")
        .addSubcommand(sub => sub.setName("buy").setDescription("Buy or upgrade your marriage ring")
            .addStringOption(opt => opt.setName("ring").setDescription("Choose a ring").setRequired(true)
                .addChoices(
                    { name: "Silver ring \u2014 5,000 coins", value: "silver" },
                    { name: "Gold ring \u2014 20,000 coins", value: "gold" },
                    { name: "Diamond ring \u2014 75,000 coins", value: "diamond" },
                    { name: "BLVD royal ring \u2014 250,000 coins", value: "royal" }
                ))),

    async execute(interaction) {
        const m = marriageSys.get(interaction.guild.id, interaction.user.id);
        if (!m) return interaction.reply({ content: "\u{1F494} You need to be married before buying a ring.", ephemeral: true });

        const ring = RINGS[interaction.options.getString("ring")];
        if (m.ring_rank >= ring.rank) return interaction.reply({ content: `You already own **${m.ring_name}** or a better ring.`, ephemeral: true });

        const wallet = economy.getUser(interaction.guild.id, interaction.user.id);
        if (wallet.balance < ring.price) {
            return interaction.reply({ content: `You need ${coins(ring.price)} for that ring. Your wallet has ${coins(wallet.balance)}.`, ephemeral: true });
        }

        economy.update(interaction.guild.id, interaction.user.id, { balance: wallet.balance - ring.price });
        marriageSys.update(interaction.guild.id, interaction.user.id, {
            ring_name: ring.name, ring_emoji: ring.emoji, ring_price: ring.price, ring_rank: ring.rank
        });

        return interaction.reply({
            embeds: [belovedEmbed(`${ring.emoji} Ring Purchased`)
                .setDescription(`<@${interaction.user.id}> bought a **${ring.name}** for their marriage with <@${m.partner_id}>!\n\nCost: ${coins(ring.price)}\nNew balance: ${coins(wallet.balance - ring.price)}`)],
            allowedMentions: { users: [m.partner_id] }
        });
    }
};
