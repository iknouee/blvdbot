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
// Web Server
// =====================

const app = express();

app.get('/', (req,res)=>{
    res.send("💖 Beloved is online");
});

app.listen(process.env.PORT || 3000, ()=>{
    console.log("🌐 Web server running");
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
.setDescription("Give someone Beloved's love")
.addUserOption(o =>
o.setName("user")
.setDescription("Person")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("roast")
.setDescription("Roast someone")
.addUserOption(o =>
o.setName("user")
.setDescription("Person")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("compliment")
.setDescription("Compliment someone")
.addUserOption(o =>
o.setName("user")
.setDescription("Person")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("hug")
.setDescription("Give someone a hug")
.addUserOption(o =>
o.setName("user")
.setDescription("Person")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("ship")
.setDescription("Ship two people")
.addUserOption(o =>
o.setName("one")
.setDescription("First person")
.setRequired(true)
)
.addUserOption(o =>
o.setName("two")
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
.addStringOption(o =>
o.setName("question")
.setDescription("Question")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("8ball")
.setDescription("Magic 8 ball")
.addStringOption(o =>
o.setName("question")
.setDescription("Question")
.setRequired(true)
),


new SlashCommandBuilder()
.setName("rate")
.setDescription("Rate someone")
.addUserOption(o =>
o.setName("user")
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


async function deploy(){

try{

console.log("💖 Deploying commands");


await rest.put(

Routes.applicationGuildCommands(
process.env.CLIENT_ID,
process.env.GUILD_ID
),

{
body:commands.map(c=>c.toJSON())
}

);


console.log("✅ Commands ready");


}

catch(err){

console.error(err);

}

}


deploy();



// =====================
// Bot Ready
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
name:"judging humans 💕",
type:ActivityType.Watching
}
],

status:"online"

});

});



// =====================
// Command Handler
// =====================

client.on(
Events.InteractionCreate,
async interaction=>{


if(!interaction.isChatInputCommand())
return;


try{


const cmd = interaction.commandName;



if(cmd==="love"){

const user = interaction.options.getUser("user");

const replies=[

`💖 ${user} has been blessed by Beloved. Use this power wisely.`,
`💕 Beloved scanned ${user}. Result: dangerously lovable.`,
`🌹 ${user} has unlocked premium friendship mode.`,
`❤️ ${user} is now 12% more amazing.`

];

return interaction.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}



if(cmd==="roast"){

const user = interaction.options.getUser("user");

const replies=[

`🔥 ${user} has the confidence of someone who skips tutorials.`,
`💀 ${user}'s brain is running on free trial mode.`,
`😭 ${user} probably says "trust me" before disasters.`,
`🔥 Beloved checked ${user}. The results were deleted.`

];

return interaction.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}



if(cmd==="compliment"){

const user = interaction.options.getUser("user");

const replies=[

`✨ ${user} has main character energy.`,
`💎 ${user} is officially approved by Beloved.`,
`🌟 Scientists tried to measure ${user}'s greatness. They gave up.`,
`🫡 ${user} is actually built different.`

];

return interaction.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}



if(cmd==="hug"){

const user = interaction.options.getUser("user");

const replies=[

`🤗 Beloved launched a hug missile at ${user}.`,
`🫂 ${user} received a certified premium hug.`,
`💖 Hug complete. Happiness increased by 7%.`,
`🤖 Robot arms activated. ${user} has been hugged.`

];

return interaction.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}



if(cmd==="ship"){

const one = interaction.options.getUser("one");
const two = interaction.options.getUser("two");

const score=Math.floor(Math.random()*101);

let message =
score > 80 ? "💍 Soulmate detected."
:
score > 50 ? "💕 Could survive a shopping trip together."
:
"💀 Beloved recommends friendship.";


return interaction.reply(
`💘 ${one} + ${two}\n❤️ Compatibility: ${score}%\n${message}`
);

}



if(cmd==="vibe"){

const vibes=[

"🔥 Illegal levels of vibe detected.",
"😎 Maximum boulevard energy.",
"💀 Suspicious but accepted.",
"✨ Legendary vibes unlocked.",
"🧃 Vibe scanner exploded."

];


return interaction.reply(
vibes[Math.floor(Math.random()*vibes.length)]
);

}



if(cmd==="fortune"){

const fortunes=[

"🔮 You will find happiness near food.",
"🔮 Someone will compliment you today.",
"🔮 Your future contains questionable decisions.",
"🔮 A mysterious snack awaits you."

];


return interaction.reply(
fortunes[Math.floor(Math.random()*fortunes.length)]
);

}



if(cmd==="mood"){

const moods=[

"😊 Happy",
"😈 Planning chaos",
"🤖 Running on caffeine",
"🥲 Waiting for praise",
"💀 Slightly broken"

];


return interaction.reply(
`💖 Beloved mood: ${moods[Math.floor(Math.random()*moods.length)]}`
);

}



if(cmd==="ask"){

const question =
interaction.options.getString("question");


const answers=[

"Probably 👀",
"Beloved has consulted the toaster. Yes.",
"No. Absolutely not.",
"I have no idea but I support you.",
"That question hurt my circuits."

];


return interaction.reply(
`❓ ${question}\n\n💖 ${answers[Math.floor(Math.random()*answers.length)]}`
);

}



if(cmd==="8ball"){

const answers=[

"Yes",
"No",
"Maybe",
"Definitely",
"Ask again later",
"Your toaster knows"

];


return interaction.reply(
`🎱 ${answers[Math.floor(Math.random()*answers.length)]}`
);

}



if(cmd==="rate"){

const user =
interaction.options.getUser("user");


const score=Math.floor(Math.random()*101);


return interaction.reply(
`⭐ ${user} rating:\n\nCoolness: ${score}%\nChaos: ${Math.floor(Math.random()*101)}%\nBeloved approval: ${Math.floor(Math.random()*101)}%`
);

}


}

catch(error){

console.error(error);

if(!interaction.replied){

interaction.reply({
content:"💀 Beloved crashed trying to be funny.",
ephemeral:true
});

}

}


});



// =====================
// Mentions
// =====================

client.on(
Events.MessageCreate,
message=>{


if(message.author.bot)
return;


if(
message.mentions.has(client.user)
&& !message.mentions.everyone
){

const replies=[

"👀 You summoned me?",
"💖 Beloved has entered the chat.",
"🤖 I was busy doing important bot things.",
"😭 Another ping? I just sat down.",
"🫡 Reporting for duty."

];


message.reply(
replies[Math.floor(Math.random()*replies.length)]
);

}


});



client.login(process.env.TOKEN);
