// bot.js is the main file, start the bot from here: ``node bot`` in console.
require("dotenv").config();
require("./modules/global");
const { Client, Partials, GatewayIntentBits, REST, Routes } = require("discord.js");
global.client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.on("ready", async () => {
  console.log(`Starting up ${client.user.tag}!`);
  client.setMaxListeners(0);

  client.commands = [];
  require("./modules/log/log")(client);
  require("./modules/dice/dice")(client);
  require("./modules/poll/poll")(client);
  require("./modules/signup/signup")(client);
  require("./modules/customembed/customembed")(client);

  process.on("uncaughtException", (e) => {
    console.log(e);
  });
  client.on("uncaughtException", (e) => {
    console.log(e);
  });

  // refresh slash commands
  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
  const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: client.commands,
  });
  console.log(`Reloaded ${data.length} /slash commands`);
});

client.login(process.env.TOKEN);
