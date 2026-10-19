import { register } from '@ablogcms/plugins';
import { PLUGIN_NAME, VERSION, setup } from './plugin';
import './style.css';

// ACMS.plugins が無いページでは何もしない
if (window.ACMS?.plugins) {
  register(PLUGIN_NAME, { version: VERSION, setup });
}
