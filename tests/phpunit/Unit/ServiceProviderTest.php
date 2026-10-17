<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit;

use Acms\Plugins\BlockEditorEmoji\Hook;
use Acms\Plugins\BlockEditorEmoji\ServiceProvider;
use Acms\Services\Common\HookFactory;
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
        $this->assertFalse($provider->menu);
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
