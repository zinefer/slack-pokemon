var pokeapi = require('./poke-api.js');
var stateMachine = require('./state-machine.js');
var moves = require('./file-system.js');
var Q = require('q');

module.exports = {}

/*
 * Return a text string when the battle starts.
 * Stores the player's Slack username and what channel the battle is in,
 * and chooses a Pokemon for the NPC from the original 151.
 */
module.exports.startBattle = function(slackData) {
  var textString = "OK {name}, I'll battle you! ".replace("{name}", slackData.user_name);

  var getNpcDexNumbers = function() {
    var dex_nos = [];
    var morePokeOdds = .3;

    do {
      var dex = Math.ceil(Math.random() * 151);
      dex_nos.push(dex);

      morePokeOdds += Math.random();
    } while(morePokeOdds < 1)

    return dex_nos;
  },

  chooseNpcPokemon = function(dex_nos) {
    return module.exports.choosePokemon(slackData.user_name, 'npc', dex_nos);
  },

  createNpcAnnouncement = function(pkmnChoice){
    return {
      text: textString + '\n' + pkmnChoice.text,
      spriteUrl: pkmnChoice.spriteUrl
    }
  };

  return stateMachine.newBattle(slackData.user_name, slackData.channel_name)
  .then( getNpcDexNumbers )
  .then( chooseNpcPokemon )
  .then( createNpcAnnouncement )
}

/*
 * Return a text string when the user chooses a Pokemon.
 * Fetch the pokemon from the API, choose 4 random moves, write them to REDIS,
 * and then return a message stating the pokemon, its HP, and its moves.
 */
module.exports.choosePokemon = function(playerName, trainerName, pokemon) {
  var addAllPokemon = function(pokemon) {
    var addPromises = [];
    for(var i = pokemon.length - 1; i > 0; i--) {
      addPromises.push(addPokemon(playerName, trainerName, pokemon[i]));
    }

    var addActivePokemon = function() {
      return addPokemon(playerName, trainerName, pokemon[0]);
    }

    return Q.all( addPromises )
    .then( addActivePokemon )
  },

  setTextString = function(pkmndata){
    var displayName = (trainerName === 'npc') ? 'I choose' : trainerName + ' chooses';
    var textString = "{chooseMessage} {pkmnn}. It has {hp} HP, and knows {moves}";

    textString = textString.replace("{chooseMessage}", displayName);
    textString = textString.replace("{pkmnn}", pkmndata.name);
    textString = textString.replace("{hp}", pkmndata.hp);
    textString = textString.replace("{moves}", pkmndata.moveString);

    var spriteUrl = getSpriteUrl(pkmndata.pkdx_id);

    return {
      text: textString,
      spriteUrl: spriteUrl
    }
  };

  return addAllPokemon( pokemon )
  .then( setTextString );
}

/*
 * When the user uses a move, calculate the results of the user's turn,
 * then the NPC's turn. If either one of them ends the battle, don't show
 * the other result.
 */
module.exports.doTurn = function(moveName, slackData) {
  var results = [];
  var doNpcMove = function() {
    return useMove(null, slackData.user_name, 'npc', slackData.user_name, true)
  },

  doUserMove = function() {
    return useMove(moveName, slackData.user_name, slackData.user_name, 'npc', false)
  },

  saveResult = function(result) {
    results.push(result)
    return result;
  },

  checkForFaint = function(result) {
    if (result.fainted) {
      return stateMachine.chooseNextPokemon(slackData.user_name, result.fainted.trainerName)
      .then(function(nextPoke) {
        if(nextPoke){
          result.text += '\n' + result.fainted.pokeName + ' fainted! \n';
          result.text += 'I choose '+ nextPoke.name +'! \n';
          result.text += getSpriteUrl(nextPoke.dex_no);
        } else {
          result.loser = result.fainted.trainerName;
        }
      });
    }
  },

  checkForVictor = function () {
    if (results[0].loser || results[1].loser) {
      return stateMachine.endBattle(slackData.user_name)
    }
  }

  printResults = function(){
    var dmgText = results[0].text + "\n" + results[1].text;
    if(results[0].loser && results[1].loser) {
      return dmgText + '\nIt\'s a draw!';
    } else if(results[0].loser === slackData.user_name || results[1].loser === slackData.user_name) {
      return dmgText + '\nYou Lost!';
    } else if(results[0].loser === 'npc' || results[1].loser === 'npc') {
      return dmgText + '\nYou Beat Me!';
    } else {
      return dmgText;
    }
  };

  //TODO: Choose who goes first based on speed
  //TODO: Validate Move
  //TODO: Move save game state into it's own function
  return doNpcMove()
  .then( saveResult )
  .then( checkForFaint )
  .then( doUserMove )
  .then( saveResult )
  .then( checkForFaint )
  .then( checkForVictor )
  .then( printResults )
}

