import app from './app.js';
import logger from '#config/logger.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
  console.log(`Server listening on port ${PORT}`);
});
