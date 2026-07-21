require("dotenv").config();

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

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
        .setDescription("Hug your spouse"),

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
        .setName("balance").setDescription("Check your Beloved coin balance")
        .addUserOption(option => option.setName("user").setDescription("Whose balance?").setRequired(false)),

    new SlashCommandBuilder().setName("daily").setDescription("Claim your daily Beloved coins"),
    new SlashCommandBuilder().setName("work").setDescription("Work a questionable job for coins"),
    new SlashCommandBuilder().setName("beg").setDescription("Beg Beloved for spare change"),

    new SlashCommandBuilder()
        .setName("pay").setDescription("Send coins to another person")
        .addUserOption(option => option.setName("user").setDescription("Who gets paid?").setRequired(true))
        .addIntegerOption(option => option.setName("amount").setDescription("Amount to send").setMinValue(1).setRequired(true)),

    new SlashCommandBuilder().setName("coinleaderboard").setDescription("See the richest people in the server"),

    new SlashCommandBuilder()
        .setName("slots").setDescription("Spin Beloved's animated slot machine")
        .addIntegerOption(option => option.setName("bet").setDescription("Bet 10 or more coins").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("coinflip").setDescription("Bet on heads or tails")
        .addStringOption(option => option.setName("choice").setDescription("Heads or tails").setRequired(true).addChoices({name:"Heads",value:"heads"},{name:"Tails",value:"tails"}))
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("roulette").setDescription("Play casino roulette")
        .addStringOption(option => option.setName("choice").setDescription("Pick a colour").setRequired(true).addChoices({name:"Red (2x)",value:"red"},{name:"Black (2x)",value:"black"},{name:"Green (14x)",value:"green"}))
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

    new SlashCommandBuilder()
        .setName("blackjack").setDescription("Play interactive blackjack against Beloved")
        .addIntegerOption(option => option.setName("bet").setDescription("Your bet").setMinValue(10).setRequired(true)),

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
        .setName("married")
        .setDescription("See who you are married to"),

    new SlashCommandBuilder()
        .setName("divorce")
        .setDescription("Divorce your current spouse"),

    new SlashCommandBuilder()
        .setName("kiss")
        .setDescription("Kiss your spouse"),

    new SlashCommandBuilder()
        .setName("date")
        .setDescription("Take your spouse on a random date"),

    new SlashCommandBuilder()
        .setName("gift")
        .setDescription("Buy your spouse a gift")
        .addStringOption(option =>
            option
                .setName("gift")
                .setDescription("Choose a gift")
                .setRequired(true)
                .addChoices(
                    { name: "Flowers — 500 coins", value: "flowers" },
                    { name: "Chocolate — 750 coins", value: "chocolate" },
                    { name: "Teddy Bear — 1,500 coins", value: "teddy" },
                    { name: "Designer Bag — 15,000 coins", value: "designer_bag" },
                    { name: "Private Jet — 250,000 coins", value: "private_jet" }
                )
        ),

    new SlashCommandBuilder()
        .setName("ring")
        .setDescription("Manage your marriage ring")
        .addSubcommand(subcommand =>
            subcommand
                .setName("buy")
                .setDescription("Buy or upgrade your marriage ring")
                .addStringOption(option =>
                    option
                        .setName("ring")
                        .setDescription("Choose a ring")
                        .setRequired(true)
                        .addChoices(
                            { name: "Silver Ring — 5,000 coins", value: "silver" },
                            { name: "Gold Ring — 20,000 coins", value: "gold" },
                            { name: "Diamond Ring — 75,000 coins", value: "diamond" },
                            { name: "Royal Ring — 250,000 coins", value: "royal" }
                        )
                )
        ),

    new SlashCommandBuilder()
        .setName("tweet")
        .setDescription("Make a funny fake tweet")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who is supposedly tweeting?")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("text")
                .setDescription("What should the fake tweet say?")
                .setRequired(true)
                .setMaxLength(280)
        ),

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



const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("💖 Deploying Beloved commands...");
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands.map(command => command.toJSON()) });
    console.log("✅ Beloved commands deployed");
  } catch (error) { console.error("❌ Command deployment failed:", error); }
})();
