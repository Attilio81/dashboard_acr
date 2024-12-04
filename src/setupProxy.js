module.exports = function(app) {
  // Add any middleware setup here if needed
  app.use((req, res, next) => {
    next();
  });
};
