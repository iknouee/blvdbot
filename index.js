require('dotenv').config();

const express = require('express');
const fs = require('fs');

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    ActivityType
} = require('discord.js');


// =====================
// Web Server (Render)
// =====================

const app = express();

app.get('/', (req, res) => {
    res.send('💖 Beloved is alive');
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Web server running`);
});


// =====================
// Discord Client
// =====================

const client = new Client({

    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]

});



// =====================
// Command Handler
// =====================

client.commands = new Collection();


const commandFiles = fs.readdirSync('./commands')
    .filter(file => file.endsWith('.js'));


for (const file of commandFiles) {

    const command = require(`./commands/${file}`);

    client.commands.set(
        command.data.name,
        command
    );

}



// =====================
// Ready
// =====================

client.once(
    Events.ClientReady,
    () => {

        console.log(
            `💖 Beloved online as ${client.user.tag}`
        );


        client.user.setPresence({

            activities: [
                {
                    name: "making people smile 💕",
                    type: ActivityType.Watching
                }
            ],

            status: "online"

        });

    }
);



// =====================
// Slash Commands
// =====================

client.on(
    Events.InteractionCreate,
    async interaction => {


        if (!interaction.isChatInputCommand())
            return;



        const command =
            client.commands.get(
                interaction.commandName
            );


        if (!command)
            return;



        try {

            await command.execute(interaction);

        } catch (error) {

            console.error(error);


            if (interaction.replied) {

                await interaction.followUp({
                    content:
                    "💀 Beloved broke something...",
                    ephemeral:true
                });

            } else {

                await interaction.reply({
                    content:
                    "💀 Beloved broke something...",
                    ephemeral:true
                });

            }

        }


    }
);



// =====================
// Random Mention Replies
// =====================

client.on(
    Events.MessageCreate,
    async message => {


        if(message.author.bot)
            return;



        if(message.mentions.has(client.user)){


            const replies = [

                "you called? 👀",
                "Beloved has arrived 💖",
                "did someone summon chaos?",
                "hello human 😌",
                "my circuits are blushing",
                "yes boss 🫡",
                "another ping? rude 😭",
                "Beloved reporting for duty",

            ];



            message.reply(
                replies[
                    Math.floor(
                        Math.random()*replies.length
                    )
                ]
            );

        }


    }
);



client.login(process.env.TOKEN);
