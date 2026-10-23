const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');
const db = require('../database/db');
const TicketManager = require('../services/ticketManager');
const MaintenanceManager = require('../services/maintenanceManager');
const musicManager = require('../music/player');
const embeds = require('../utils/embeds');
const config = require('../config');

function renderProgressBar(ratio, totalBlocks = 10) {
  const filled = Math.round(ratio * totalBlocks);
  const empty = totalBlocks - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ==========================================
    // 1. SLASH COMMANDS
    // ==========================================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      const isUnderMaintenance = MaintenanceManager.isUnderMaintenance(interaction.guildId);
      const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

      if (isUnderMaintenance && !isStaff && interaction.commandName !== 'maintenance') {
        const notice = MaintenanceManager.getMaintenanceMessage(interaction.guildId);
        return interaction.reply({
          embeds: [
            embeds.maintenance(
              `${notice}\n\n*Non-administrative commands are temporarily disabled during maintenance.*`
            )
          ],
          ephemeral: true
        });
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        const replyPayload = {
          embeds: [embeds.error(`An unexpected error occurred while executing this command: \`${error.message}\``)],
          ephemeral: true
        };

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp(replyPayload).catch(() => null);
        } else {
          await interaction.reply(replyPayload).catch(() => null);
        }
      }
      return;
    }

    // ==========================================
    // 2. BUTTON INTERACTIONS
    // ==========================================
    if (interaction.isButton()) {
      const { customId } = interaction;

      // --- Ticket Panel: Open General Modal ---
      if (customId === 'create_ticket_btn') {
        const modal = new ModalBuilder()
          .setCustomId('ticket_modal_General Support')
          .setTitle('Open a Support Ticket');

        const reasonInput = new TextInputBuilder()
          .setCustomId('ticket_reason_input')
          .setLabel('What is the reason for this ticket?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Describe your issue or inquiry in detail...')
          .setRequired(true)
          .setMaxLength(500);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }

      // --- In-Ticket: Claim Ticket ---
      if (customId === 'ticket_claim') {
        try {
          await TicketManager.claimTicket(interaction.channel, interaction.member);
          return interaction.reply({
            embeds: [embeds.success(`You have claimed this ticket!`)],
            ephemeral: true
          });
        } catch (err) {
          return interaction.reply({
            embeds: [embeds.error(err.message)],
            ephemeral: true
          });
        }
      }

      // --- In-Ticket: Attach Screenshot Modal ---
      if (customId === 'ticket_upload_image') {
        const modal = new ModalBuilder()
          .setCustomId('ticket_image_modal')
          .setTitle('Attach Screenshot to Ticket');

        const urlInput = new TextInputBuilder()
          .setCustomId('ticket_image_url_input')
          .setLabel('Image / Screenshot URL')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://cdn.discordapp.com/attachments/... or imgur link')
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(urlInput));
        return interaction.showModal(modal);
      }

      // --- In-Ticket: Close Request ---
      if (customId === 'ticket_close_request') {
        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_ticket_close')
            .setLabel('Yes, Close Ticket')
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

      // --- In-Ticket: Confirm Close ---
      if (customId === 'confirm_ticket_close') {
        await interaction.update({
          embeds: [embeds.info('Closing ticket and saving transcript...')],
          components: []
        });

        try {
          await TicketManager.closeTicket(interaction.channel, interaction.user);
        } catch (err) {
          await interaction.followUp({
            embeds: [embeds.error(`Failed to close ticket: ${err.message}`)],
            ephemeral: true
          });
        }
        return;
      }

      // --- In-Ticket: Cancel Close ---
      if (customId === 'cancel_ticket_close') {
        return interaction.message.delete().catch(() => null);
      }

      // --- In-Ticket: Toggle Lock ---
      if (customId === 'ticket_lock') {
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

      // --- In-Ticket: Save Transcript ---
      if (customId === 'ticket_transcript') {
        await interaction.deferReply();
        try {
          const attachment = await TicketManager.generateTranscript(interaction.channel);
          return interaction.editReply({
            embeds: [embeds.success('Ticket transcript saved successfully!')],
            files: [attachment]
          });
        } catch (err) {
          return interaction.editReply({
            embeds: [embeds.error(`Failed to generate transcript: ${err.message}`)]
          });
        }
      }

      // --- Suggestion Voting ---
      if (customId === 'suggest_upvote' || customId === 'suggest_downvote') {
        const isUpvote = customId === 'suggest_upvote';
        const res = db.voteSuggestion(interaction.message.id, interaction.user.id, isUpvote);

        if (!res) {
          return interaction.reply({
            embeds: [embeds.error('This suggestion is no longer open for voting.')],
            ephemeral: true
          });
        }

        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('suggest_upvote')
            .setLabel(`Upvote (${res.upvotes})`)
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('suggest_downvote')
            .setLabel(`Downvote (${res.downvotes})`)
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
        );

        const currentEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        currentEmbed.spliceFields(1, 2,
          { name: '👍 Upvotes', value: `\`${res.upvotes}\``, inline: true },
          { name: '👎 Downvotes', value: `\`${res.downvotes}\``, inline: true }
        );

        await interaction.message.edit({
          embeds: [currentEmbed],
          components: [buttons]
        }).catch(() => null);

        return interaction.reply({
          embeds: [embeds.info(`Your vote has been updated! (Total: 👍 ${res.upvotes} | 👎 ${res.downvotes})`)],
          ephemeral: true
        });
      }

      // --- Button Roles Toggle ---
      if (customId.startsWith('role_btn_')) {
        const btnRole = db.getButtonRole(customId);
        if (!btnRole) {
          return interaction.reply({
            embeds: [embeds.error('This button role is no longer active.')],
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(btnRole.role_id);
        if (!role) {
          return interaction.reply({
            embeds: [embeds.error('Role not found on this server.')],
            ephemeral: true
          });
        }

        const hasRole = interaction.member.roles.cache.has(role.id);
        try {
          if (hasRole) {
            await interaction.member.roles.remove(role);
            return interaction.reply({
              embeds: [embeds.info(`Removed the <@&${role.id}> role from you.`)],
              ephemeral: true
            });
          } else {
            await interaction.member.roles.add(role);
            return interaction.reply({
              embeds: [embeds.success(`Added the <@&${role.id}> role to you!`)],
              ephemeral: true
            });
          }
        } catch (err) {
          return interaction.reply({
            embeds: [embeds.error(`Could not manage role: ${err.message}`)],
            ephemeral: true
          });
        }
      }

      // --- Anti-Raid Member Verification ---
      if (customId === 'btn_verify_member') {
        const verifySettings = db.getVerificationSettings(interaction.guild.id);
        if (!verifySettings || !verifySettings.verified_role_id) {
          return interaction.reply({
            embeds: [embeds.error('Verification role is not configured for this server.')],
            ephemeral: true
          });
        }

        const role = interaction.guild.roles.cache.get(verifySettings.verified_role_id);
        if (!role) {
          return interaction.reply({
            embeds: [embeds.error('Configured verification role no longer exists.')],
            ephemeral: true
          });
        }

        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.reply({
            embeds: [embeds.info('✅ You are already verified on this server!')],
            ephemeral: true
          });
        }

        try {
          await interaction.member.roles.add(role.id, 'Anti-Raid Verification Portal');
          return interaction.reply({
            embeds: [
              embeds.success(`🎉 **Verification Complete!** You have been granted the <@&${role.id}> role. Welcome to **${interaction.guild.name}**!`)
            ],
            ephemeral: true
          });
        } catch (err) {
          return interaction.reply({
            embeds: [embeds.error(`Failed to assign role: ${err.message}`)],
            ephemeral: true
          });
        }
      }

      // --- Poll Voting ---
      if (customId.startsWith('poll_vote_')) {
        const optionIndex = parseInt(customId.replace('poll_vote_', ''), 10);
        const poll = db.votePoll(interaction.message.id, interaction.user.id, optionIndex);

        if (!poll) {
          return interaction.reply({
            embeds: [embeds.error('This poll has ended!')],
            ephemeral: true
          });
        }

        const totalVotes = Object.keys(poll.votes).length;
        const counts = new Array(poll.options.length).fill(0);
        Object.values(poll.votes).forEach(idx => {
          if (counts[idx] !== undefined) counts[idx]++;
        });

        const newDesc = poll.options.map((opt, i) => {
          const voteCount = counts[i];
          const ratio = totalVotes > 0 ? voteCount / totalVotes : 0;
          const pct = Math.round(ratio * 100);
          const bar = renderProgressBar(ratio);
          return `**${i + 1}.** ${opt}\n\`${bar}\` ${pct}% (${voteCount} votes)`;
        }).join('\n\n') + `\n\n**Total Votes:** \`${totalVotes}\``;

        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(newDesc);
        await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => null);

        return interaction.reply({
          embeds: [embeds.info(`You voted for **${poll.options[optionIndex]}**!`)],
          ephemeral: true
        });
      }

      // --- Giveaway Entry ---
      if (customId.startsWith('giveaway_enter_')) {
        const messageId = customId.replace('giveaway_enter_', '');
        const res = db.toggleGiveawayEntry(messageId, interaction.user.id);

        if (!res) {
          return interaction.reply({
            embeds: [embeds.error('This giveaway has already ended!')],
            ephemeral: true
          });
        }

        const gw = db.getGiveaway(messageId);
        const updatedRow = client.giveawayManager.buildGiveawayButton(gw);
        const updatedEmbed = client.giveawayManager.buildGiveawayEmbed(gw);

        await interaction.message.edit({
          embeds: [updatedEmbed],
          components: [updatedRow]
        }).catch(() => null);

        return interaction.reply({
          embeds: [
            embeds.info(
              res.entered
                ? `🎉 You successfully entered the giveaway for **${gw.prize}**! (Total entries: **${res.total}**)`
                : `👋 You left the giveaway for **${gw.prize}**.`
            )
          ],
          ephemeral: true
        });
      }

      // --- Music Controls ---
      if (customId.startsWith('music_')) {
        const queue = musicManager.getQueue(interaction.guildId);
        if (!queue || !queue.currentSong) {
          return interaction.reply({
            embeds: [embeds.error('No music is currently playing!')],
            ephemeral: true
          });
        }

        if (customId === 'music_toggle') {
          if (queue.player.state.status === 'paused') {
            queue.resume();
            return interaction.reply({ embeds: [embeds.success('▶️ Resumed music playback.')], ephemeral: true });
          } else {
            queue.pause();
            return interaction.reply({ embeds: [embeds.info('⏸️ Paused music playback.')], ephemeral: true });
          }
        }

        if (customId === 'music_skip') {
          const title = queue.currentSong.title;
          queue.skip();
          return interaction.reply({ embeds: [embeds.success(`⏭️ Skipped **${title}**`)], ephemeral: true });
        }

        if (customId === 'music_stop') {
          queue.stop();
          return interaction.reply({ embeds: [embeds.success('⏹️ Playback stopped and disconnected.')], ephemeral: true });
        }

        if (customId === 'music_queue') {
          const current = queue.currentSong;
          let desc = `**Now Playing:** [${current.title}](${current.url})\n\n`;
          if (queue.songs.length > 0) {
            desc += `**Up Next (${queue.songs.length}):**\n` +
              queue.songs.slice(0, 5).map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join('\n');
          } else {
            desc += `*Queue is empty.*`;
          }
          return interaction.reply({ embeds: [embeds.info(desc, 'Current Queue')], ephemeral: true });
        }
      }
      return;
    }

    // ==========================================
    // 3. SELECT MENUS
    // ==========================================
    if (interaction.isStringSelectMenu()) {
      // --- Department Select Menu for Tickets ---
      if (interaction.customId === 'ticket_department_select') {
        const selected = interaction.values[0];
        const departmentLabels = {
          dept_general: 'General Support',
          dept_report: 'User Report / Violation',
          dept_billing: 'Billing & Store',
          dept_bug: 'Bug & Technical Issue',
          dept_partner: 'Partnership Inquiry'
        };

        const deptName = departmentLabels[selected] || 'General Support';

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${deptName}`)
          .setTitle(`Ticket: ${deptName.slice(0, 35)}`);

        const reasonInput = new TextInputBuilder()
          .setCustomId('ticket_reason_input')
          .setLabel('Describe your request or issue')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(`Provide details for ${deptName}...`)
          .setRequired(true)
          .setMaxLength(500);

        modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
        return interaction.showModal(modal);
      }

      // --- Product Select Menu for Store / Cheats (Hex Corporation Style) ---
      if (interaction.customId === 'ticket_product_select') {
        const selected = interaction.values[0];
        const productLabels = {
          prod_ultimate: 'Internal Ultimate Cheat',
          prod_basic: 'Internal Basic Cheat',
          prod_emulator: 'Bypass Emulator',
          prod_mobile: 'Android & Ios Cheats',
          prod_support: 'Help & Support'
        };

        const prodName = productLabels[selected] || 'Product Purchase';

        if (selected === 'prod_support') {
          const modal = new ModalBuilder()
            .setCustomId('ticket_modal_Help & Support')
            .setTitle('Help & Support Request');

          const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason_input')
            .setLabel('How can we assist you today?')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe your question or issue in detail...')
            .setRequired(true)
            .setMaxLength(500);

          modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
          return interaction.showModal(modal);
        }

        const modal = new ModalBuilder()
          .setCustomId(`ticket_product_order_${prodName}`)
          .setTitle(`Order: ${prodName.slice(0, 35)}`);

        const planInput = new TextInputBuilder()
          .setCustomId('order_plan')
          .setLabel('Choose Plan / Key Duration')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 1 Day / 7 Days / 30 Days / Lifetime')
          .setRequired(true);

        const paymentInput = new TextInputBuilder()
          .setCustomId('order_payment')
          .setLabel('Preferred Payment Method')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. UPI, Crypto (LTC/USDT), PayPal, Card')
          .setRequired(true);

        const notesInput = new TextInputBuilder()
          .setCustomId('order_notes')
          .setLabel('Any extra questions or device details?')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('e.g. Android 13, Windows 11 64-bit, etc. (Optional)')
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(planInput),
          new ActionRowBuilder().addComponents(paymentInput),
          new ActionRowBuilder().addComponents(notesInput)
        );

        return interaction.showModal(modal);
      }

      // --- Help Categories ---
      if (interaction.customId === 'help_category_select') {
        const selected = interaction.values[0];
        let embed;

        switch (selected) {
          case 'help_tickets':
            embed = new EmbedBuilder()
              .setTitle('🎫 Ticket System & Control Commands')
              .setColor(config.embedColor)
              .setDescription(
                '`/ticket-setup product-panel` - Deploy Hex Corporation style product purchase dropdown panel\n' +
                '`/ticket-setup support-panel` - Deploy multi-department support desk\n' +
                '`/ticket list` - View all open tickets across the server with priority & duration\n' +
                '`/ticket claim` - Claim ticket as the assigned moderator\n' +
                '`/ticket transfer <staff>` - Reassign/transfer handling staff member\n' +
                '`/ticket priority <level>` - Set urgency level (🟢 Low, 🟡 Medium, 🟠 High, 🔴 Urgent)\n' +
                '`/ticket rename <name>` - Rename ticket channel\n' +
                '`/ticket alert [note]` - Ping the ticket creator with an attention notice\n' +
                '`/ticket close` - Close and archive ticket with transcript\n' +
                '`/ticket transcript` - Download HTML transcript of the ticket\n' +
                '`/ticket image <file>` - Upload screenshot or proof image\n' +
                '`/ticket lock` - Toggle lock/unlock on ticket messaging\n' +
                '`/ticket add/remove <member>` - Add or remove member from ticket\n' +
                '💡 *You can also manage, lock, and close tickets live from the Web Control Dashboard!*'
              );
            break;
          case 'help_security':
            embed = new EmbedBuilder()
              .setTitle('🛡️ Anti-Nuke Defender & Server Protection')
              .setColor(config.embedColor)
              .setDescription(
                '**Anti-Nuke Raid Defender:**\n' +
                '• `/antinuke status` - Check defender health, thresholds, and recent alerts\n' +
                '• `/antinuke toggle <enabled>` - Turn Anti-Nuke defender ON or OFF\n' +
                '• `/antinuke setlimit <category> <limit>` - Set action limit per 10s (Channels, Bans, Roles)\n' +
                '• `/antinuke punishment <ban|kick|strip_roles>` - Action executed upon rate limit breach\n' +
                '• `/antinuke whitelist add/remove/list` - Manage trusted administrators exempt from limits\n' +
                '• `/antinuke logchannel <channel>` - Channel for emergency security pings\n' +
                '• `/antinuke logs` - View last 10 intercepted raid/nuke incidents\n\n' +
                '**Anti-Raid Verification:**\n' +
                '• `/verify-setup <channel> <role>` - Deploy interactive verification button portal\n\n' +
                '**Disaster Recovery Backups:**\n' +
                '• `/backup create [name]` - Snapshot all channels, categories, and roles into SQLite\n' +
                '• `/backup list` - View all saved server backups\n' +
                '• `/backup info <id>` - Inspect stored snapshot metadata\n' +
                '• `/backup delete <id>` - Delete a backup'
              );
            break;
          case 'help_membercount':
            embed = new EmbedBuilder()
              .setTitle('📊 Member Counters')
              .setColor(config.embedColor)
              .setDescription(
                '`/membercount setup [goal]` - Automatically deploy live voice counter channels (`Total`, `Members`, `Bots`, `Online`, `Boosts`, `Goal`)\n' +
                '`/membercount setgoal <number>` - Update your server milestone member goal\n' +
                '`/membercount refresh` - Force immediate refresh of counter channels\n' +
                '`/serverstats setup` - Classic 3-channel server stats'
              );
            break;
          case 'help_suggestions':
            embed = new EmbedBuilder()
              .setTitle('💡 Suggestions System')
              .setColor(config.embedColor)
              .setDescription(
                '`/suggest <idea> [screenshot]` - Submit a community suggestion with optional screenshot\n' +
                '`/suggestion-setup <channel>` - Configure the feed channel where suggestions are posted\n' +
                '`/suggestion-review <id> <status> [comment]` - Approve, reject, or mark a suggestion as implemented'
              );
            break;
          case 'help_buttonroles':
            embed = new EmbedBuilder()
              .setTitle('🎭 Button Roles')
              .setColor(config.embedColor)
              .setDescription(
                '`/buttonroles <channel> <title> <desc> <role1> <label1> [role2] [role3]` - Deploy interactive self-assignable role buttons'
              );
            break;
          case 'help_polls':
            embed = new EmbedBuilder()
              .setTitle('📊 Community Polls')
              .setColor(config.embedColor)
              .setDescription(
                '`/poll <question> <option1> <option2> [opt3] [opt4] [duration]` - Launch a community poll with live visual progress bars'
              );
            break;
          case 'help_levels':
            embed = new EmbedBuilder()
              .setTitle('⭐ Leveling & XP System')
              .setColor(config.embedColor)
              .setDescription(
                '`/rank [target]` - View your level, XP, and visual rank progress bar\n' +
                '`/leaderboard` - View top 10 most active members on the server'
              );
            break;
          case 'help_maintainer':
            embed = new EmbedBuilder()
              .setTitle('🔧 Maintainer, Posts & Announcements')
              .setColor(config.embedColor)
              .setDescription(
                '`/announce post` - Create announcements with direct image file upload, category badges, and link buttons\n' +
                '`/announce changelog` - Post structured patch notes with version, features, and bug fixes\n' +
                '`/embed` - Custom styled embed builder with device image/thumbnail uploads\n' +
                '`/maintenance toggle/status/lockdown` - Toggle server maintenance mode and channel lockdowns'
              );
            break;
          case 'help_music':
            embed = new EmbedBuilder()
              .setTitle('🎵 Music & 24/7 Voice Channel System')
              .setColor(config.embedColor)
              .setDescription(
                '**24/7 Voice Channel Stay:**\n' +
                '• `/voice-247 enable [channel] [deafen]` - Lock bot into voice channel 24/7 with auto-reconnect\n' +
                '• `/voice-247 disable` - Disable 24/7 stay and leave channel\n' +
                '• `/voice-247 status` - Check 24/7 connection health and channel\n\n' +
                '**Voice Welcome & Farewell System:**\n' +
                '• `/voice-welcome status` - View voice join/leave notification config\n' +
                '• `/voice-welcome toggle <enabled>` - Turn voice join/leave notifications on/off\n' +
                '• `/voice-welcome mode <vc_chat|log_channel|both>` - Choose where alerts are posted\n' +
                '• `/voice-welcome logchannel <channel>` - Dedicated channel for voice logs\n' +
                '• `/voice-welcome message <welcome|leave> <text>` - Custom templates\n' +
                '• `/voice-welcome tts <enabled>` - Audio spoken greetings in VC\n\n' +
                '**Music Player:**\n' +
                '• `/play <query/url>` - Play song in your voice channel\n' +
                '• `/pause` - Pause audio playback\n' +
                '• `/resume` - Resume paused playback\n' +
                '• `/skip` - Skip current track\n' +
                '• `/stop` - Clear queue and stop playback\n' +
                '• `/queue` - Display active song queue\n' +
                '• `/nowplaying` - Show current track and interactive buttons\n' +
                '• `/volume <1-150>` - Adjust music loudness\n' +
                '• `/join` & `/leave` - Voice channel summon/disconnect'
              );
            break;
          case 'help_cleaner':
            embed = new EmbedBuilder()
              .setTitle('🧹 Chat & Message Cleaner Suite')
              .setColor(config.embedColor)
              .setDescription(
                '**Advanced Message Purge & Filters:**\n' +
                '• `/clear messages <amount> [user]` - Purge messages, optionally from specific user\n' +
                '• `/clear bots <amount>` - Remove bot & webhook messages\n' +
                '• `/clear humans <amount>` - Remove human member messages only\n' +
                '• `/clear links <amount>` - Wipe messages containing URLs/links\n' +
                '• `/clear invites <amount>` - Clean Discord server invite links\n' +
                '• `/clear images <amount>` - Purge image attachments & embeds\n' +
                '• `/clear text <amount> <keyword>` - Remove messages containing specific phrase\n\n' +
                '**Channel Chat Control:**\n' +
                '• `/nuke` - Complete channel wipe & reset with GIF (bypasses 14-day limit!)\n' +
                '• `/slowmode <seconds> [channel]` - Set rate limit per user (0s to 6h)\n' +
                '• `/lock [channel] [reason]` - Freeze channel messaging for @everyone\n' +
                '• `/unlock [channel]` - Unfreeze channel messaging for @everyone\n' +
                '• `/autoclean set <channel> <minutes>` - Auto-delete incoming messages after X mins\n' +
                '• `/autoclean remove <channel>` - Disable auto-clean on a channel\n' +
                '• `/autoclean list` - View all active auto-clean channels'
              );
            break;
          case 'help_moderation':
            embed = new EmbedBuilder()
              .setTitle('🛡️ Moderation & Automod')
              .setColor(config.embedColor)
              .setDescription(
                '`/warn <user> <reason>` - Issue official warning to user\n' +
                '`/warnings <user>` - View all warnings on user\n' +
                '`/clearwarns <user>` - Clear user warnings\n' +
                '`/timeout <user> <duration>` - Timeout user (e.g., 5m, 1h, 1d)\n' +
                '`/untimeout <user>` - Remove user timeout\n' +
                '`/kick <user> [reason]` - Kick user from server\n' +
                '`/ban <user> [reason]` - Ban user from server\n' +
                '`/unban <userid>` - Unban user by ID\n' +
                '`/modlog-setup` - Configure channel for moderation action logs\n' +
                '`/automod status/toggle/words` - Manage anti-link, anti-spam, and bad word filters\n' +
                '`/clear` & `/nuke` - For message purging & chat controls, select **Chat & Message Cleaner**'
              );
            break;
          case 'help_giveaways':
            embed = new EmbedBuilder()
              .setTitle('🎉 Giveaways')
              .setColor(config.embedColor)
              .setDescription(
                '`/giveaway start <prize> <duration> [winners]` - Start interactive giveaway\n' +
                '`/giveaway end <message-id>` - End giveaway immediately and pick winners\n' +
                '`/giveaway reroll <message-id>` - Pick a new winner for an ended giveaway'
              );
            break;
          default:
            embed = new EmbedBuilder()
              .setTitle('🛠️ Server Maintainer Bot • Help Hub')
              .setColor(config.embedColor)
              .setDescription('Select a category from the dropdown menu to inspect its commands.');
            break;
        }

        embed.setTimestamp();
        await interaction.update({ embeds: [embed] });
      }
    }

    // ==========================================
    // 4. MODAL SUBMISSIONS
    // ==========================================
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_modal_')) {
        const department = interaction.customId.replace('ticket_modal_', '') || 'General Support';
        const reason = interaction.fields.getTextInputValue('ticket_reason_input');
        await interaction.deferReply({ ephemeral: true });

        try {
          const channel = await TicketManager.createTicket(interaction.guild, interaction.user, reason, department);
          return interaction.editReply({
            embeds: [embeds.success(`Your [${department}] ticket channel has been created: ${channel}! Please head over there.`)]
          });
        } catch (err) {
          return interaction.editReply({
            embeds: [embeds.error(err.message)]
          });
        }
      }

      if (interaction.customId === 'ticket_image_modal') {
        const url = interaction.fields.getTextInputValue('ticket_image_url_input');
        await interaction.deferReply({ ephemeral: true });

        try {
          await TicketManager.attachImage(interaction.channel, url, interaction.user);
          return interaction.editReply({
            embeds: [embeds.success('Screenshot successfully attached to this ticket!')]
          });
        } catch (err) {
          return interaction.editReply({
            embeds: [embeds.error(err.message)]
          });
        }
      }

      if (interaction.customId.startsWith('ticket_product_order_')) {
        const prodName = interaction.customId.replace('ticket_product_order_', '') || 'Product Purchase';
        const plan = interaction.fields.getTextInputValue('order_plan');
        const payment = interaction.fields.getTextInputValue('order_payment');
        const notes = interaction.fields.getTextInputValue('order_notes') || '';
        await interaction.deferReply({ ephemeral: true });

        try {
          const reason = `Order: ${prodName} | Plan: ${plan} | Payment: ${payment}${notes ? ` | Notes: ${notes}` : ''}`;
          const channel = await TicketManager.createTicket(
            interaction.guild,
            interaction.user,
            reason,
            prodName,
            null,
            { plan, payment, notes }
          );

          return interaction.editReply({
            embeds: [embeds.success(`Your purchase order ticket for **${prodName}** has been created: ${channel}!`)]
          });
        } catch (err) {
          return interaction.editReply({
            embeds: [embeds.error(err.message)]
          });
        }
      }
    }
  }
};
