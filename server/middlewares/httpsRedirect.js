// HTTP par aayi request ko HTTPS par bhejta hai. Reverse proxy (Nginx) ke peeche req.secure
// tabhi sahi hota hai jab TRUST_PROXY set ho (X-Forwarded-Proto header padha jata hai).
// Health check ko chhod dete hain taaki load balancer / uptime monitor HTTP se bhi check kar sake.
export const httpsRedirect = (req, res, next) => {
  if (req.secure || req.path === '/api/v1/health') return next();
  res.redirect(308, `https://${req.headers.host}${req.originalUrl}`);
};
