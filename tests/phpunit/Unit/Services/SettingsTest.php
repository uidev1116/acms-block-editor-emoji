<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit\Services;

use Acms\Plugins\BlockEditorEmoji\Services\Settings;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

final class SettingsTest extends TestCase
{
    /**
     * @return array<string, array{mixed, bool}>
     */
    public static function enabledValues(): array
    {
        return [
            'on' => ['on', true],
            'never saved (null)' => [null, true],
            'empty string' => ['', true],
            'off' => ['off', false],
        ];
    }

    #[Test]
    #[TestDox('isEnabled() is false only for an explicit "off"')]
    #[DataProvider('enabledValues')]
    public function isEnabledOnlyOff(mixed $value, bool $expected): void
    {
        $this->assertSame($expected, Settings::isEnabled($value));
    }

    /**
     * @return array<string, array{mixed, bool}>
     */
    public static function charsets(): array
    {
        return [
            'utf8mb4' => ['utf8mb4', true],
            'UTF8MB4' => ['UTF8MB4', true],
            'utf8' => ['utf8', false],
            'utf8mb3' => ['utf8mb3', false],
            'null (core default)' => [null, false],
            'empty' => ['', false],
        ];
    }

    #[Test]
    #[TestDox('dbSupportsEmoji() is true only for utf8mb4')]
    #[DataProvider('charsets')]
    public function dbSupportsEmojiOnlyUtf8mb4(mixed $charset, bool $expected): void
    {
        $this->assertSame($expected, Settings::dbSupportsEmoji($charset));
    }
}
