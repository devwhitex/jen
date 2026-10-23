const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autoclean')
    .setDescription('Configure channels where messages are automatically deleted after a delay')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Enable auto-delete on a channel after a set number of minutes')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to auto-clean')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('delay')
            .setDescription('Minutes after which messages will automatically delete (1 to 1440)')
            .setMinValue(1)
            .setMaxValue(1440)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Disable auto-cleaning on a channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Channel to remove auto-clean from')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all channels configured with auto-clean')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const channel = interaction.options.getChannel('channel');
      const delay = interaction.options.getInteger('delay');

      db.setAutoClean(channel.id, interaction.guild.id, delay);

      return interaction.reply({
        embeds: [
          embeds.success(
            `🧹 Auto-clean enabled for ${channel}!\n` +
            `All newly sent messages in that channel will automatically delete after **${delay} minute(s)**.`
          )
        ]
      });
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      const res = db.removeAutoClean(channel.id, interaction.guild.id);

      if (res.changes === 0) {
        return interaction.reply({
          embeds: [embeds.info(`Auto-clean was not enabled on ${channel}.`)],
          ephemeral: true
        });
      }

      return interaction.reply({
        embeds: [embeds.success(`Auto-clean disabled for ${channel}.`)]
      });
    }

    if (sub === 'list') {
      const list = db.getAutoCleanList(interaction.guild.id);

      if (list.length === 0) {
        return interaction.reply({
          embeds: [embeds.info('No channels are currently configured for auto-clean.')],
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🧹 Auto-Cleaning Channels')
        .setColor(config.embedColor)
        .setDescription(
          list.map(c => `• <#${c.channel_id}>: Auto-deletes after **${c.delay_minutes} minute(s)**`).join('\n')
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
