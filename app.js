const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const request = require("request");
const second = 1000;
let discordMessages = [];
let lastMsg;
let data = {};
let recent = {};
let clock = 0;
setInterval(function() {
    if(clock % 60 === 0) {
        console.log("I am doing my 5 minutes check");
        getData(0, 6);
    }
    clock++
}, second);

function getData(currentPage, pages){
    let url = "https://api.brawlhalla.com/rankings/1v1/aus/" + (currentPage + 1) + "?api_key=" + config.brawltoken;
    request({
        url: url,
        json: true
    }, function (err, res, body) {
        if (!err && res.statusCode === 200) {
            for (let i = 0; i < body.length; i++) {
                let obj = body[i];
                updateList(obj);
            }
            if (currentPage < pages){
                getData(currentPage + 1, pages)
            } else{
                updateRecent();
                updateDiscord();
                console.log(data)
            }
        }
    })
}


function updateDiscord(){
    let recentList = [];
    for(let i in recent){
        recentList.push(recent[i])
    }

    let sorted = recentList.sort(function(a, b) {return a.rank - b.rank});

    let d = new Date();
    let fields = [];
    for(let i = 0; i < sorted.length; i++){
        let elo = sorted[i].elo;
        let change = String(parseInt(sorted[i].elo) - parseInt(sorted[i].oldelo));
        let changeSign = (change < 0) ? "" : "+";
        let field = {
            "name": sorted[i].rank + ": " + sorted[i].name,
            "value": "elo: " + elo +" (" + changeSign + change + ")\n*updated " + String(Math.floor((d.getTime() - sorted[i].time) / 60000)) + " minutes ago*\n- ",
            "inline": true
        };
        fields.push(field)
    }
    let embed = {
            "embed": {
                "title": "Brawlhalla Aus 1v1 Queue",
                "description": "Displaying players in the top 300 who have played ranked in the last 30 minutes.\n- ",
                // "url": "https://discordapp.com",
                "color": 16743647,
                "footer": {

                    "text": "updated"
                },
                "thumbnail": {
                    "url": "https://i.imgur.com/LmdHZUg.png"
                },
                "author": {
                    "name": "lesmaux",
                    "url": "https://discordapp.com",
                    "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png"
                },
                "fields": fields
            }
        }
    ;

    if (lastMsg !== undefined) {
        lastMsg.edit(embed);
    }
}

function updateRecent(){
    let d = new Date();
    for (let id in data){
        if (d.getTime() - data[id].time < 600000){
            recent[id] = data[id]
        }
    }
    for (let id in recent) {
        if (d.getTime() - data[id].time > 1800000) {
            delete recent[id];
        }
    }
}

function updateList(obj){
    let d = new Date();

    if (obj.brawlhalla_id in data){
        let player = data[obj.brawlhalla_id];
        if (player.elo !== obj.rating){
            player.oldelo = data[obj.brawlhalla_id].elo;
            player.time = d.getTime()
        }

        player.name = obj.name;
        if (player.name.length > 15){
            player.name = player.name.substring(0, 13) + "..."
        }
        player.rank = obj.rank;
        player.elo = obj.rating;

    } else {
        data[obj.brawlhalla_id] = {
            name : obj.name,
            rank : obj.rank,
            oldelo : obj.rating,
            elo : obj.rating,
            time : 0,
        }
    }
}


client.on("ready", async () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
// Example of changing the bot's playing game to something useful. `client.user` is what the
// docs refer to as the "ClientUser".
//client.user.setActivity(`Serving ${client.guilds.size} servers`);

});

client.on("guildCreate", guild => {
    // This event triggers when the bot joins a guild.
    console.log(`New guild joined: ${guild.name} (id: ${guild.id}). This guild has ${guild.memberCount} members!`);
client.user.setActivity(`Serving ${client.guilds.size} servers`);
});

client.on("guildDelete", guild => {
    // this event triggers when the bot is removed from a guild.
    console.log(`I have been removed from: ${guild.name} (id: ${guild.id})`);
client.user.setActivity(`Serving ${client.guilds.size} servers`);
});


