var Pokemon = function(name, hp, availableMoves, types) {
  this.name = name || null;
  this.hp = hp || 0;
  this.availableMoves = availableMoves || [];
  this.types = types || [];

  this.addAllowedMove = function(move) {
    return this.availableMoves.push(move);
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
  return new Pokemon(json.name, json.hp, json.availableMoves, json.types);
};
