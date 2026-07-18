require('dotenv').config();

const express = require('express');

const {
    Client,
    GatewayIntentBits,
    Events,
    ActivityType,
    SlashCommandBuilder,
    REST,
    Routes
} = require('discord.js');


// =====================
// Render Web Server
// =====================

const app = express();

app.get('/', (req,res)=>{
    res.send("💖 Beloved is online");
});

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Web server running");
});


// =====================
// Discord Client
// =====================

const client = new Client({

    intents:[
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]

});



// =====================
// Slash Commands
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
)

];




// =====================
// Deploy Commands
// =====================

const rest = new REST({
    version:"10"
}).setToken(process.env.TOKEN);



(async()=>{

try{

console.log("Deploying commands...");

await rest.put(

Routes.applicationCommands(
    process.env.CLIENT_ID
),

{
    body:commands.map(c=>c.toJSON())
}

);

console.log("Commands deployed");

}
catch(err){

console.error(err);

}

})();





// =====================
// Ready
// =====================

client.once(
Events.ClientReady,
()=>{

console.log(
`💖 Beloved online as ${client.user.tag}`
);


client.user.setPresence({

activities:[{

name:"spreading chaos 💕",
type:ActivityType.Watching

}],

status:"online"

});


});





// =====================
// Command Responses
// =====================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isChatInputCommand())
return;



const command = interaction.commandName;



// LOVE

if(command==="love"){

let user =
interaction.options.getUser("user");


const replies=[

`💖 ${user} Beloved has decided you are adorable`,
`💕 ${user} received 1000 love points`,
`❤️ ${user} is officially loved by the boulevard`

];


return interaction.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}



// ROAST

if(command==="roast"){

let user =
interaction.options.getUser("user");


const roasts=[

`🔥 ${user} has the energy of a broken charger`,
`💀 ${user} probably says "trust me" before bad ideas`,
`😭 ${user} is running on 2 brain cells and WiFi`

];


return interaction.reply(
roasts[Math.floor(Math.random()*roasts.length)]
);

}



// COMPLIMENT

if(command==="compliment"){

let user =
interaction.options.getUser("user");


return interaction.reply(
`✨ ${user} is amazing and Beloved approves`
);

}



// VIBE

if(command==="vibe"){

const vibes=[

"🔥 Maximum vibes detected",
"💖 Cute chaos energy",
"💀 Something suspicious is happening",
"😎 Certified boulevard moment"

];


return interaction.reply(
vibes[Math.floor(Math.random()*vibes.length)]
);

}



// HUG

if(command==="hug"){

let user =
interaction.options.getUser("user");


return interaction.reply(
`🤗 Beloved gives ${user} a giant hug`
);

}



// SHIP

if(command==="ship"){

let one =
interaction.options.getUser("one");

let two =
interaction.options.getUser("two");


let percent =
Math.floor(Math.random()*101);


return interaction.reply(

`💘 ${one} + ${two}\nCompatibility: ${percent}%`

);

}



// FORTUNE

if(command==="fortune"){

const fortunes=[

"🔮 You will find happiness... probably in snacks",
"🔮 Great things are coming. Maybe tomorrow.",
"🔮 Your future contains questionable decisions"

];


return interaction.reply(
fortunes[Math.floor(Math.random()*fortunes.length)]
);

}



// MOOD

if(command==="mood"){

const moods=[

"😊 Happy",
"😈 Chaotic",
"🥲 Emotionally attached to Discord",
"🤖 Robot mode activated"

];


return interaction.reply(
`Beloved mood: ${moods[Math.floor(Math.random()*moods.length)]}`
);

}



// ASK

if(command==="ask"){

const answers=[

"Maybe 👀",
"Ask the pigeons",
"Beloved says yes",
"Absolutely not 💀",
"I have no idea but I support you"

];


return interaction.reply(
answers[Math.floor(Math.random()*answers.length)]
);

}



});




// =====================
// Mention Replies
// =====================

client.on(
Events.MessageCreate,
message=>{


if(message.author.bot)
return;


if(message.mentions.has(client.user)){


message.reply(

[

"you called? 👀",
"Beloved has arrived 💖",
"hello human",
"another ping? 😭"

][Math.floor(Math.random()*4)]

);


}


});



client.login(process.env.TOKEN);
