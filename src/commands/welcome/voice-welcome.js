const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voice-welcome')
    .setDescription('Configure Voice Channel Welcome & Goodbye (Farewell) notification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current Voice Welcome & Goodbye configuration')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Enable or disable Voice Welcome & Goodbye notifications')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable voice notifications')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('mode')
        .setDescription('Choose where Voice Join & Leave alerts are delivered')
        .addStringOption(opt =>
          opt.setName('delivery')
            .setDescription('Delivery location')
            .setRequired(true)
            .addChoices(
              { name: 'Voice Channel Text Chat (in the VC itself)', value: 'vc_chat' },
              { name: 'Dedicated Voice Log Channel', value: 'log_channel' },
              { name: 'Both (VC Chat + Log Channel)', value: 'both' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('logchannel')
        .setDescription('Set dedicated text channel for voice join/leave logs')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Text channel to receive voice activity logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('message')
        .setDescription('Set custom welcome or goodbye message template')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Message type to customize')
            .setRequired(true)
            .addChoices(
              { name: 'Welcome (on Join)', value: 'welcome' },
              { name: 'Goodbye / Farewell (on Leave)', value: 'leave' }
            )
        )
        .addStringOption(opt =>
          opt.setName('text')
            .setDescription('Template text. Placeholders: {user}, {userName}, {channel}, {members}, {server}')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('tts')
        .setDescription('Toggle Audio TTS Voice Greetings when members join the bot\'s voice channel')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable TTS spoken greetings in voice channel')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === 'status') {
      const settings = db.getVoiceWelcomeSettings(guildId);
      const logChannelDisplay = settings?.log_channel_id ? `<#${settings.log_channel_id}>` : '*Not configured*';

      const modeLabels = {
        vc_chat: '💬 Voice Channel Chat',
        log_channel: '📜 Dedicated Log Channel',
        both: '💬 Voice Chat + 📜 Log Channel'
      };

      const embed = new EmbedBuilder()
        .setTitle('🎙️ Voice Welcome & Goodbye System')
        .setColor(settings?.enabled ? '#10B981' : '#6B7280')
        .addFields(
          { name: '⚡ Status', value: settings?.enabled ? '`🟢 Enabled`' : '`🔴 Disabled`', inline: true },
          { name: '📬 Delivery Mode', value: `\`${modeLabels[settings?.mode] || settings?.mode}\``, inline: true },
          { name: '🔊 Audio TTS in VC', value: settings?.tts_enabled ? '`🟢 Active (Spoken Greetings)`' : '`⚪ Disabled`', inline: true },
          { name: '📜 Log Channel', value: logChannelDisplay, inline: true },
          { name: '⏱️ Duration Tracking', value: settings?.track_duration ? '`🟢 Active (Shows Time in VC on Leave)`' : '`⚪ Disabled`', inline: true },
          { name: '👋 Welcome Message Template', value: `\`${settings?.welcome_message || 'Welcome to {channel}, {user}! 👋'}\`` },
          { name: '👋 Goodbye Message Template', value: `\`${settings?.leave_message || '{user} left {channel}. Hope to see you soon! 👋'}\`` }
        )
        .setFooter({ text: 'Available placeholders: {user}, {userName}, {channel}, {members}, {server}' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'toggle') {
      const enabled = interaction.options.getBoolean('enabled');
      db.saveVoiceWelcomeSettings(guildId, { enabled });

      return interaction.reply({
        embeds: [embeds.success(`Voice Welcome & Goodbye system is now **${enabled ? '🟢 Enabled' : '🔴 Disabled'}**.`)]
      });
    }

    if (subcommand === 'mode') {
      const mode = interaction.options.getString('delivery');
      db.saveVoiceWelcomeSettings(guildId, { mode });

      const modeLabels = {
        vc_chat: 'Voice Channel Text Chat (posts in the active VC)',
        log_channel: 'Dedicated Voice Log Channel',
        both: 'Both Voice Channel Chat and Log Channel'
      };

      return interaction.reply({
        embeds: [embeds.success(`Voice notification delivery mode set to: **${modeLabels[mode]}**.`)]
      });
    }

    if (subcommand === 'logchannel') {
      const channel = interaction.options.getChannel('channel');
      db.saveVoiceWelcomeSettings(guildId, { log_channel_id: channel.id });

      return interaction.reply({
        embeds: [embeds.success(`Dedicated Voice Log channel set to ${channel}.`)]
      });
    }

    if (subcommand === 'message') {
      const type = interaction.options.getString('type');
      const text = interaction.options.getString('text');

      if (type === 'welcome') {
        db.saveVoiceWelcomeSettings(guildId, { welcome_message: text });
        return interaction.reply({
          embeds: [embeds.success(`Voice **Welcome** message updated to:\n> "${text}"`)]
        });
      } else {
        db.saveVoiceWelcomeSettings(guildId, { leave_message: text });
        return interaction.reply({
          embeds: [embeds.success(`Voice **Goodbye / Farewell** message updated to:\n> "${text}"`)]
        });
      }
    }

    if (subcommand === 'tts') {
      const enabled = interaction.options.getBoolean('enabled');
      db.saveVoiceWelcomeSettings(guildId, { tts_enabled: enabled });

      return interaction.reply({
        embeds: [embeds.success(`Voice Audio TTS Greetings in VC are now **${enabled ? '🟢 Enabled' : '🔴 Disabled'}**.\n*(When a user joins the bot\'s voice channel and no music is playing, the bot will speak a voice greeting!)*`)]
      });
    }
  }
};
