const { authenticate, isAdmin } = require('./authMiddleware');

/**
 * Apply authentication to routes
 * @param {Object} router - Express router
 * @param {Array} publicRoutes - Array of public route paths (e.g., ['/signup', '/login'])
 * @returns {Object} - Protected router
 */
const protectRoutes = (router, publicRoutes = []) => {
  // Apply authentication to all routes except public ones
  router.use((req, res, next) => {
    // Check if the current route is public
    const isPublicRoute = publicRoutes.some(route => 
      req.path === route || req.path.startsWith(`${route}/`)
    );
    
    if (isPublicRoute) {
      return next();
    }
    
    // Apply authentication for non-public routes
    return authenticate(req, res, next);
  });
  
  return router;
};

/**
 * Apply admin-only protection to specific routes
 * @param {Object} router - Express router
 * @param {Array} adminRoutes - Array of admin-only route paths
 * @returns {Object} - Protected router
 */
const protectAdminRoutes = (router, adminRoutes = []) => {
  // Apply admin check to specified routes
  router.use((req, res, next) => {
    // Check if the current route requires admin privileges
    const isAdminRoute = adminRoutes.some(route => 
      req.path === route || req.path.startsWith(`${route}/`)
    );
    
    if (isAdminRoute) {
      return isAdmin(req, res, next);
    }
    
    return next();
  });
  
  return router;
};

module.exports = {
  protectRoutes,
  protectAdminRoutes
}; 