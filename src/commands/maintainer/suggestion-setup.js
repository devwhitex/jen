const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggestion-setup')
    .setDescription('Configure the channel for member suggestions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('Channel where suggestions will be posted')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    db.updateSetting(interaction.guild.id, 'suggestion_channel_id', channel.id);

    return interaction.reply({
      embeds: [embeds.success(`Suggestions feed channel set to ${channel}!\nUsers can now use \`/suggest\` to submit ideas.`)]
    });
  }
};
