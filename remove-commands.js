require("dotenv").config();
const { REST, Routes } = require("discord.js");

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log("Removing old commands...");

        // Remove global commands
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        console.log("Global commands removed.");

        // Remove guild commands if GUILD_ID is set
        if (process.env.GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] });
            console.log("Guild commands removed.");
        }
    } catch (error) {
        console.error("Error removing commands:", error);
    }
})();
