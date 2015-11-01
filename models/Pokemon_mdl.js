var Pokemon = function(name, hp, allowedMoves, types) {
  this.name = name || null;
  this.hp = hp || 0;
  this.allowedMoves = allowedMoves || [];
  this.types = types || [];

  this.addAllowedMove = function(move) {
    return this.allowedMoves.push(move);
  };
};

Pokemon.prototype = new Pokemon();
Pokemon.prototype.constructor = Pokemon;

module.exports.blank = function() {
  return new Pokemon();
};

module.exports.fromName = function(pokemonName) {
  return new Pokemon(pokemonName);
};

module.exports.fromJSON = function(json) {
  return new Pokemon(json.name, json.hp, json.allowedMoves, json.types);
};
