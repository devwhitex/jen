const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} = require('discord.js');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Explore all bot modules, commands, and maintainer features'),

  async execute(interaction) {
    const mainEmbed = new EmbedBuilder()
      .setTitle('🛠️ Server Maintainer Bot • Help Hub')
      .setDescription(
        `Welcome to **Server Maintainer Bot**! This bot is equipped with everything you need to manage, protect, and entertain your Discord community.\n\n` +
        `**Select a category from the dropdown menu below** to view detailed commands and usage:`
      )
      .addFields(
        { name: '🎫 Tickets', value: 'Interactive department menus, image uploads, transcripts & claiming', inline: true },
        { name: '📊 Member Counters', value: 'Live voice counters for Total, Humans, Bots, Online, Boosts & Goal', inline: true },
        { name: '💡 Suggestions', value: 'Community suggestion board with live 👍/👎 voting & staff reviews', inline: true },
        { name: '🎭 Button Roles', value: 'Self-assignable role panels with interactive buttons', inline: true },
        { name: '📊 Community Polls', value: 'Live button voting with visual progress bars and percentages', inline: true },
        { name: '⭐ Leveling & XP', value: 'Chat activity XP, visual rank progress card, and top 10 leaderboard', inline: true },
        { name: '📢 Announcements & Embeds', value: 'Direct image file uploads, changelogs, badges & link buttons', inline: true },
        { name: '🎵 Voice Hub & 24/7 Music', value: '24/7 VC Stay, Voice Welcome/Goodbye alerts, TTS greetings, and music', inline: true },
        { name: '🧹 Chat & Cleaner', value: 'Advanced purge filters, /nuke, /slowmode, /lock & timed /autoclean', inline: true },
        { name: '🛡️ Anti-Nuke & Security', value: 'Anti-nuke defender, /backup snapshots, and /verify-setup', inline: true },
        { name: '🛡️ Moderation & Automod', value: 'Warns, timeouts, kicks, bans, mod logs & anti-spam/links', inline: true },
        { name: '🎉 Giveaways', value: 'Button entry, live countdowns & automated winner rerolls', inline: true }
      )
      .setColor(config.embedColor)
      .setFooter({ text: 'Select a category below to view specific commands' })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Choose a feature category...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Overview')
          .setValue('help_overview')
          .setDescription('Back to main overview')
          .setEmoji('🏠'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Ticket System')
          .setValue('help_tickets')
          .setDescription('Ticket setup, claiming, screenshots, priority, and list')
          .setEmoji('🎫'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Anti-Nuke & Server Defender')
          .setValue('help_security')
          .setDescription('Raid defense, /antinuke, /backup snapshots, /verify-setup')
          .setEmoji('🛡️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Member Counters')
          .setValue('help_membercount')
          .setDescription('Live auto-updating voice counter channels')
          .setEmoji('📊'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Suggestions System')
          .setValue('help_suggestions')
          .setDescription('Submit, vote, and review community ideas')
          .setEmoji('💡'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Button Roles')
          .setValue('help_buttonroles')
          .setDescription('Self-assignable roles with interactive buttons')
          .setEmoji('🎭'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Community Polls')
          .setValue('help_polls')
          .setDescription('Interactive button polls with visual bar charts')
          .setEmoji('📊'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Leveling & XP')
          .setValue('help_levels')
          .setDescription('Rank progress cards and server leaderboard')
          .setEmoji('⭐'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Announcements & Maintainer')
          .setValue('help_maintainer')
          .setDescription('Announcements with direct images, changelogs, embeds')
          .setEmoji('📢'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Music Player')
          .setValue('help_music')
          .setDescription('Audio streaming, queue, and player buttons')
          .setEmoji('🎵'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Chat & Message Cleaner')
          .setValue('help_cleaner')
          .setDescription('Purge filters, /nuke, /slowmode, /lock, /unlock, auto-clean')
          .setEmoji('🧹'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Moderation & Automod')
          .setValue('help_moderation')
          .setDescription('Warn, timeout, kick, ban, automod filters')
          .setEmoji('⚖️'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Giveaways')
          .setValue('help_giveaways')
          .setDescription('Host giveaways, button entry, and reroll')
          .setEmoji('🎉')
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [mainEmbed],
      components: [row]
    });
  }
};
