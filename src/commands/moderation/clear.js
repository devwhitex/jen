const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Advanced message cleaner with specialized chat filters')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub.setName('messages')
        .setDescription('Purge recent messages (optionally from a specific member)')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to delete (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
        .addUserOption(opt =>
          opt.setName('user')
            .setDescription('Only delete messages from this user')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('bots')
        .setDescription('Delete only messages sent by bots (e.g. music/command spam)')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('humans')
        .setDescription('Delete only messages sent by human users (keep bot messages)')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('links')
        .setDescription('Delete only messages containing web links (http:// or https://)')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('invites')
        .setDescription('Delete only messages containing Discord invite links')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('images')
        .setDescription('Delete only messages containing uploaded images, videos, or files')
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('text')
        .setDescription('Delete messages containing a specific keyword or phrase')
        .addStringOption(opt =>
          opt.setName('keyword')
            .setDescription('Keyword to search and delete')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('amount')
            .setDescription('Number of messages to scan (1 to 100)')
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    await interaction.deferReply({ ephemeral: true });

    try {
      const fetched = await interaction.channel.messages.fetch({ limit: amount });
      let messagesToDelete = fetched;

      if (sub === 'messages') {
        const filterUser = interaction.options.getUser('user');
        if (filterUser) {
          messagesToDelete = fetched.filter(m => m.author.id === filterUser.id);
        }
      } else if (sub === 'bots') {
        messagesToDelete = fetched.filter(m => m.author.bot);
      } else if (sub === 'humans') {
        messagesToDelete = fetched.filter(m => !m.author.bot);
      } else if (sub === 'links') {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        messagesToDelete = fetched.filter(m => linkRegex.test(m.content));
      } else if (sub === 'invites') {
        const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/gi;
        messagesToDelete = fetched.filter(m => inviteRegex.test(m.content));
      } else if (sub === 'images') {
        messagesToDelete = fetched.filter(m => m.attachments.size > 0);
      } else if (sub === 'text') {
        const keyword = interaction.options.getString('keyword').toLowerCase();
        messagesToDelete = fetched.filter(m => m.content.toLowerCase().includes(keyword));
      }

      if (messagesToDelete.size === 0) {
        return interaction.editReply({
          embeds: [embeds.info('No matching messages found to delete.')]
        });
      }

      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true);

      return interaction.editReply({
        embeds: [
          embeds.success(
            `🧹 Successfully purged **${deleted.size}** message(s) [Filter: \`${sub.toUpperCase()}\`].\n` +
            `*(Note: Discord restricts deleting messages older than 14 days. Use \`/nuke\` for full reset)*`
          )
        ]
      });
    } catch (err) {
      return interaction.editReply({
        embeds: [embeds.error(`Failed to clean messages: ${err.message}`)]
      });
    }
  }
};
