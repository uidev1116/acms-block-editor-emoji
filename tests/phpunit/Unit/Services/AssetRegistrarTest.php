<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit\Services;

use Acms\Plugins\BlockEditorEmoji\Services\AssetRegistrar;
use Acms\Services\Asset\AssetManager;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

final class AssetRegistrarTest extends TestCase
{
    /**
     * @return array<string, array{mixed, bool}>
     */
    public static function adminValues(): array
    {
        return [
            'entry edit screen' => ['entry-edit', true],
            'any admin screen' => ['top', true],
            'public page (empty string)' => ['', false],
            'public page (null)' => [null, false],
            'public page (false)' => [false, false],
        ];
    }

    #[Test]
    #[TestDox('shouldRegister() is true only on admin screens')]
    #[DataProvider('adminValues')]
    public function shouldRegisterOnlyOnAdmin(mixed $admin, bool $expected): void
    {
        $this->assertSame($expected, (new AssetRegistrar('/extension/plugins/BlockEditorEmoji/assets/'))->shouldRegister($admin));
    }

    #[Test]
    #[TestDox('register() adds the style in head and the JS as a module at body end')]
    public function registerAddsStyleAndModuleScript(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->once())
            ->method('style')
            ->with('block-editor-emoji-style', '/ext/assets/index.css');
        $manager->expects($this->once())
            ->method('script')
            ->with('block-editor-emoji', '/ext/assets/index.js', [
                'position' => 'body_end',
                'attrs' => ['type' => 'module'],
            ]);

        (new AssetRegistrar('/ext/assets/'))->register($manager);
    }

    #[Test]
    #[TestDox('the base URL always ends with exactly one slash')]
    public function baseUrlIsNormalized(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->once())->method('style')->with($this->anything(), '/a/b/index.css');
        $manager->expects($this->once())->method('script')->with($this->anything(), '/a/b/index.js', $this->anything());

        (new AssetRegistrar('/a/b///'))->register($manager);
    }

    #[Test]
    #[TestDox('forDirOffset() builds the plugin asset path from DIR_OFFSET')]
    public function forDirOffsetBuildsPath(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->once())
            ->method('style')
            ->with($this->anything(), '/blog/extension/plugins/BlockEditorEmoji/assets/index.css');
        $manager->expects($this->once())->method('script');

        AssetRegistrar::forDirOffset('blog/')->register($manager);
    }
}
