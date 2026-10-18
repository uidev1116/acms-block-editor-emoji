import { register } from '@ablogcms/plugins';
import { PLUGIN_NAME, VERSION, setup } from './plugin';
import './style.css';

// 管理画面以外（ACMS.plugins が無いページ）では何もしない
if (window.ACMS?.plugins) {
  register(PLUGIN_NAME, { version: VERSION, setup });
}
