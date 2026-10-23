const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const GiveawayManager = require('./services/giveawayManager');
const startKeepAliveServer = require('./server');

// Verify token
if (!config.token) {
  console.log('\n======================================================');
  console.log('⚠️  DISCORD_TOKEN is missing in your .env file!');
  console.log('1. Copy .env.example to .env');
  console.log('2. Paste your Discord Bot Token and Client ID.');
  console.log('3. Run `npm run deploy` to register slash commands.');
  console.log('4. Run `npm start` to run the bot.');
  console.log('======================================================\n');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// Setup command collections and managers
client.commands = new Collection();
client.giveawayManager = new GiveawayManager(client);

// 1. Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.warn(`[WARNING] Command at ${filePath} is missing "data" or "execute".`);
    }
  }
}

// 2. Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// 3. Graceful Error Handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});

// 4. Start 24/7 Keep-Alive Web Server (for Render / Koyeb / Uptime monitors)
startKeepAliveServer(client);

// 5. Log in
client.login(config.token).catch(err => {
  console.error('❌ Failed to login to Discord:', err.message);
  console.error('Check if your DISCORD_TOKEN is valid and has Privileged Gateway Intents enabled in the Discord Developer Portal.');
});
