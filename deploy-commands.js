require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require("discord.js");


// ==================================================
// BELOVED COMMANDS
// ==================================================

const commands = [
    new SlashCommandBuilder()
        .setName("love")
        .setDescription("Give someone Beloved's love")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Roast someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("compliment")
        .setDescription("Compliment someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("hug")
        .setDescription("Give someone a hug")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("ship")
        .setDescription("Ship two people")
        .addUserOption(option =>
            option
                .setName("one")
                .setDescription("First person")
                .setRequired(true)
        )
        .addUserOption(option =>
            option
                .setName("two")
                .setDescription("Second person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("vibe")
        .setDescription("Check Beloved vibes"),

    new SlashCommandBuilder()
        .setName("fortune")
        .setDescription("Get a weird fortune"),

    new SlashCommandBuilder()
        .setName("mood")
        .setDescription("Check Beloved mood"),

    new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask Beloved anything")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("8ball")
        .setDescription("Magic 8 ball")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("rate")
        .setDescription("Rate someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Person")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("smashorpass")
        .setDescription("Start a Smash or Pass vote for someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("The person people will vote on")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription("Voting time in seconds (10-300)")
                .setMinValue(10)
                .setMaxValue(300)
                .setRequired(false)
        ),

    new SlashCommandBuilder()
        .setName("marry")
        .setDescription("Propose a totally legitimate Discord marriage")
        .addUserOption(option => option.setName("user").setDescription("Who are you proposing to?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("court")
        .setDescription("Put someone on trial and let the server vote")
        .addUserOption(option => option.setName("user").setDescription("The defendant").setRequired(true))
        .addStringOption(option => option.setName("charge").setDescription("What are they accused of?").setRequired(true).setMaxLength(200))
        .addIntegerOption(option => option.setName("duration").setDescription("Voting time in seconds (15-300)").setMinValue(15).setMaxValue(300)),

    new SlashCommandBuilder()
        .setName("fight")
        .setDescription("Challenge someone to a button battle")
        .addUserOption(option => option.setName("user").setDescription("Who do you want to fight?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("cancel")
        .setDescription("Cancel someone for completely ridiculous reasons")
        .addUserOption(option => option.setName("user").setDescription("Who is getting cancelled?").setRequired(true)),

    new SlashCommandBuilder()
        .setName("wheel")
        .setDescription("Spin the wheel and select a random server member"),

    new SlashCommandBuilder()
        .setName("conflict")
        .setDescription("Configure Beloved Conflict Guard")
        .setDefaultMemberPermissions(
            PermissionFlagsBits.ManageGuild
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("status")
                .setDescription("View Conflict Guard settings")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("enable")
                .setDescription("Enable Conflict Guard")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("disable")
                .setDescription("Disable Conflict Guard")
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("sensitivity")
                .setDescription("Change detection sensitivity")
                .addStringOption(option =>
                    option
                        .setName("level")
                        .setDescription("Sensitivity level")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "Low — fewer interventions",
                                value: "low"
                            },
                            {
                                name: "Normal — recommended",
                                value: "normal"
                            },
                            {
                                name: "High — fastest detection",
                                value: "high"
                            }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("funny")
                .setDescription("Enable or disable funny warnings")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Use funny warning messages")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("slowmode")
                .setDescription("Enable or disable automatic slowmode")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Automatically enable slowmode")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("timeouts")
                .setDescription("Enable or disable automatic timeouts")
                .addBooleanOption(option =>
                    option
                        .setName("enabled")
                        .setDescription("Automatically timeout repeat offenders")
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("logchannel")
                .setDescription("Set the Conflict Guard log channel")
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("Channel for moderation logs")
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName("clearlogs")
                .setDescription("Disable Conflict Guard logging")
        )
];


// ==================================================
// DEPLOY
// ==================================================

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("💖 Deploying Beloved commands...");

        // Set GUILD_ID in .env for instant testing.
        // Without GUILD_ID, commands are deployed globally and can take time to appear.
        const route = process.env.GUILD_ID
            ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
            : Routes.applicationCommands(process.env.CLIENT_ID);

        await rest.put(route, {
            body: commands.map(command => command.toJSON())
        });

        console.log(`✅ Beloved commands deployed ${process.env.GUILD_ID ? "to the test server" : "globally"}`);
    } catch (error) {
        console.error("❌ Command deployment failed:", error);
        process.exitCode = 1;
    }
})();
