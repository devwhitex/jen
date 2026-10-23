const { ActivityType, Events } = require('discord.js');
const MaintenanceManager = require('../services/maintenanceManager');
const MemberCounterService = require('../services/memberCounterService');
const voiceService = require('../services/voiceService');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`\n==============================================`);
    console.log(`🚀 Logged in as: ${client.user.tag}`);
    console.log(`🌐 Serving ${client.guilds.cache.size} guilds and ${client.users.cache.size} users`);
    console.log(`⚙️ Loaded ${client.commands.size} application commands`);
    console.log(`==============================================\n`);

    // Start background services
    client.giveawayManager.startLoop();
    MaintenanceManager.startStatsLoop(client);
    MemberCounterService.startCounterLoop(client);

    // Initialize 24/7 Voice Channels
    voiceService.init247(client).catch(() => null);

    // Initial server stats sync
    client.guilds.cache.forEach(guild => {
      MaintenanceManager.updateGuildStats(guild).catch(() => null);
      MemberCounterService.updateCounters(guild).catch(() => null);
    });

    // Dynamic rotating status
    const activities = [
      { name: '/help • Multi-Tool Bot', type: ActivityType.Listening },
      { name: 'over server tickets & maintenance', type: ActivityType.Watching },
      { name: 'music with /play', type: ActivityType.Playing },
      { name: 'giveaways & automod filters', type: ActivityType.Competing },
      { name: 'live server counters & stats', type: ActivityType.Watching }
    ];

    let currentActivity = 0;
    setInterval(() => {
      client.user.setActivity(activities[currentActivity]);
      currentActivity = (currentActivity + 1) % activities.length;
    }, 20000);
  }
};
