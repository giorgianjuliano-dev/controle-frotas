import app from '../dist/index.cjs';

export default async (req, res) => {
  if (app.default) {
    return app.default(req, res);
  }
  return app(req, res);
};
