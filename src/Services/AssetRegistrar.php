<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Services;

use Acms\Services\Asset\AssetManager;

/**
 * Decides whether to load the plugin assets and registers them with the Asset API.
 *
 * Kept separate from Hook so the logic can be unit tested without the core facade.
 */
class AssetRegistrar
{
    private const HANDLE = 'block-editor-emoji';

    private string $baseUrl;

    public function __construct(string $baseUrl)
    {
        $this->baseUrl = rtrim($baseUrl, '/') . '/';
    }

    /**
     * A path starting with "/" + DIR_OFFSET is treated as a local file, so the Asset API appends the
     * file's modification time as a version query automatically.
     */
    public static function forDirOffset(string $dirOffset): self
    {
        return new self('/' . $dirOffset . 'extension/plugins/BlockEditorEmoji/assets/');
    }

    /**
     * Whether the build output exists. `src/assets/` is not committed, so a checkout that was not
     * built (or deployed without the release package) would otherwise load a script that 404s.
     */
    public static function isBuilt(?string $assetsDir = null): bool
    {
        return is_file(($assetsDir ?? dirname(__DIR__) . '/assets') . '/index.js');
    }

    /**
     * Admin screens (the user is always logged in there), and public pages for contributors or above:
     * the direct edit on public pages also uses the block editor and ACMS.plugins (the core loads
     * admin.js there only for those users). Without admin.js the script does nothing.
     */
    public function shouldRegister(mixed $admin, bool $isContributor = false): bool
    {
        if (!is_string($admin)) {
            return false;
        }

        return $admin !== '' || $isContributor;
    }

    public function register(AssetManager $assets): void
    {
        $assets->style(self::HANDLE . '-style', $this->baseUrl . 'index.css');
        $assets->script(self::HANDLE, $this->baseUrl . 'index.js', [
            'position' => 'body_end',
            'attrs' => ['type' => 'module'],
        ]);
    }
}
