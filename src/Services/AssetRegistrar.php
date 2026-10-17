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
     * Only admin screens (including the entry edit screen) have the block editor and ACMS.plugins.
     */
    public function shouldRegister(mixed $admin): bool
    {
        return is_string($admin) && $admin !== '';
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