/*
 * Return a text string when the command doesn't match defined commands.
 */
module.exports.unrecognizedCommand = function(cmd) {
  var textString = "I don't recognize the command _{cmd}_ .";
  textString = textString.replace("{cmd}", cmd);
  return Q.fcall(function(){ return textString; });
}

module.exports.endBattle = function(slackData) {
  return stateMachine.endBattle(slackData.user_name);
}


////////////////////////////////
//        Private Methods     //
////////////////////////////////

var addPokemon = function(playerName, trainerName, pokemon) {
  var pkmndata;

  var getPokemonData = function(poke) {
    return pokeapi.getPokemon(poke)
  },

  choosePokemon = function(_pkmndata) {
    pkmndata = _pkmndata;
    return stateMachine.choosePokemon(playerName, trainerName, pkmndata);
  },

  getMoveSet = function() {
    var moveString = '';
    var movePromises = [];
    var moves = shuffle(pkmndata.moves);

    for(var i = 0; i < 4; i++) {
      movePromises.push(
        pokeapi.getMove("http://pokeapi.co"+moves[i].resource_uri)
        .then(function(data){
          stateMachine.addMove(data, playerName, trainerName, pkmndata.name);
        })
      )
      //format: "vine whip, leer, solar beam, and tackle."
      if(i < 3) {
        moveString += moves[i].name;
        moveString += ", ";
      } else {
        moveString += "and ";
        moveString += moves[i].name;
        moveString += ".";
      }
    }

    pkmndata.moveString = moveString;
    return Q.allSettled( movePromises )
    .then( function() {
      return pkmndata;
    });
  };

  return getPokemonData(pokemon)
  .then( choosePokemon )
  .then( getMoveSet )
}

var effectivenessMessage = function(mult) {
  switch(mult) {
    case 0:
      return "It doesn't have an effect. ";
      break;
    case 0.5:
    case 0.25:
      return "It's not very effective... ";
      break;
    case 1:
      return " ";
      break;
    case 2:
    case 4:
      return "It's super effective! ";
      break;
    default:
      return " ";
      break;
  }
}

/*
 */
var useMove = function(moveName, playerName, trainerName, otherName, isOpponentMove) {
  var textString = "{txtPrep1} used {mvname}! {crit} {effctv}";
  var textStringDmg = "It did {dmg} damage, leaving {txtPrep2} with {hp}HP!";

  var getMoves = function() {
    return stateMachine.getActivePokemonAllowedMoves(playerName, trainerName);
  },

  getMove = function(moves){
    if (moves == null || moves.length <= 0) {
      throw new Error("No moves available; investigate why in code.");
    }

    if(moveName === null) {
      var rand = Math.min(Math.floor(Math.random() * 4), moves.length - 1);
      moveName = moves[rand];
    }

    if(moves.indexOf(moveName) !== -1) {
      textString = textString.replace("{mvname}", moveName);
      return stateMachine.getSingleMove(moveName);
    } else {
      throw new Error("Your pokemon doesn't know that move. Your Moves: " + moves.toString());
    }
  },

  _doDamage = function(moveData) {
    moveData.name = moveName;
    return doDamage(moveData, playerName, trainerName, otherName);
  },

  formOutcomeText = function(results){
    var battleText;

    var txtPrep1 = (isOpponentMove) ? 'I' : 'You';
    var criticalMsg = (results.wasCritical) ? 'Critical Strike!' : '';
    textString = textString.replace("{txtPrep1}", txtPrep1);
    textString = textString.replace("{effctv}", effectivenessMessage(results.multiplier));
    textString = textString.replace("{crit}", criticalMsg);

    var txtPrep2 = (isOpponentMove) ? 'you' : 'me';
    textStringDmg = textStringDmg.replace("{txtPrep2}", txtPrep2);
    textStringDmg = textStringDmg.replace("{dmg}", results.damage);
    textStringDmg = textStringDmg.replace("{hp}", results.hpRemaining);


    if(results.multiplier == 0) {
      battleText = textString;
    } else {
      battleText = textString + textStringDmg;
    }

    if(parseInt(results.hpRemaining, 10) <= 0) {
        var fainted = {
          trainerName: otherName,
          pokeName: results.defendingPokemon.name
        }
        return {text: battleText, fainted: fainted };
    } else {
        return { text: battleText };
    }
  }

  return getMoves()
  .then( getMove )
  .then( _doDamage )
  .then( formOutcomeText )
}

