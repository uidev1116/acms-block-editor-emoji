<?php

namespace Acms\Plugins\BlockEditorEmoji;

use Acms\Plugins\BlockEditorEmoji\Services\AssetRegistrar;
use Acms\Services\Asset\AssetManager;
use Acms\Services\Facades\Asset;

/**
 * Extension points (hooks). Keep handlers thin; logic lives in Services.
 */
class Hook
{
    /**
     * Register the JS / CSS only on admin screens (entry edit screen included).
     *
     * @param string $res
     * @return void
     */
    public function afterBuild(&$res)
    {
        $registrar = AssetRegistrar::forDirOffset($this->dirOffset());
        if (!$registrar->shouldRegister($this->currentAdmin())) {
            return;
        }
        /** @var AssetManager $assets */
        $assets = Asset::getInstance();
        $registrar->register($assets);
    }

    /**
     * Value of the core ADMIN constant ("" on public pages). Overridable for tests, because a
     * constant cannot be redefined.
     *
     * @return mixed
     */
    protected function currentAdmin()
    {
        return defined('ADMIN') ? ADMIN : null;
    }

    /**
     * @return string
     */
    protected function dirOffset()
    {
        return defined('DIR_OFFSET') ? DIR_OFFSET : '';
    }
}
