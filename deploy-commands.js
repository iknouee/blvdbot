require("dotenv").config();

const {
    REST,
    Routes,
    SlashCommandBuilder
} = require("discord.js");


// =====================
// Commands
// =====================

const commands = [

    new SlashCommandBuilder()
        .setName("love")
        .setDescription("Send someone love")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who do you love?")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("roast")
        .setDescription("Roast someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who gets roasted?")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("compliment")
        .setDescription("Compliment someone")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who gets complimented?")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("vibe")
        .setDescription("Check the vibe"),

    new SlashCommandBuilder()
        .setName("hug")
        .setDescription("Give someone a hug")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who gets hugged?")
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
        .setName("fortune")
        .setDescription("Get a random fortune"),

    new SlashCommandBuilder()
        .setName("mood")
        .setDescription("Check Beloved's mood"),

    new SlashCommandBuilder()
        .setName("ask")
        .setDescription("Ask Beloved something")
        .addStringOption(option =>
            option
                .setName("question")
                .setDescription("Your question")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("smashorpass")
        .setDescription("Start a Smash or Pass vote")
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("Who should people vote on?")
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName("duration")
                .setDescription("How long voting lasts in seconds")
                .setRequired(false)
                .setMinValue(15)
                .setMaxValue(300)
        )

];


// =====================
// Deploy
// =====================

const rest = new REST({
    version: "10"
}).setToken(process.env.TOKEN);


(async () => {

    try {

        console.log("💖 Deploying Beloved commands...");

        await rest.put(
            Routes.applicationCommands(
                process.env.CLIENT_ID
            ),
            {
                body: commands.map(
                    command => command.toJSON()
                )
            }
        );

        console.log("✅ Beloved commands deployed");

    } catch (error) {

        console.error(
            "❌ Command deployment failed:",
            error
        );

    }

})();
