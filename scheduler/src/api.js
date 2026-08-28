const engine = require('./index');
const validator = require('./validator');

module.exports = {
  ...engine,
  validateIndependent: validator.validate,
  VALIDATION_HARD: validator.HARD,
  VALIDATION_SOFT: validator.SOFT,
};