client.on("message", async message => {
    // This event will run on every single message received, from any channel or DM.

    // It's good practice to ignore other bots. This also makes your bot ignore itself
    // and not get into a spam loop (we call that "botception").
    if(message.author.bot) return;

    // Also good practice to ignore any message that does not start with our prefix,
    // which is set in the configuration file.
    if(message.content.indexOf(config.prefix) !== 0) return;

    // Here we separate our "command" name, and our "arguments" for the command.
    // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
    // command = say
    // args = ["Is", "this", "the", "real", "life?"]
    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    // Let's go with a few common example commands! Feel free to delete or change those.

    if(command === "ping") {
        // Calculates ping between sending a message and editing it, giving a nice round-trip latency.
        // The second ping is an average latency between the bot and the websocket server (one-way, not round-trip)
        const m = await message.channel.send("Ping?");
        m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(client.ping)}ms`);
    }

    if(command === "say") {
        // makes the bot say something and delete the message. As an example, it's open to anyone to use.
        // To get the "message" itself we join the `args` back into a string with spaces:
        const sayMessage = args.join(" ");
        // Then we delete the command message (sneaky, right?). The catch just ignores the error with a cute smiley thing.
        message.delete().catch(O_o=>{});
        // And we get the bot to say the thing:
        message.channel.send(sayMessage);
    }

    if(command === "here!") {
        lastMsg = await message.channel.send("OK!");

    }


    if(command === "kick") {
        // This command must be limited to mods and admins. In this example we just hardcode the role names.
        // Please read on Array.some() to understand this bit:
        // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Array/some?
        if(!message.member.roles.some(r=>["Administrator", "Moderator"].includes(r.name)) )
        return message.reply("Sorry, you don't have permissions to use this!");

        // Let's first check if we have a member and if we can kick them!
        // message.mentions.members is a collection of people that have been mentioned, as GuildMembers.
        // We can also support getting the member by ID, which would be args[0]
        let member = message.mentions.members.first() || message.guild.members.get(args[0]);
        if(!member)
            return message.reply("Please mention a valid member of this server");
        if(!member.kickable)
            return message.reply("I cannot kick this user! Do they have a higher role? Do I have kick permissions?");

        // slice(1) removes the first part, which here should be the user mention or ID
        // join(' ') takes all the various parts to make it a single string.
        let reason = args.slice(1).join(' ');
        if(!reason) reason = "No reason provided";

        // Now, time for a swift kick in the nuts!
        await member.kick(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't kick because of : ${error}`));
        message.reply(`${member.user.tag} has been kicked by ${message.author.tag} because: ${reason}`);

    }

    if(command === "ban") {
        // Most of this command is identical to kick, except that here we'll only let admins do it.
        // In the real world mods could ban too, but this is just an example, right? ;)
        if(!message.member.roles.some(r=>["Administrator"].includes(r.name)) )
        return message.reply("Sorry, you don't have permissions to use this!");

        let member = message.mentions.members.first();
        if(!member)
            return message.reply("Please mention a valid member of this server");
        if(!member.bannable)
            return message.reply("I cannot ban this user! Do they have a higher role? Do I have ban permissions?");

        let reason = args.slice(1).join(' ');
        if(!reason) reason = "No reason provided";

        await member.ban(reason)
            .catch(error => message.reply(`Sorry ${message.author} I couldn't ban because of : ${error}`));
        message.reply(`${member.user.tag} has been banned by ${message.author.tag} because: ${reason}`);
    }

    if(command === "purge") {
        // This command removes all messages from all users in the channel, up to 100.

        // get the delete count, as an actual number.
        const deleteCount = parseInt(args[0], 10);

        // Ooooh nice, combined conditions. <3
        if(!deleteCount || deleteCount < 2 || deleteCount > 100)
            return message.reply("Please provide a number between 2 and 100 for the number of messages to delete");

        // So we get our messages, and delete them. Simple enough, right?
        const fetched = await message.channel.fetchMessages({limit: deleteCount});
        message.channel.bulkDelete(fetched)
            .catch(error => message.reply(`Couldn't delete messages because of: ${error}`));
    }
});

client.login(config.token);