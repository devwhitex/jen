const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const voiceService = require('../../services/voiceService');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-247')
    .setDescription('Configure 24/7 Voice Channel Stay mode (bot stays in VC forever & auto-reconnects)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Lock the bot into a voice channel 24/7')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Voice channel to stay in (defaults to your current voice channel)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt.setName('deafen')
            .setDescription('Deafen the bot to save bandwidth (recommended: true)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable 24/7 Voice Channel stay and disconnect the bot')
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current 24/7 Voice Channel Stay status and connection health')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    if (subcommand === 'enable') {
      const specifiedChannel = interaction.options.getChannel('channel');
      const targetChannel = specifiedChannel || interaction.member?.voice?.channel;
      const deafen = interaction.options.getBoolean('deafen') ?? true;

      if (!targetChannel) {
        return interaction.reply({
          embeds: [embeds.error('You must be in a voice channel or specify one to enable 24/7 mode!')],
          ephemeral: true
        });
      }

      await interaction.deferReply();

      try {
        await voiceService.connect247(guild, targetChannel, deafen);

        const embed = new EmbedBuilder()
          .setTitle('🟢 24/7 Voice Channel Stay Enabled')
          .setDescription(`The bot is now locked into **${targetChannel.name}** and will stay connected **24/7**!`)
          .addFields(
            { name: '🔊 Channel', value: `<#${targetChannel.id}>`, inline: true },
            { name: '🔇 Self-Deafened', value: deafen ? '`Yes (Bandwidth Saved)`' : '`No`', inline: true },
            { name: '🔄 Auto-Reconnect', value: '`Enabled (5s Recovery)`', inline: true }
          )
          .setColor('#10B981')
          .setFooter({ text: 'Even after bot restarts or network drops, the bot will auto-rejoin!' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [embeds.error(`Failed to connect to **${targetChannel.name}**: \`${err.message}\``)]
        });
      }
    }

    if (subcommand === 'disable') {
      const active = voiceService.is247Active(guild.id);
      if (!active) {
        return interaction.reply({
          embeds: [embeds.warning('24/7 Voice Channel Stay is not currently enabled on this server.')],
          ephemeral: true
        });
      }

      voiceService.disconnect247(guild.id);

      const embed = new EmbedBuilder()
        .setTitle('🔴 24/7 Voice Channel Stay Disabled')
        .setDescription('24/7 Voice Stay mode has been disabled and the bot has disconnected from the voice channel.')
        .setColor('#EF4444')
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'status') {
      const settings = db.getVoice247(guild.id);
      const isConnected = Boolean(voiceService.connections.get(guild.id) || guild.members.me?.voice?.channelId);
      const currentChannelId = guild.members.me?.voice?.channelId;

      const embed = new EmbedBuilder()
        .setTitle('🎙️ 24/7 Voice Channel Stay Status')
        .setColor(settings?.enabled ? '#10B981' : '#6B7280')
        .addFields(
          { name: '⚡ Mode Status', value: settings?.enabled ? '`🟢 ACTIVE (24/7)`' : '`⚪ DISABLED`', inline: true },
          { name: '📡 Connection State', value: isConnected ? '`🟢 Connected`' : '`🔴 Disconnected`', inline: true },
          { name: '🔊 Target Channel', value: settings?.channel_id ? `<#${settings.channel_id}>` : '*None configured*', inline: true },
          { name: '📍 Currently In', value: currentChannelId ? `<#${currentChannelId}>` : '*Not in any voice channel*', inline: true },
          { name: '🔇 Self-Deafened', value: settings?.deafened ? '`Yes`' : '`No`', inline: true },
          { name: '🔄 Auto-Recovery', value: settings?.enabled ? '`Active (Auto-Rejoin on Reboot/Drop)`' : '`Inactive`', inline: true }
        )
        .setFooter({ text: 'Use /voice-247 enable to lock into a channel' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  }
};
