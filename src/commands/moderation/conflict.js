const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const conflictGuard = require("../../systems/conflictGuard");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("conflict")
        .setDescription("Configure Beloved Conflict Guard")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName("status").setDescription("View Conflict Guard settings"))
        .addSubcommand(sub => sub.setName("enable").setDescription("Enable Conflict Guard"))
        .addSubcommand(sub => sub.setName("disable").setDescription("Disable Conflict Guard"))
        .addSubcommand(sub => sub.setName("sensitivity").setDescription("Change detection sensitivity")
            .addStringOption(opt => opt.setName("level").setDescription("Sensitivity level").setRequired(true)
                .addChoices(
                    { name: "Low \u2014 fewer interventions", value: "low" },
                    { name: "Normal \u2014 recommended", value: "normal" },
                    { name: "High \u2014 fastest detection", value: "high" }
                )))
        .addSubcommand(sub => sub.setName("funny").setDescription("Enable or disable funny warnings")
            .addBooleanOption(opt => opt.setName("enabled").setDescription("Use funny warning messages").setRequired(true)))
        .addSubcommand(sub => sub.setName("slowmode").setDescription("Enable or disable automatic slowmode")
            .addBooleanOption(opt => opt.setName("enabled").setDescription("Automatically enable slowmode").setRequired(true)))
        .addSubcommand(sub => sub.setName("timeouts").setDescription("Enable or disable automatic timeouts")
            .addBooleanOption(opt => opt.setName("enabled").setDescription("Automatically timeout repeat offenders").setRequired(true)))
        .addSubcommand(sub => sub.setName("logchannel").setDescription("Set the Conflict Guard log channel")
            .addChannelOption(opt => opt.setName("channel").setDescription("Channel for moderation logs").setRequired(true).addChannelTypes(ChannelType.GuildText)))
        .addSubcommand(sub => sub.setName("clearlogs").setDescription("Disable Conflict Guard logging")),

    async execute(interaction) {
        if (!interaction.guild) return interaction.reply({ content: "Conflict Guard can only be configured inside a server.", ephemeral: true });

        const sub = interaction.options.getSubcommand();
        const settings = conflictGuard.getSettings(interaction.guild.id);

        if (sub === "status") {
            const thresholds = conflictGuard.sensitivityLevels[settings.sensitivity];
            return interaction.reply({
                content: "\u{1F6E1}\uFE0F **Beloved Conflict Guard V2**\n\n" +
                    `**Status:** ${settings.enabled ? "Enabled \u2705" : "Disabled \u274C"}\n` +
                    `**Sensitivity:** ${settings.sensitivity}\n` +
                    `**Funny warnings:** ${settings.funnyMessages ? "Enabled" : "Disabled"}\n` +
                    `**Automatic slowmode:** ${settings.slowmodeEnabled ? "Enabled" : "Disabled"}\n` +
                    `**Automatic timeouts:** ${settings.timeoutEnabled ? "Enabled" : "Disabled"}\n` +
                    `**Log channel:** ${settings.logChannelId ? `<#${settings.logChannelId}>` : "Not configured"}\n\n` +
                    `**Warning threshold:** ${thresholds.warningThreshold}\n` +
                    `**Slowmode threshold:** ${thresholds.slowmodeThreshold}\n` +
                    `**Timeout threshold:** ${thresholds.timeoutThreshold}`,
                ephemeral: true
            });
        }

        if (sub === "enable") { conflictGuard.updateSettings(interaction.guild.id, { enabled: true }); return interaction.reply({ content: "\u2705 Conflict Guard V2 is enabled.", ephemeral: true }); }
        if (sub === "disable") { conflictGuard.updateSettings(interaction.guild.id, { enabled: false }); return interaction.reply({ content: "\u274C Conflict Guard is disabled.", ephemeral: true }); }
        if (sub === "sensitivity") { conflictGuard.updateSettings(interaction.guild.id, { sensitivity: interaction.options.getString("level") }); return interaction.reply({ content: `\u{1F39A}\uFE0F Sensitivity is now **${interaction.options.getString("level")}**.`, ephemeral: true }); }
        if (sub === "funny") { conflictGuard.updateSettings(interaction.guild.id, { funnyMessages: interaction.options.getBoolean("enabled") }); return interaction.reply({ content: `\u{1F602} Funny warnings are now **${interaction.options.getBoolean("enabled") ? "enabled" : "disabled"}**.`, ephemeral: true }); }
        if (sub === "slowmode") { conflictGuard.updateSettings(interaction.guild.id, { slowmodeEnabled: interaction.options.getBoolean("enabled") }); return interaction.reply({ content: `\u{1F40C} Automatic slowmode is now **${interaction.options.getBoolean("enabled") ? "enabled" : "disabled"}**.`, ephemeral: true }); }
        if (sub === "timeouts") { conflictGuard.updateSettings(interaction.guild.id, { timeoutEnabled: interaction.options.getBoolean("enabled") }); return interaction.reply({ content: `\u23F0 Automatic timeouts are now **${interaction.options.getBoolean("enabled") ? "enabled" : "disabled"}**.`, ephemeral: true }); }
        if (sub === "logchannel") { const ch = interaction.options.getChannel("channel"); conflictGuard.updateSettings(interaction.guild.id, { logChannelId: ch.id }); return interaction.reply({ content: `\u{1F4CB} Conflict logs will be sent to ${ch}.`, ephemeral: true }); }
        if (sub === "clearlogs") { conflictGuard.updateSettings(interaction.guild.id, { logChannelId: null }); return interaction.reply({ content: "\u{1F4CB} Conflict logging has been disabled.", ephemeral: true }); }
    }
};
