<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit;

use Acms\Plugins\BlockEditorEmoji\Hook;
use Acms\Services\Asset\AssetManager;
use Acms\Services\Facades\Asset;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

final class HookTest extends TestCase
{
    protected function tearDown(): void
    {
        Asset::clearInstance();
        parent::tearDown();
    }

    private function hook(mixed $admin, string $dirOffset = ''): Hook
    {
        return new class ($admin, $dirOffset) extends Hook {
            public function __construct(private mixed $admin, private string $offset)
            {
            }

            protected function currentAdmin()
            {
                return $this->admin;
            }

            protected function dirOffset()
            {
                return $this->offset;
            }
        };
    }

    #[Test]
    #[TestDox('afterBuild() registers the assets on an admin screen')]
    public function registersAssetsOnAdminScreen(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->once())
            ->method('style')
            ->with('block-editor-emoji-style', '/blog/extension/plugins/BlockEditorEmoji/assets/index.css');
        $manager->expects($this->once())
            ->method('script')
            ->with('block-editor-emoji', '/blog/extension/plugins/BlockEditorEmoji/assets/index.js', [
                'position' => 'body_end',
                'attrs' => ['type' => 'module'],
            ]);
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook('entry_editor', 'blog/')->afterBuild($res);
    }

    #[Test]
    #[TestDox('afterBuild() does nothing on public pages')]
    public function doesNothingOnPublicPage(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->never())->method('style');
        $manager->expects($this->never())->method('script');
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook('')->afterBuild($res);
    }

    #[Test]
    #[TestDox('afterBuild() does nothing when ADMIN is not defined')]
    public function doesNothingWhenAdminIsUndefined(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->never())->method('script');
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook(null)->afterBuild($res);
    }

    #[Test]
    #[TestDox('afterBuild() reads the core constants by default (CLI: ADMIN is empty, so nothing is registered)')]
    public function readsCoreConstants(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->never())->method('script');
        Asset::swap($manager);

        $res = '';
        (new Hook())->afterBuild($res);
    }
}
