<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit;

use Acms\Plugins\BlockEditorEmoji\Hook;
use Acms\Services\Asset\AssetManager;
use Acms\Services\Facades\Asset;
use Acms\Services\Template\Twig;
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

    /**
     * @param \ArrayObject<string, callable> $registered
     */
    private function callRegistered(\ArrayObject $registered, string $name): mixed
    {
        $callable = $registered[$name] ?? null;
        $this->assertIsCallable($callable);

        return $callable();
    }

    private function hook(mixed $admin, string $dirOffset = '', bool $enabled = true, string $charset = 'utf8mb4', bool $built = true, bool $contributor = false): Hook
    {
        return new class ($admin, $dirOffset, $enabled, $charset, $built, $contributor) extends Hook {
            public function __construct(
                private mixed $admin,
                private string $offset,
                private bool $enabledSetting,
                private string $charset,
                private bool $built,
                private bool $contributor
            ) {
            }

            protected function isContributor()
            {
                return $this->contributor;
            }

            protected function assetsBuilt()
            {
                return $this->built;
            }

            protected function isEnabled()
            {
                return $this->enabledSetting;
            }

            protected function dbCharset()
            {
                return $this->charset;
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
    #[TestDox('afterBuild() registers the assets on public pages for contributors or above (direct edit)')]
    public function registersAssetsOnPublicPageForContributors(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->once())->method('style');
        $manager->expects($this->once())->method('script');
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook('', '', true, 'utf8mb4', true, true)->afterBuild($res);
    }

    #[Test]
    #[TestDox('afterBuild() does nothing on public pages for visitors')]
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

    #[Test]
    #[TestDox('afterBuild() does nothing when the setting is off, even on an admin screen')]
    public function doesNothingWhenSettingIsOff(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->never())->method('script');
        $manager->expects($this->never())->method('style');
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook('entry_editor', '', false)->afterBuild($res);
    }

    #[Test]
    #[TestDox('afterBuild() does nothing when the JS has not been built (no 404 script tag)')]
    public function doesNothingWhenAssetsAreNotBuilt(): void
    {
        $manager = $this->createMock(AssetManager::class);
        $manager->expects($this->never())->method('script');
        $manager->expects($this->never())->method('style');
        Asset::swap($manager);

        $res = '<html></html>';
        $this->hook('entry_editor', '', true, 'utf8mb4', false)->afterBuild($res);
    }

    #[Test]
    #[TestDox('the real Hook asks the registrar whether the build output exists')]
    public function realHookChecksTheBuildOutput(): void
    {
        $hook = new class extends Hook {
            public function built(): bool
            {
                return $this->assetsBuilt();
            }
        };

        $this->assertSame(is_file(dirname(__DIR__, 3) . '/src/assets/index.js'), $hook->built());
    }

    #[Test]
    #[TestDox('extendsTwig() registers the DB charset functions for the settings screen')]
    public function extendsTwigRegistersFunctions(): void
    {
        /** @var \ArrayObject<string, callable> $registered */
        $registered = new \ArrayObject();
        $twig = $this->createMock(Twig::class);
        $twig->method('registerFunction')->willReturnCallback(
            function (string $name, callable $callable) use ($registered): void {
                $registered[$name] = $callable;
            }
        );

        $this->hook('app_block_editor_emoji_index', '', true, 'utf8mb4')->extendsTwig($twig);
        $this->assertSame('utf8mb4', $this->callRegistered($registered, 'block_editor_emoji_db_charset'));
        $this->assertTrue($this->callRegistered($registered, 'block_editor_emoji_db_ready'));

        $registered->exchangeArray([]);
        $this->hook('app_block_editor_emoji_index', '', true, '')->extendsTwig($twig);
        $this->assertSame('', $this->callRegistered($registered, 'block_editor_emoji_db_charset'));
        $this->assertFalse($this->callRegistered($registered, 'block_editor_emoji_db_ready'));
    }

    #[Test]
    #[TestDox('the real Hook is not a contributor in CLI (no session)')]
    public function realHookIsNotAContributorInCli(): void
    {
        $hook = new class extends Hook {
            public function contributor(): bool
            {
                return $this->isContributor();
            }
        };

        $this->assertFalse($hook->contributor());
    }

    #[Test]
    #[TestDox('the real Hook reads the core DB charset constant and the default setting is on')]
    public function realHookDefaults(): void
    {
        $hook = new class extends Hook {
            public function enabled(): bool
            {
                return $this->isEnabled();
            }

            public function charset(): string
            {
                return $this->dbCharset();
            }
        };

        $this->assertTrue($hook->enabled());
        $this->assertSame((string) DB_CONNECTION_CHARSET, $hook->charset());
    }
}
