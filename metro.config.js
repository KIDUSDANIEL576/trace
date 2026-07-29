// Metro config exists for one reason: the web bundle.
// @supabase/supabase-js optionally imports @opentelemetry/api, which we don't
// install. Native never resolves it; the web bundler does, and fails. Point it
// at an empty stub for web only so `expo export --platform web` works (used by
// the /__preview design harness). Native resolution is untouched.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const EMPTY = path.resolve(__dirname, 'tools/web-stubs/empty.js');

const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === '@opentelemetry/api') {
    return { type: 'sourceFile', filePath: EMPTY };
  }
  return upstream
    ? upstream(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
