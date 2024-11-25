const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
  
        const activities = [
            { name: 'LineageOs', type: ActivityType.Watching },
            { name: 'Pixel Experience', type: ActivityType.Playing },
            { name: 'AOSP', type: ActivityType.Streaming },
            { name: 'OneUI', type: ActivityType.Listening },
        ];

     
        const statuses = ['online', 'online', 'online'];

     
        let currentActivityIndex = 0;
        let currentStatusIndex = 0;

 
        function setActivityAndStatus() {
        
            const activity = activities[currentActivityIndex];
            const status = statuses[currentStatusIndex];

          
            client.user.setPresence({
                activities: [activity],
                status: status,
            });

            
            currentActivityIndex = (currentActivityIndex + 1) % activities.length;
            currentStatusIndex = (currentStatusIndex + 1) % statuses.length;
        }

        
        setTimeout(() => {
            setActivityAndStatus();
            console.log('\x1b[31m[ CORE ]\x1b[0m \x1b[32m%s\x1b[0m', 'Bot Activity Set Successful ✅');
        }, 2000);

        setInterval(() => {
            setActivityAndStatus();
        }, 6000);

client.once('ready', () => {
    console.log(`Bot online como ${client.user.tag}`);
    const { startNewsInterval } = require('./events/news.js');
    startNewsInterval(client);
});

    },
};
