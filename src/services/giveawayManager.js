const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const db = require('../database/db');
const config = require('../config');

class GiveawayManager {
  constructor(client) {
    this.client = client;
    this.timer = null;
  }

  startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.checkGiveaways(), 5000);
  }

  stopLoop() {
    if (this.timer) clearInterval(this.timer);
  }

  buildGiveawayEmbed(giveaway, isEnded = false, winners = []) {
    const embed = new EmbedBuilder()
      .setTitle(`🎉 GIVEAWAY: ${giveaway.prize}`)
      .setColor(isEnded ? config.errorColor : config.embedColor)
      .setTimestamp(new Date(giveaway.ends_at));

    if (isEnded) {
      const winnerString = winners.length > 0 
        ? winners.map(w => `<@${w}>`).join(', ') 
        : 'No valid entrants';

      embed.setDescription(
        `**Hosted By:** <@${giveaway.hosted_by}>\n` +
        `**Status:** Ended\n` +
        `**Winner(s):** ${winnerString}\n` +
        `**Total Entries:** ${giveaway.entries.length}`
      );
      embed.setFooter({ text: 'Giveaway Ended' });
    } else {
      embed.setDescription(
        `Click the button below to enter!\n\n` +
        `🎁 **Prize:** ${giveaway.prize}\n` +
        `👑 **Hosted By:** <@${giveaway.hosted_by}>\n` +
        `🏆 **Winners:** ${giveaway.winners_count}\n` +
        `⏳ **Ends:** <t:${Math.floor(giveaway.ends_at / 1000)}:R> (<t:${Math.floor(giveaway.ends_at / 1000)}:f>)\n` +
        `👥 **Entries:** **${giveaway.entries.length}**`
      );
      embed.setFooter({ text: `Ends at` });
    }

    return embed;
  }

  buildGiveawayButton(giveaway, isEnded = false) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${giveaway.message_id}`)
        .setLabel(`Enter (${giveaway.entries.length})`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🎉')
        .setDisabled(isEnded)
    );
    return row;
  }

  async checkGiveaways() {
    const active = db.getActiveGiveaways();
    const now = Date.now();

    for (const gw of active) {
      if (now >= gw.ends_at) {
        await this.resolveGiveaway(gw);
      }
    }
  }

  async resolveGiveaway(gw) {
    db.endGiveaway(gw.message_id);

    try {
      const channel = await this.client.channels.fetch(gw.channel_id).catch(() => null);
      if (!channel) return;

      const message = await channel.messages.fetch(gw.message_id).catch(() => null);
      if (!message) return;

      const entries = gw.entries;
      const winners = [];

      if (entries.length > 0) {
        const pool = [...entries];
        const count = Math.min(gw.winners_count, pool.length);
        for (let i = 0; i < count; i++) {
          const randomIndex = Math.floor(Math.random() * pool.length);
          winners.push(pool.splice(randomIndex, 1)[0]);
        }
      }

      const endEmbed = this.buildGiveawayEmbed(gw, true, winners);
      const disabledButton = this.buildGiveawayButton(gw, true);

      await message.edit({ embeds: [endEmbed], components: [disabledButton] });

      if (winners.length > 0) {
        const winnerMentions = winners.map(w => `<@${w}>`).join(' ');
        await channel.send({
          content: `🎉 Congratulations ${winnerMentions}! You won **${gw.prize}**!\nHosted by <@${gw.hosted_by}>.`
        });
      } else {
        await channel.send({
          content: `⚠️ Giveaway for **${gw.prize}** ended, but there were no valid entries!`
        });
      }
    } catch (err) {
      console.error(`Error resolving giveaway ${gw.message_id}:`, err);
    }
  }

  async reroll(messageId) {
    const gw = db.getGiveaway(messageId);
    if (!gw) return { success: false, message: 'Giveaway not found in database.' };
    if (!gw.ended) return { success: false, message: 'This giveaway is still active and has not ended yet.' };
    if (!gw.entries || gw.entries.length === 0) return { success: false, message: 'No entries to reroll from.' };

    const randomIndex = Math.floor(Math.random() * gw.entries.length);
    const newWinner = gw.entries[randomIndex];

    return {
      success: true,
      winner: newWinner,
      prize: gw.prize,
      channelId: gw.channel_id
    };
  }
}

module.exports = GiveawayManager;