var doDamage = function(moveData, playerName, trainerName, otherName) {
  var multiplier;
  var damage;
  var attackingPokemon;
  var defendingPokemon;
  var wasCritical = false;
  var damageType;

  var getPokemonType = function() {
    return stateMachine.getActivePokemonTypes(playerName, otherName)
  },

  getTypeMultiplier = function(types) {
    return pokeapi.getAttackMultiplier(moveData.type, types[0], types[1])
    .then( function(_multiplier) { multiplier = _multiplier; } )
  },

  getAttackingPokemon = function() {
    return stateMachine.getActivePokemon(playerName, trainerName)
    .then( function(_atkPokemon) { attackingPokemon = _atkPokemon; } )
  },

  getDefendingPokemon = function() {
    return stateMachine.getActivePokemon(playerName, otherName)
    .then( function(_defPokemon) { defendingPokemon = _defPokemon; } )
  },

  checkCritical = function() {
    //TODO: Some moves will have a different critical strike rate. This is the base.
    wasCritical = (Math.floor(Math.random() * 16) === 1);
  },

  getDamageType = function() {
    var type = moves.getDamageType( moveData.name );
    if( ~type.indexOf('Special') ) {
      damageType = 'Special';
    } else if( ~type.indexOf('Physical') ) {
      damageType = 'Physical';
    } else {
      damageType = 'Effect';
    }
  },

  calcDamage = function() {
    if( moveData.power == 0 ) {
      return 0;
    }

    var stab = 1;
    attackingPokemon.types.forEach(function( type ) {
      if( type.name == moveData.type ) {
        stab = 1.5;
      }
    });

    var critical = (wasCritical) ? 1.5 : 1;
    var random = 1 - (Math.floor(Math.random() * 15) / 100);
    var modifier = stab * critical * multiplier * random;

    //TODO: Use special if the attack is special instead of physical
    //TODO: Hardcoded level of 5
    var level = 5;
    var levelModifier = ( ( 2 * level + 10 ) / 250 );

    var attackDefenseRatio;
    if( damageType == 'Physical' ) {
      attackDefenseRatio = (attackingPokemon.attack / defendingPokemon.defense);
    } else {
      attackDefenseRatio = (attackingPokemon.sp_attack / defendingPokemon.sp_defense);
    }

    var damage = ( levelModifier * attackDefenseRatio * moveData.power + 2) * modifier;
    return Math.floor(damage);
  };

  _doDamage = function(_damage){
    damage = _damage;
    return stateMachine.doDamageToActivePokemon(playerName, otherName, damage)
  },

  reportResults = function(hpRemaining) {
    var results = {};
    results.defendingPokemon = defendingPokemon;
    results.hpRemaining = hpRemaining;
    results.damage = damage;
    results.multiplier = multiplier;
    results.wasCritical = wasCritical;
    return results;
  };

  return getPokemonType()
  .then( getTypeMultiplier )
  .then( getAttackingPokemon )
  .then( getDefendingPokemon )
  .then( checkCritical )
  .then( getDamageType )
  .then( calcDamage )
  .then( _doDamage )
  .then( reportResults )
}

function getSpriteUrl(dex_no) {
  var stringy = "" + dex_no;
  if (stringy.length == 1) {
    stringy = "00" + stringy;
  } else if (stringy.length == 2) {
    stringy = "0" + stringy;
  }

  return "http://sprites.pokecheck.org/i/"+stringy+".gif";
};


//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};
