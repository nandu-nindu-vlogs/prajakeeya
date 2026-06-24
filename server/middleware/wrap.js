/**
 * Wraps an Express route handler so any thrown error is passed to next()
 * instead of crashing the process.
 * Usage: router.get('/path', wrap((req, res) => { ... }))
 */
module.exports = function wrap(fn) {
  return function (req, res, next) {
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') {
        result.catch(next);
      }
    } catch (err) {
      next(err);
    }
  };
};
