const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const db = require('../../database/db');
const TicketManager = require('../../services/ticketManager');
const embeds = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Comprehensive ticket management and moderation controls')
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all currently active open tickets on the server')
    )
    .addSubcommand(sub =>
      sub.setName('close')
        .setDescription('Close and archive this ticket')
    )
    .addSubcommand(sub =>
      sub.setName('claim')
        .setDescription('Claim this ticket as the handling moderator')
    )
    .addSubcommand(sub =>
      sub.setName('transfer')
        .setDescription('Transfer this ticket to another staff member')
        .addUserOption(opt =>
          opt.setName('staff')
            .setDescription('New staff member handling the ticket')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('priority')
        .setDescription('Set ticket priority level')
        .addStringOption(opt =>
          opt.setName('level')
            .setDescription('Priority urgency')
            .setRequired(true)
            .addChoices(
              { name: '🟢 Low', value: 'Low' },
              { name: '🟡 Medium', value: 'Medium' },
              { name: '🟠 High', value: 'High' },
              { name: '🔴 Urgent', value: 'Urgent' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('rename')
        .setDescription('Rename the ticket channel')
        .addStringOption(opt =>
          opt.setName('name')
            .setDescription('New channel name')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('alert')
        .setDescription('Send an urgent reminder ping to the ticket creator')
        .addStringOption(opt =>
          opt.setName('note')
            .setDescription('Optional message note to the ticket creator')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('image')
        .setDescription('Upload a screenshot or proof image directly into this ticket')
        .addAttachmentOption(opt =>
          opt.setName('file')
            .setDescription('Image file to attach')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('transcript')
        .setDescription('Generate and save an HTML transcript of this ticket')
    )
    .addSubcommand(sub =>
      sub.setName('lock')
        .setDescription('Toggle lock/unlock on this ticket to mute/unmute the ticket creator')
    )
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a member to this ticket channel')
        .addUserOption(opt =>
          opt.setName('member')
            .setDescription('Member to add')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a member from this ticket channel')
        .addUserOption(opt =>
          opt.setName('member')
            .setDescription('Member to remove')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // 1. List active tickets across the server (usable anywhere)
    if (sub === 'list') {
      const tickets = db.getAllOpenTickets(interaction.guild.id);

      if (tickets.length === 0) {
        return interaction.reply({
          embeds: [embeds.info('There are currently no open tickets on this server! All inquiries resolved.')]
        });
      }

      const priorityEmojis = {
        'Low': '🟢',
        'Medium': '🟡',
        'High': '🟠',
        'Urgent': '🔴'
      };

      const embed = new EmbedBuilder()
        .setTitle(`🎫 Active Support Tickets • ${interaction.guild.name}`)
        .setColor(config.embedColor)
        .setDescription(
          tickets.map(t => {
            const pEmoji = priorityEmojis[t.priority] || '🟡';
            const claimed = t.claimed_by ? `<@${t.claimed_by}>` : '*Unclaimed*';
            return `• <#${t.channel_id}> [${pEmoji} \`${t.priority || 'Medium'}\`]\n  **Department:** \`${t.department || 'General'}\` | **Owner:** <@${t.user_id}>\n  **Claimed:** ${claimed} | **Opened:** <t:${Math.floor(t.created_at / 1000)}:R>`;
          }).join('\n\n')
        )
        .setFooter({ text: `Total Open Tickets: ${tickets.length}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // Require active ticket channel for all other subcommands
    const ticket = db.getTicket(interaction.channel.id);
    if (!ticket) {
      return interaction.reply({
        embeds: [embeds.error('This command can only be used inside an active ticket channel!')],
        ephemeral: true
      });
    }

    if (sub === 'claim') {
      try {
        await TicketManager.claimTicket(interaction.channel, interaction.member);
        return interaction.reply({
          embeds: [embeds.success(`You have claimed this ticket as the handling staff!`)]
        });
      } catch (err) {
        return interaction.reply({
          embeds: [embeds.error(err.message)],
          ephemeral: true
        });
      }
    }

    if (sub === 'transfer') {
      const targetStaff = interaction.options.getUser('staff');
      db.claimTicket(targetStaff.id, interaction.channel.id);

      return interaction.reply({
        embeds: [embeds.success(`Ticket handling has been transferred to <@${targetStaff.id}>!`)]
      });
    }

    if (sub === 'priority') {
      const level = interaction.options.getString('level');
      db.setTicketPriority(interaction.channel.id, level);

      const colorMap = {
        'Low': '#57F287',
        'Medium': '#FEE75C',
        'High': '#E67E22',
        'Urgent': '#ED4245'
      };

      const embed = new EmbedBuilder()
        .setTitle('📌 Ticket Priority Updated')
        .setDescription(`This ticket has been marked as **${level.toUpperCase()}** priority by <@${interaction.user.id}>.`)
        .setColor(colorMap[level] || config.embedColor)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'rename') {
      const newName = interaction.options.getString('name').toLowerCase().replace(/\s+/g, '-');
      await interaction.channel.setName(newName).catch(err => {
        return interaction.reply({ embeds: [embeds.error(`Failed to rename: ${err.message}`)], ephemeral: true });
      });

      return interaction.reply({
        embeds: [embeds.success(`Channel renamed to \`#${newName}\`!`)]
      });
    }

    if (sub === 'alert') {
      const note = interaction.options.getString('note');
      return interaction.reply({
        content: `🔔 <@${ticket.user_id}>, our support staff is waiting for your response!`,
        embeds: [
          embeds.warning(
            note || 'Please check this ticket and reply with the requested information so we can assist you.',
            'Attention Required'
          )
        ]
      });
    }

    if (sub === 'image') {
      const file = interaction.options.getAttachment('file');
      if (!file.contentType?.startsWith('image/')) {
        return interaction.reply({
          embeds: [embeds.error('Please upload a valid image file (PNG, JPG, WEBP, GIF).')],
          ephemeral: true
        });
      }

      await TicketManager.attachImage(interaction.channel, file.url, interaction.user);
      return interaction.reply({
        embeds: [embeds.success('Image successfully attached to the ticket record!')],
        ephemeral: true
      });
    }

    if (sub === 'close') {
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_ticket_close')
          .setLabel('Yes, Close')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId('cancel_ticket_close')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        embeds: [embeds.warning('Are you sure you want to close and archive this ticket?', 'Close Confirmation')],
        components: [confirmRow]
      });
    }

    if (sub === 'transcript') {
      await interaction.deferReply();
      try {
        const attachment = await TicketManager.generateTranscript(interaction.channel);
        return interaction.editReply({
          embeds: [embeds.success('Ticket transcript generated successfully!')],
          files: [attachment]
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [embeds.error(`Failed to generate transcript: ${err.message}`)]
        });
      }
    }

    if (sub === 'lock') {
      try {
        const isLocked = await TicketManager.toggleLock(interaction.channel, interaction.member);
        return interaction.reply({
          embeds: [
            embeds.info(
              isLocked
                ? '🔒 **Ticket Locked:** The ticket owner can no longer send messages.'
                : '🔓 **Ticket Unlocked:** The ticket owner can send messages again.'
            )
          ]
        });
      } catch (err) {
        return interaction.reply({
          embeds: [embeds.error(err.message)],
          ephemeral: true
        });
      }
    }

    if (sub === 'add') {
      const target = interaction.options.getUser('member');
      await interaction.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true
      });

      return interaction.reply({
        embeds: [embeds.success(`Added <@${target.id}> to this ticket.`)]
      });
    }

    if (sub === 'remove') {
      const target = interaction.options.getUser('member');
      if (target.id === ticket.user_id) {
        return interaction.reply({
          embeds: [embeds.error('You cannot remove the ticket creator from their own ticket!')],
          ephemeral: true
        });
      }

      await interaction.channel.permissionOverwrites.delete(target.id);
      return interaction.reply({
        embeds: [embeds.success(`Removed <@${target.id}> from this ticket.`)]
      });
    }
  }
};
