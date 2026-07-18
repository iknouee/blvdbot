require('dotenv').config();

const {
    REST,
    Routes,
    SlashCommandBuilder,
} = require('discord.js');


const commands = [

    new SlashCommandBuilder()
        .setName('panic')
        .setDescription('Lock every channel.')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('unpanic')
        .setDescription('Unlock every channel.')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('vibe')
        .setDescription('Get a random Beloved vibe.')
        .toJSON(),

];


const rest = new REST({ version: '10' })
    .setToken(process.env.TOKEN);


(async () => {

    try {

        console.log("Registering slash commands...");


        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            {
                body: commands,
            }
        );


        console.log("Successfully registered slash commands.");

    } catch (error) {

        console.error(error);

    }

})();
