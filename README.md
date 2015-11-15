# Slack-Pokemon

This is a bot for having Pokemon battles within [Slack](https://slack.com/). 

This is a fork from the original project by [@RobertVinluan](http://twitter.com/robertvinluan). It was originally built at Vox Media's product hackathon, [Vax](http://product.voxmedia.com/2014/7/3/5861220/vax-14-the-things-we-built). Read more about it [here](http://www.polygon.com/2014/6/27/5850720/pokemon-battle-slack-vox).

Here's an example battle:

<img src="http://cdn3.vox-cdn.com/assets/4681633/pkmn_slack.jpg" alt="Example Battle">

## Setting up

This is written in [Node.js.](http://nodejs.org) After installing Node, you also need to install [npm](https://npmjs.org) and [Redis.](http://redis.io/)

### Spinning up a server

[![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)    
    
However, if you would like set up the server manually through [Heroku](https://www.heroku.com/), you can read the following articles:
    
- [Node](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Redis to Go](https://addons.heroku.com/redistogo)

Please note that there is some RedisToGo/Heroku specific code in `state-machine.js`. Don't use that if you're using some other type of server.

### Running locally

To run locally, start Redis in a new tab:

```Shell
$ redis-server
```

and then start the node app:

```Shell
$ npm start
```

This should build dependencies for you and run `index.js`.

Your app should now be running on `localhost:5000`.

To test locally, you'll have to send some POST commands to `localhost:5000/commands`. Here's a one-liner to test starting a battle:

```Shell
curl -X POST -d '{"text":"pkmn battle me"}' -H 'Content-Type:application/json' "localhost:5000/commands"
```

To test other commands, change the text in the JSON object above.

### On Slack's end

Set up an [Outgoing Webhook Integration](https://my.slack.com/services/new/outgoing-webhook) with the trigger word 'pkmn' that sends to the URL: `your-url.herokuapp.com/commands/` (or whatever your equivalent URL is if you're not using Heroku). You'll need admin access to your Slack Integration to do this.

To get the bot's avatar to work, you need to set up a [Custom Emoji](https://my.slack.com/customize/emoji) with the name ':pkmntrainer:'. Use the included `pkmntrainer.png` image, or a custom one if you prefer.

##How to play

List of commands:

`pkmn battle me`: starts a battle. chooses a pokemon for the NPC.

`pkmn i choose <pokemon>`: chooses a pokemon for the user. Replies with a list of usable moves.

`pkmn use <attack>`: uses an attack. If the pokemon doesn't know that attack, it will respond with an error. You can type the attack with hyphens (hyper-beam) or with spaces (will o wisp).

`pkmn end battle`: end the battle before someone wins. You can also use this to end battles someone else started but never finished.

##Features

Currently the battle system is a tiny fraction of Pokemon's actual battle system. It supports:

- one battle between a user and an NPC
- up to 6 pokemon per player (of any currently existing pokemon from Bulbasaur to Zygarde. No Volcanion, Diancie, or Hoopa.)
- moves with appropriate power and type effectiveness (moves can be Super Effective or Not Effective, etc.)
- taking stats into account when calculating damage (including accuracy and critical hits)
- multiple concurrent battles

It currently does not support:

- levels, or stats based on levels (including EVs and IVs)
- ANY non-damaging moves
- secondary effects of damaging moves (status, buffs/debuffs, multi-hits)
- items and abilities
- player vs player battles

###Data Feeds

The data is currently being pulled from pokeapi.com as well as some extra data that was scrapped and stored in local JSON files. These are being replaced by a local datastore.

