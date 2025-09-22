import { ILogger } from "./types/logger";

interface TelegramConfig {
  token: string;
  chatId: string;
}

interface GlobalConfig {
  telegram: TelegramConfig;
  appName: string;
  logger: ILogger;
  env: string
}

// Allow config to be partial during setup
let _config: Partial<GlobalConfig> = {};

export const setConfig = (config: Partial<GlobalConfig>) => {
  _config = {
    ..._config,
    ...config,
  };
};

export const getConfig = (): GlobalConfig => {
  // Validate and throw if required fields are missing
  if (!_config.telegram?.token || !_config.telegram?.chatId) {
    throw new Error(
      'Telegram config is incomplete: missing token or chatId. Call `setConfig()` with valid Telegram config.'
    );
  }

  if (!_config.appName) {
    throw new Error('appName is required. Call `setConfig()` with appName.');
  }

  if (!_config.logger) {
    throw new Error('logger is required. Call `setConfig()` with a valid logger.');
  }

  if (!_config.env) {
    throw new Error('app env is required. Call `setConfig()` with a valid env (via process.env)')
  }

  // Now we know all fields are present -> safe to cast
  return _config as GlobalConfig;
};