<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Unit\Services;

use Acms\Plugins\BlockEditorEmoji\Services\SampleService;
use Acms\TestingFramework\TestCase;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

/**
 * Unit test example (no DB). Tests the pure logic extracted from the GET handler.
 */
final class SampleServiceTest extends TestCase
{
    #[Test]
    #[TestDox('members() returns the sample rows')]
    public function membersReturnsRows(): void
    {
        $members = (new SampleService())->members();

        $this->assertCount(3, $members);
        $this->assertSame(['alice', 'bob', 'carol'], array_column($members, 'id'));
        $this->assertSame('Alice', $members[0]['name']);
    }

    #[Test]
    #[TestDox('memberCount() matches the number of members')]
    public function memberCountMatches(): void
    {
        $service = new SampleService();

        $this->assertSame(count($service->members()), $service->memberCount());
    }
}
