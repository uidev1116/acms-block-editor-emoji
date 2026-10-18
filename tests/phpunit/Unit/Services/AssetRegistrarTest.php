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
            'entry edit screen' => ['entry_editor', true],
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

    #[Test]
    #[TestDox('isBuilt() is true only when index.js exists in the assets directory')]
    public function isBuiltChecksTheBuildOutput(): void
    {
        $dir = sys_get_temp_dir() . '/block-editor-emoji-' . bin2hex(random_bytes(4));
        mkdir($dir);
        try {
            $this->assertFalse(AssetRegistrar::isBuilt($dir));
            file_put_contents($dir . '/index.js', '//');
            $this->assertTrue(AssetRegistrar::isBuilt($dir));
        } finally {
            @unlink($dir . '/index.js');
            @rmdir($dir);
        }
    }

    #[Test]
    #[TestDox('isBuilt() defaults to the plugin\'s own src/assets directory')]
    public function isBuiltDefaultsToThePluginAssets(): void
    {
        $this->assertSame(is_file(dirname(__DIR__, 4) . '/src/assets/index.js'), AssetRegistrar::isBuilt());
    }
}
