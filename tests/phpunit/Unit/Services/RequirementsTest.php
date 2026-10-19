<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit\Services;

use Acms\Plugins\BlockEditorEmoji\Services\Requirements;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

final class RequirementsTest extends TestCase
{
    /**
     * @return array<string, array{mixed, bool}>
     */
    public static function versions(): array
    {
        return [
            'exactly the minimum' => ['3.2.38', true],
            'newer patch' => ['3.2.39', true],
            'newer minor' => ['3.3.0', true],
            'newer major' => ['4.0.0', true],
            'one patch older' => ['3.2.37', false],
            'before the extension points' => ['3.2.35', false],
            'much older' => ['3.1.9', false],
            'older with a suffix' => ['3.2.37-beta.1', false],
            'unknown (empty)' => ['', true],
            'unknown (null)' => [null, true],
        ];
    }

    #[Test]
    #[TestDox('isSupported() requires a-blog cms 3.2.38 or later')]
    #[DataProvider('versions')]
    public function isSupportedFromMinimum(mixed $version, bool $expected): void
    {
        $this->assertSame($expected, Requirements::isSupported($version));
    }

    #[Test]
    #[TestDox('the minimum version is 3.2.38')]
    public function minimumIs3236(): void
    {
        $this->assertSame('3.2.38', Requirements::MIN_ACMS_VERSION);
    }
}
