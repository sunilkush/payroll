import * as statusService from '../services/statusService.js';

// Server ka index page (Pug se bana HTML): API chal rahi hai ya nahi, ek nazar mein.
export const index = (req, res) => {
  res.render('index', statusService.getStatus());
};
