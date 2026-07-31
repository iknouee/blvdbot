const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { normaliseBlacklistText } = require("../../utils/helpers");
const blacklistSys = require("../../systems/blacklist");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blacklist")
        .setDescription("Manage words that are instantly deleted")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName("add").setDescription("Add a word or phrase to the blacklist")
            .addStringOption(opt => opt.setName("word").setDescription("Word or phrase to block").setRequired(true).setMaxLength(100)))
        .addSubcommand(sub => sub.setName("remove").setDescription("Remove a word or phrase from the blacklist")
            .addStringOption(opt => opt.setName("word").setDescription("Word or phrase to unblock").setRequired(true).setMaxLength(100)))
        .addSubcommand(sub => sub.setName("list").setDescription("Show all blacklisted words"))
        .addSubcommand(sub => sub.setName("clear").setDescription("Remove every blacklisted word")),

    async execute(interaction) {
        if (!interaction.inGuild()) return interaction.reply({ content: "This command only works inside a server.", ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === "add") {
            const raw = interaction.options.getString("word").trim();
            const clean = normaliseBlacklistText(raw);
            if (!clean) return interaction.reply({ content: "Enter a valid word or phrase.", ephemeral: true });

            const existing = blacklistSys.getWords(guildId);
            if (existing.some(w => normaliseBlacklistText(w) === clean)) {
                return interaction.reply({ content: `\u{1F6AB} **${raw}** is already blacklisted.`, ephemeral: true });
            }
            blacklistSys.addWord(guildId, raw);
            return interaction.reply({ content: `\u2705 Added **${raw}**. Messages containing it will now be deleted instantly.`, ephemeral: true });
        }

        if (sub === "remove") {
            const raw = interaction.options.getString("word").trim();
            const existing = blacklistSys.getWords(guildId);
            const match = existing.find(w => normaliseBlacklistText(w) === normaliseBlacklistText(raw));
            if (!match) return interaction.reply({ content: `\u274C **${raw}** is not blacklisted.`, ephemeral: true });
            blacklistSys.removeWord(guildId, match);
            return interaction.reply({ content: `\u2705 Removed **${match}** from the blacklist.`, ephemeral: true });
        }

        if (sub === "list") {
            const entries = blacklistSys.getWords(guildId);
            if (!entries.length) return interaction.reply({ content: "The blacklist is currently empty.", ephemeral: true });
            const shown = entries.map((w, i) => `${i + 1}. ${w}`).join("\n");
            return interaction.reply({ content: `\u{1F6AB} **Blacklisted words (${entries.length})**\n\n${shown}`.slice(0, 1900), ephemeral: true });
        }

        if (sub === "clear") {
            blacklistSys.clear(guildId);
            return interaction.reply({ content: "\u2705 Cleared the server blacklist.", ephemeral: true });
        }
    }
};
