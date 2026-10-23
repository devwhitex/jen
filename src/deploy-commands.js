const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
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
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    if (!config.token || !config.clientId) {
      console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID must be provided in your .env file!');
      process.exit(1);
    }

    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    if (config.guildId) {
      // Fast guild-scoped deployment
      console.log(`Deploying slash commands to Guild ID: ${config.guildId}...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands!`);
    } else {
      // Global deployment
      console.log('Deploying slash commands globally (all servers)...');
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${data.length} global application (/) commands!`);
    }
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
