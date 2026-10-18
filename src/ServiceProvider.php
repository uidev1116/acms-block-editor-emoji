<?php

namespace Acms\Plugins\BlockEditorEmoji;

use ACMS_App;
use Acms\Plugins\BlockEditorEmoji\Services\Requirements;
use Acms\Services\Common\HookFactory;
use Acms\Services\Common\InjectTemplate;
use Acms\Services\Facades\Twig;

/**
 * Plugin (extension app) registration class.
 *
 * The production code lives in `src/`, which is deployed as `extension/plugins/BlockEditorEmoji/`.
 * The JS / CSS (`src/assets/`) are built from `frontend/` (not committed; the release workflow
 * builds them into the package).
 */
class ServiceProvider extends ACMS_App
{
    /**
     * @var string
     */
    public $version = '0.1.0';

    /**
     * @var string
     */
    public $name = 'BlockEditorEmoji';

    /**
     * @var string
     */
    public $author = 'uidev1116';

    /**
     * @var bool
     */
    public $module = false;

    /**
     * @var false|string
     */
    public $menu = 'block_editor_emoji_index';

    /**
     * @var string
     */
    public $desc = 'ブロックエディターに絵文字のサジェストとピッカーを追加します。';

    /**
     * Boot the plugin (runs on every request while the plugin is active).
     *
     * @return void
     */
    public function init()
    {
        HookFactory::singleton()->attach('BlockEditorEmojiHook', new Hook());

        Twig::addTemplatePath(PLUGIN_LIB_DIR . 'BlockEditorEmoji/template', 'block_editor_emoji');
        $this->registerSettingsScreen(defined('ADMIN') ? ADMIN : null);
    }

    /**
     * Settings screen (opened from the app list; a Twig page). Only injected on its own screen.
     *
     * @param mixed $admin Value of the core ADMIN constant
     * @return void
     */
    public function registerSettingsScreen($admin)
    {
        if ($admin !== 'app_' . $this->menu) {
            return;
        }
        $inject = InjectTemplate::singleton();
        $inject->add('admin-main', static function (): string {
            return Twig::renderTemplate('@block_editor_emoji/admin/main.twig');
        });
        $inject->add('admin-topicpath', PLUGIN_DIR . 'BlockEditorEmoji/template/admin/topicpath.html');
    }

    /**
     * @return bool
     */
    public function checkRequirements()
    {
        return Requirements::isSupported(defined('VERSION') ? VERSION : null);
    }

    /**
     * @return void
     */
    public function install()
    {
    }

    /**
     * @return void
     */
    public function uninstall()
    {
    }

    /**
     * @return bool
     */
    public function update()
    {
        return true;
    }

    /**
     * @return bool
     */
    public function activate()
    {
        return true;
    }

    /**
     * @return bool
     */
    public function deactivate()
    {
        return true;
    }
}
