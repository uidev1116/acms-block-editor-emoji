<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit;

use Acms\Plugins\BlockEditorEmoji\Hook;
use Acms\Plugins\BlockEditorEmoji\ServiceProvider;
use Acms\Services\Common\HookFactory;
use Acms\Services\Common\InjectTemplate;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

final class ServiceProviderTest extends TestCase
{
    #[Test]
    #[TestDox('declares the plugin metadata')]
    public function declaresMetadata(): void
    {
        $provider = new ServiceProvider();

        $this->assertSame('BlockEditorEmoji', $provider->name);
        $this->assertSame('uidev1116', $provider->author);
        $this->assertFalse($provider->module);
        $this->assertSame('block_editor_emoji_index', $provider->menu);
        $this->assertMatchesRegularExpression('/^\d+\.\d+\.\d+$/', $provider->version);
    }

    #[Test]
    #[TestDox('init() attaches the Hook under its own name')]
    public function initAttachesHook(): void
    {
        (new ServiceProvider())->init();

        $this->assertInstanceOf(Hook::class, HookFactory::singleton()->getHook('BlockEditorEmojiHook'));
    }

    #[Test]
    #[TestDox('registerSettingsScreen() injects the settings page only on its own screen')]
    public function settingsScreenIsInjectedOnlyOnItsOwnScreen(): void
    {
        $inject = InjectTemplate::singleton();
        $before = count($inject->get('admin-main'));

        (new ServiceProvider())->registerSettingsScreen('entry_editor');
        $this->assertCount($before, $inject->get('admin-main'));

        (new ServiceProvider())->registerSettingsScreen('app_block_editor_emoji_index');
        $this->assertCount($before + 1, $inject->get('admin-main'));
        $this->assertNotEmpty($inject->get('admin-topicpath'));
    }

    #[Test]
    #[TestDox('lifecycle methods succeed')]
    public function lifecycleSucceeds(): void
    {
        $provider = new ServiceProvider();

        $this->assertTrue($provider->checkRequirements());
        $this->assertTrue($provider->update());
        $this->assertTrue($provider->activate());
        $this->assertTrue($provider->deactivate());
        $provider->install();
        $provider->uninstall();
    }
}
