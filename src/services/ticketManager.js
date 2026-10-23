const {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const db = require('../database/db');
const config = require('../config');
const embeds = require('../utils/embeds');

class TicketManager {
  static async createTicket(guild, user, reason = 'General Support', department = 'General Support', imageUrl = null) {
    const settings = db.getSettings(guild.id);
    const existingTickets = db.getUserOpenTickets(guild.id, user.id);

    if (existingTickets.length >= 3) {
      throw new Error('You already have 3 open tickets. Please close an existing ticket first.');
    }

    // Prepare permission overwrites
    const permissionOverwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ];

    if (settings.ticket_support_role_id) {
      const supportRole = guild.roles.cache.get(settings.ticket_support_role_id);
      if (supportRole) {
        permissionOverwrites.push({
          id: supportRole.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ManageMessages
          ]
        });
      }
    }

    // Clean username for channel name
    const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);
    const channelName = `ticket-${sanitizedUsername || 'user'}`;

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: settings.ticket_category_id || null,
      permissionOverwrites,
      topic: `[${department}] Support ticket for ${user.tag} (${user.id}) | Reason: ${reason}`
    });

    db.createTicket(guild.id, channel.id, user.id, reason, department);
    if (imageUrl) {
      db.setTicketImage(channel.id, imageUrl);
    }

    const ticketEmbed = new EmbedBuilder()
      .setTimestamp()
      .setFooter({ text: `Ticket ID: ${channel.id} • Upload payment receipts anytime` });

    if (orderData) {
      ticketEmbed
        .setTitle(`🛒 Purchase Order: ${department}`)
        .setColor('#5865F2')
        .setDescription(
          `Welcome ${user}! A staff member will verify and deliver your order shortly.\n\n` +
          `📦 **Product:** \`${department}\`\n` +
          `⏳ **Selected Plan:** \`${orderData.plan || 'Standard'}\`\n` +
          `💳 **Payment Method:** \`${orderData.payment || 'Not specified'}\`\n` +
          `👤 **Client:** <@${user.id}>\n` +
          `🛡️ **Status:** \`Awaiting Staff Details\`\n\n` +
          `**📌 Purchase Steps:**\n` +
          `1. Staff will share the payment QR code or transfer address shortly.\n` +
          `2. After sending payment, click **Attach Screenshot** below to submit your payment proof.\n` +
          `3. Your license key and installation instructions will be provided here!`
        );
    } else {
      ticketEmbed
        .setTitle(`🎫 Support Ticket: ${department}`)
        .setDescription(
          `Welcome ${user}! A member of our support team will assist you shortly.\n\n` +
          `👤 **Opened By:** <@${user.id}>\n` +
          `📂 **Department:** \`${department}\`\n` +
          `📝 **Reason / Details:** ${reason}\n` +
          `🛡️ **Status:** \`Unclaimed\`\n\n` +
          `*Click **Claim Ticket** to assign yourself to this inquiry, or use the management controls below:*`
        )
        .setColor(config.embedColor);
    }

    if (imageUrl) {
      ticketEmbed.setImage(imageUrl);
    }

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Claim Ticket')
        .setEmoji('🙋')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_upload_image')
        .setLabel('Attach Screenshot')
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_lock')
        .setLabel('Lock')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Save Transcript')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_close_request')
        .setLabel('Close Ticket')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger)
    );

    const supportMention = settings.ticket_support_role_id ? `<@&${settings.ticket_support_role_id}> ` : '';
    await channel.send({
      content: `${user} ${supportMention}`,
      embeds: [ticketEmbed],
      components: [row1, row2]
    });

    return channel;
  }

  static async claimTicket(channel, staffMember) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) throw new Error('Ticket not found.');

    if (ticket.claimed_by) {
      if (ticket.claimed_by === staffMember.id) {
        throw new Error('You have already claimed this ticket!');
      }
      throw new Error(`This ticket is already claimed by <@${ticket.claimed_by}>.`);
    }

    db.claimTicket(channel.id, staffMember.id);

    const claimEmbed = new EmbedBuilder()
      .setTitle('🛡️ Ticket Claimed')
      .setDescription(`This ticket has been claimed by **${staffMember.user.tag}** (<@${staffMember.id}>). They will be handling your request!`)
      .setColor(config.successColor)
      .setTimestamp();

    await channel.send({ embeds: [claimEmbed] });
  }

  static async attachImage(channel, imageUrl, uploader) {
    db.setTicketImage(channel.id, imageUrl);

    const embed = new EmbedBuilder()
      .setTitle('🖼️ Screenshot / Image Attached')
      .setDescription(`Uploaded by <@${uploader.id}>`)
      .setImage(imageUrl)
      .setColor(config.embedColor)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  }

  static async generateTranscript(channel) {
    return await discordTranscripts.createTranscript(channel, {
      limit: -1,
      returnType: 'attachment',
      filename: `transcript-${channel.name}.html`,
      saveImages: true,
      footerText: 'Exported {number} message{s}',
      poweredBy: false
    });
  }

  static async toggleLock(channel, member) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) throw new Error('This channel is not an active ticket.');

    const currentPerms = channel.permissionsFor(ticket.user_id);
    const isLocked = !currentPerms || !currentPerms.has(PermissionFlagsBits.SendMessages);

    await channel.permissionOverwrites.edit(ticket.user_id, {
      SendMessages: isLocked
    });

    return !isLocked;
  }

  static async closeTicket(channel, closedByUser) {
    const ticket = db.getTicket(channel.id);
    if (!ticket) throw new Error('This channel is not a recognized ticket.');

    db.closeTicket(channel.id, closedByUser.id);
    const settings = db.getSettings(channel.guild.id);

    // Generate transcript
    let transcriptAttachment = null;
    try {
      transcriptAttachment = await this.generateTranscript(channel);
    } catch (e) {
      console.warn('Could not generate transcript:', e.message);
    }

    // Log to ticket log channel if configured
    if (settings.ticket_log_channel_id) {
      const logChannel = channel.guild.channels.cache.get(settings.ticket_log_channel_id);
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle(`${config.emojis.ticket} Ticket Closed`)
          .setColor(config.errorColor)
          .addFields(
            { name: 'Ticket Name', value: channel.name, inline: true },
            { name: 'Opened By', value: `<@${ticket.user_id}>`, inline: true },
            { name: 'Closed By', value: `<@${closedByUser.id}>`, inline: true },
            { name: 'Department', value: ticket.department || 'General', inline: true },
            { name: 'Claimed By', value: ticket.claimed_by ? `<@${ticket.claimed_by}>` : 'Unclaimed', inline: true },
            { name: 'Reason', value: ticket.reason || 'None provided' },
            { name: 'Duration', value: `<t:${Math.floor(ticket.created_at / 1000)}:R>` }
          )
          .setTimestamp();

        if (ticket.image_url) {
          logEmbed.setImage(ticket.image_url);
        }

        await logChannel.send({
          embeds: [logEmbed],
          files: transcriptAttachment ? [transcriptAttachment] : []
        }).catch(() => null);
      }
    }

    // DM user the transcript
    try {
      const ticketUser = await channel.guild.members.fetch(ticket.user_id).catch(() => null);
      if (ticketUser) {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Your Ticket in ${channel.guild.name} has been closed`)
          .setDescription(`Your ticket \`${channel.name}\` has been resolved and closed by <@${closedByUser.id}>. A copy of the transcript is attached below.`)
          .setColor(config.embedColor)
          .setTimestamp();

        await ticketUser.send({
          embeds: [dmEmbed],
          files: transcriptAttachment ? [transcriptAttachment] : []
        }).catch(() => null);
      }
    } catch (_) {}

    await channel.send({
      embeds: [embeds.warning('This ticket will be deleted in 5 seconds...', 'Ticket Closing')]
    });

    setTimeout(async () => {
      await channel.delete(`Ticket closed by ${closedByUser.tag}`).catch(() => null);
    }, 5000);
  }
}

module.exports = TicketManager;
