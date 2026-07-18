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

app.get('/', (req, res) => {
    res.send("💖 Beloved is online");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web server running");
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
// Commands
// =====================

const commands = [


new SlashCommandBuilder()
.setName("love")
.setDescription("Send someone love")
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
.setDescription("Hug someone")
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
.setDescription("Check the vibe"),


new SlashCommandBuilder()
.setName("fortune")
.setDescription("Get a funny fortune"),


new SlashCommandBuilder()
.setName("mood")
.setDescription("Check Beloved's mood"),


new SlashCommandBuilder()
.setName("ask")
.setDescription("Ask Beloved something")
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
)

];




// =====================
// Deploy Commands
// =====================

const rest = new REST({
    version:"10"
}).setToken(process.env.TOKEN);



async function deployCommands(){

try{

console.log("💖 Deploying commands...");


await rest.put(

Routes.applicationGuildCommands(

process.env.CLIENT_ID,

process.env.GUILD_ID

),

{
body: commands.map(
command => command.toJSON()
)
}

);


console.log("✅ Commands deployed");


}

catch(error){

console.error(error);

}

}


deployCommands();



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

activities:[

{
name:"causing chaos 💕",
type:ActivityType.Watching
}

],

status:"online"

});


});



// =====================
// Slash Command Handler
// =====================

client.on(
Events.InteractionCreate,
async interaction => {


if(!interaction.isChatInputCommand())
return;


try{


const command =
interaction.commandName;



// LOVE

if(command === "love"){

const user =
interaction.options.getUser("user");


return interaction.reply(
`💖 ${user} has received Beloved's love blessing`
);

}



// ROAST

if(command === "roast"){

const user =
interaction.options.getUser("user");


const roasts=[

`🔥 ${user} uses Internet Explorer`,
`💀 ${user} probably loses arguments with Google`,
`😭 ${user} has NPC energy`

];


return interaction.reply(
roasts[Math.floor(Math.random()*roasts.length)]
);

}



// COMPLIMENT

if(command === "compliment"){

const user =
interaction.options.getUser("user");


return interaction.reply(
`✨ ${user} is officially approved by Beloved`
);

}



// HUG

if(command === "hug"){

const user =
interaction.options.getUser("user");


return interaction.reply(
`🤗 Beloved hugged ${user}`
);

}



// SHIP

if(command === "ship"){

const one =
interaction.options.getUser("one");

const two =
interaction.options.getUser("two");


let score =
Math.floor(Math.random()*101);


return interaction.reply(
`💘 ${one} + ${two}\nCompatibility: ${score}%`
);

}



// VIBE

if(command === "vibe"){

const vibes=[

"🔥 Maximum vibes",
"💖 Cute chaos",
"💀 Suspicious energy",
"😎 Legendary"

];


return interaction.reply(
vibes[Math.floor(Math.random()*vibes.length)]
);

}



// FORTUNE

if(command === "fortune"){

const fortunes=[

"🔮 You will find happiness near snacks",
"🔮 Something amazing will happen... eventually",
"🔮 Your future contains questionable choices"

];


return interaction.reply(
fortunes[Math.floor(Math.random()*fortunes.length)]
);

}



// MOOD

if(command === "mood"){

return interaction.reply(
"💖 Beloved mood: 50% cute, 50% chaos"
);

}



// ASK

if(command === "ask"){

const answers=[

"Maybe 👀",
"Ask again later",
"Absolutely",
"No 💀",
"Beloved approves"

];


return interaction.reply(
answers[Math.floor(Math.random()*answers.length)]
);

}



// 8BALL

if(command === "8ball"){

const answers=[

"Yes",
"No",
"Probably",
"Definitely",
"Ask your toaster"

];


return interaction.reply(
`🎱 ${answers[Math.floor(Math.random()*answers.length)]}`
);

}



// RATE

if(command === "rate"){

const user =
interaction.options.getUser("user");


return interaction.reply(
`⭐ ${user} rating: ${Math.floor(Math.random()*101)}/100`
);

}



}

catch(error){

console.error(error);


if(!interaction.replied){

await interaction.reply({

content:
"💀 Beloved broke something",

ephemeral:true

});

}


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


const replies=[

"you called? 👀",
"Beloved has arrived 💖",
"hello human",
"another ping? 😭"

];


message.reply(
replies[Math.floor(Math.random()*replies.length)]
);


}


});



client.login(process.env.TOKEN);
