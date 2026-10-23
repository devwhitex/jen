const { ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('../database/db');

class MemberCounterService {
  static async setupCounters(guild, goal = 500) {
    // 1. Create Category
    const category = await guild.channels.create({
      name: '📊 SERVER STATS 📊',
      type: ChannelType.GuildCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.Connect],
          allow: [PermissionFlagsBits.ViewChannel]
        }
      ]
    });

    // 2. Fetch member statistics
    await guild.members.fetch().catch(() => null);
    const total = guild.memberCount;
    const humans = guild.members.cache.filter(m => !m.user.bot).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const boosts = guild.premiumSubscriptionCount || 0;

    const channelPerms = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.Connect],
        allow: [PermissionFlagsBits.ViewChannel]
      }
    ];

    // 3. Create Channels
    const totalChannel = await guild.channels.create({
      name: `👥 Total: ${total.toLocaleString()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    const membersChannel = await guild.channels.create({
      name: `👤 Members: ${humans.toLocaleString()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    const botsChannel = await guild.channels.create({
      name: `🤖 Bots: ${bots.toLocaleString()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    const onlineChannel = await guild.channels.create({
      name: `🟢 Online: ${online.toLocaleString()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    const boostChannel = await guild.channels.create({
      name: `🚀 Boosts: ${boosts} (Tier ${guild.premiumTier})`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    const goalChannel = await guild.channels.create({
      name: `🎯 Goal: ${total.toLocaleString()}/${goal.toLocaleString()}`,
      type: ChannelType.GuildVoice,
      parent: category.id,
      permissionOverwrites: channelPerms
    });

    // 4. Save to Database
    db.saveMemberCounters({
      guild_id: guild.id,
      category_id: category.id,
      total_channel_id: totalChannel.id,
      members_channel_id: membersChannel.id,
      bots_channel_id: botsChannel.id,
      online_channel_id: onlineChannel.id,
      boost_channel_id: boostChannel.id,
      goal_channel_id: goalChannel.id,
      member_goal: goal
    });

    return {
      category,
      totalChannel,
      membersChannel,
      botsChannel,
      onlineChannel,
      boostChannel,
      goalChannel
    };
  }

  static async updateCounters(guild) {
    const config = db.getMemberCounters(guild.id);
    if (!config) return;

    try {
      await guild.members.fetch().catch(() => null);
      const total = guild.memberCount;
      const humans = guild.members.cache.filter(m => !m.user.bot).size;
      const bots = guild.members.cache.filter(m => m.user.bot).size;
      const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
      const boosts = guild.premiumSubscriptionCount || 0;
      const goal = config.member_goal || 1000;

      if (config.total_channel_id) {
        const ch = guild.channels.cache.get(config.total_channel_id);
        if (ch) await ch.setName(`👥 Total: ${total.toLocaleString()}`).catch(() => null);
      }

      if (config.members_channel_id) {
        const ch = guild.channels.cache.get(config.members_channel_id);
        if (ch) await ch.setName(`👤 Members: ${humans.toLocaleString()}`).catch(() => null);
      }

      if (config.bots_channel_id) {
        const ch = guild.channels.cache.get(config.bots_channel_id);
        if (ch) await ch.setName(`🤖 Bots: ${bots.toLocaleString()}`).catch(() => null);
      }

      if (config.online_channel_id) {
        const ch = guild.channels.cache.get(config.online_channel_id);
        if (ch) await ch.setName(`🟢 Online: ${online.toLocaleString()}`).catch(() => null);
      }

      if (config.boost_channel_id) {
        const ch = guild.channels.cache.get(config.boost_channel_id);
        if (ch) await ch.setName(`🚀 Boosts: ${boosts} (Tier ${guild.premiumTier})`).catch(() => null);
      }

      if (config.goal_channel_id) {
        const ch = guild.channels.cache.get(config.goal_channel_id);
        if (ch) await ch.setName(`🎯 Goal: ${total.toLocaleString()}/${goal.toLocaleString()}`).catch(() => null);
      }
    } catch (err) {
      console.warn(`Could not update member counters for guild ${guild.id}:`, err.message);
    }
  }

  static startCounterLoop(client) {
    // 8-minute interval to respect Discord's rate limit of 2 channel renames per 10 mins
    setInterval(() => {
      client.guilds.cache.forEach(guild => {
        this.updateCounters(guild);
      });
    }, 8 * 60 * 1000);
  }
}

module.exports = MemberCounterService;
