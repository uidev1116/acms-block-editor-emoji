<?php

namespace Acms\Plugins\BlockEditorEmoji;

use ACMS_App;
use Acms\Services\Common\HookFactory;

/**
 * Plugin (extension app) registration class.
 *
 * The production code lives in `src/`, which is deployed as `extension/plugins/BlockEditorEmoji/`.
 * The JS / CSS (`src/assets/`) are built from `frontend/` and committed, because the deploy only
 * rsyncs `src/`.
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
    public $menu = false;

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
    }

    /**
     * @return bool
     */
    public function checkRequirements()
    {
        return true;
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
