<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Services;

/**
 * Minimum a-blog cms version. 3.2.36 is the first release that has everything this plugin relies on
 * (ACMS.plugins keyboardShortcuts / i18n.addResources and the block editor's blockMenu extension point).
 */
final class Requirements
{
    public const MIN_ACMS_VERSION = '3.2.36';

    /**
     * An unknown version (constant not defined) is not blocked, since it cannot be verified.
     */
    public static function isSupported(mixed $acmsVersion): bool
    {
        if (!is_string($acmsVersion) || $acmsVersion === '') {
            return true;
        }

        return version_compare($acmsVersion, self::MIN_ACMS_VERSION, '>=');
    }
}
