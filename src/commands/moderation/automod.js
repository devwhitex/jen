const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const db = require('../../database/db');
const config = require('../../config');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure automatic moderation filters (anti-link, anti-spam, bad words)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('View current automod settings and active filters')
    )
    .addSubcommand(sub =>
      sub.setName('toggle')
        .setDescription('Toggle an automod filter on or off')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Which feature to toggle')
            .addChoices(
              { name: 'Anti-Invite / Anti-Links', value: 'automod_links' },
              { name: 'Anti-Spam Rate Limiter', value: 'automod_spam' },
              { name: 'Bad Words Filter', value: 'automod_badwords' }
            )
            .setRequired(true)
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('True to enable, False to disable')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('words')
        .setDescription('Add or remove a phrase from the bad words blacklist')
        .addStringOption(opt =>
          opt.setName('action')
            .setDescription('Add or remove')
            .addChoices(
              { name: 'Add Word', value: 'add' },
              { name: 'Remove Word', value: 'remove' }
            )
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('phrase')
            .setDescription('The word or phrase to add or remove')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const settings = db.getSettings(interaction.guild.id);

    if (sub === 'status') {
      const wordsList = settings.badwords_list ? settings.badwords_list.split(',').join(', ') : 'None';
      const embed = new EmbedBuilder()
        .setTitle('🛡️ Automod Protection Status')
        .setColor(config.embedColor)
        .addFields(
          {
            name: '🔗 Anti-Invite / Links',
            value: settings.automod_links ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '⚡ Anti-Spam (Rate Limit)',
            value: settings.automod_spam ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '🤬 Bad Words Filter',
            value: settings.automod_badwords ? '✅ Enabled' : '❌ Disabled',
            inline: true
          },
          {
            name: '🚫 Blacklisted Words / Phishes',
            value: wordsList.length > 1000 ? `${wordsList.slice(0, 1000)}...` : wordsList,
            inline: false
          }
        )
        .setFooter({ text: 'Use /automod toggle to enable or disable features' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'toggle') {
      const feature = interaction.options.getString('feature');
      const enabled = interaction.options.getBoolean('enabled');

      db.updateSetting(interaction.guild.id, feature, enabled ? 1 : 0);

      const labels = {
        automod_links: 'Anti-Invite & Malicious Links',
        automod_spam: 'Anti-Spam Rate Limiter',
        automod_badwords: 'Bad Words Filter'
      };

      return interaction.reply({
        embeds: [
          embeds.success(
            `Automod **${labels[feature]}** is now **${enabled ? 'ENABLED' : 'DISABLED'}**.`
          )
        ]
      });
    }

    if (sub === 'words') {
      const action = interaction.options.getString('action');
      const phrase = interaction.options.getString('phrase').toLowerCase().trim();

      let currentWords = settings.badwords_list ? settings.badwords_list.split(',') : [];

      if (action === 'add') {
        if (!currentWords.includes(phrase)) {
          currentWords.push(phrase);
          db.updateSetting(interaction.guild.id, 'badwords_list', currentWords.join(','));
          return interaction.reply({
            embeds: [embeds.success(`Added \`${phrase}\` to the bad words list.`)]
          });
        } else {
          return interaction.reply({
            embeds: [embeds.info(`\`${phrase}\` is already in the list.`)],
            ephemeral: true
          });
        }
      } else {
        currentWords = currentWords.filter(w => w !== phrase);
        db.updateSetting(interaction.guild.id, 'badwords_list', currentWords.join(','));
        return interaction.reply({
          embeds: [embeds.success(`Removed \`${phrase}\` from the bad words list.`)]
        });
      }
    }
  }
};
