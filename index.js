// index.js
require('dotenv').config();
const {Client,GatewayIntentBits,Events}=require('discord.js');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once(Events.ClientReady,()=>console.log(`Beloved ready as ${client.user.tag}`));
client.on(Events.InteractionCreate,async i=>{
 if(!i.isChatInputCommand()) return;
 if(i.commandName!=="panic") return;
 if(!i.memberPermissions.has("Administrator")) return i.reply({content:"Admins only.",ephemeral:true});
 let locked=0;
 await i.reply({embeds:[{color:0xff3333,title:"🚨 Panic Mode Enabled",description:"Locking channels..."}]});
 for(const ch of i.guild.channels.cache.values()){
  try{
   if("permissionOverwrites" in ch){
    await ch.permissionOverwrites.edit(i.guild.roles.everyone,{SendMessages:false,CreatePublicThreads:false,CreatePrivateThreads:false,SendMessagesInThreads:false});
    locked++;
   }
  }catch{}
 }
 await i.editReply({embeds:[{color:0xff3333,title:"🚨 Panic Mode Enabled",fields:[{name:"Activated By",value:`<@${i.user.id}>`},{name:"Channels Locked",value:String(locked)}],timestamp:new Date().toISOString()}]});
});
client.login(process.env.TOKEN);
