<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Services;

/**
 * Plugin settings (stored per blog by the standard ACMS_POST_Config) and the DB charset check.
 */
final class Settings
{
    /** Config key: "on" (default) or "off". */
    public const KEY = 'block_editor_emoji_enabled';

    /**
     * Anything except an explicit "off" counts as on, so a blog that never saved the settings
     * screen keeps the default behavior.
     */
    public static function isEnabled(mixed $value): bool
    {
        return $value !== 'off';
    }

    /**
     * Whether the DB can store emoji (4-byte characters). Same condition as the core lite
     * editor's emoji picker: the connection charset must be exactly utf8mb4.
     */
    public static function dbSupportsEmoji(mixed $connectionCharset): bool
    {
        return is_string($connectionCharset) && strtolower($connectionCharset) === 'utf8mb4';
    }
}
