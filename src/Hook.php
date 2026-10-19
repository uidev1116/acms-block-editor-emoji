<?php

namespace Acms\Plugins\BlockEditorEmoji;

use Acms\Plugins\BlockEditorEmoji\Services\AssetRegistrar;
use Acms\Plugins\BlockEditorEmoji\Services\Settings;
use Acms\Services\Asset\AssetManager;
use Acms\Services\Facades\Asset;
use Acms\Services\Facades\Config;
use Acms\Services\Facades\Preview;
use Acms\Services\Template\Twig;

/**
 * Extension points (hooks). Keep handlers thin; logic lives in Services.
 */
class Hook
{
    /**
     * Register the JS / CSS on admin screens (entry edit screen included) and, for contributors or above,
     * on public pages (direct edit).
     *
     * @param string $res
     * @return void
     */
    public function afterBuild(&$res)
    {
        $registrar = AssetRegistrar::forDirOffset($this->dirOffset());
        if (!$registrar->shouldRegister($this->currentAdmin(), $this->isContributor()) || !$this->isEnabled()) {
            return;
        }
        if (!$this->assetsBuilt()) {
            // Not built: the settings screen still works, but there is nothing to load
            return;
        }
        /** @var AssetManager $assets */
        $assets = Asset::getInstance();
        $registrar->register($assets);
    }

    /**
     * Functions for the settings screen (Twig).
     *
     * @param Twig $twig
     * @return void
     */
    public function extendsTwig(Twig $twig): void
    {
        $twig->registerFunction('block_editor_emoji_db_charset', fn(): string => $this->dbCharset());
        $twig->registerFunction('block_editor_emoji_db_ready', fn(): bool => Settings::dbSupportsEmoji($this->dbCharset()));
    }

    /**
     * Logged in as a contributor or above, and not in preview mode (the same condition under which
     * the core loads acms.js for the theme).
     *
     * @return bool
     */
    protected function isContributor()
    {
        if (!function_exists('sessionWithContribution')) {
            return false;
        }
        $bid = defined('BID') ? BID : 1;

        return sessionWithContribution($bid) && !Preview::isPreviewMode();
    }

    /**
     * The "enabled" setting of the current blog (on unless saved as off).
     *
     * @return bool
     */
    protected function isEnabled()
    {
        $bid = defined('BID') ? BID : 1;

        return Settings::isEnabled(Config::load($bid)->get(Settings::KEY, 'on'));
    }

    /**
     * Whether src/assets/index.js exists. Overridable for tests, because the build output is not
     * committed.
     *
     * @return bool
     */
    protected function assetsBuilt()
    {
        return AssetRegistrar::isBuilt();
    }

    /**
     * DB connection charset (config.server.php DB_CONNECTION_CHARSET). Empty when unset.
     *
     * @return string
     */
    protected function dbCharset()
    {
        return defined('DB_CONNECTION_CHARSET') ? (string) DB_CONNECTION_CHARSET : '';
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
