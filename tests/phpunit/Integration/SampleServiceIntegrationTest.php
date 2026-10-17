<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Tests\Integration;

use Acms\Plugins\BlockEditorEmoji\Services\SampleService;
use Acms\TestingFramework\DatabaseTestCase;
use Acms\TestingFramework\Seeder\BlogSeeder;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\TestDox;

/**
 * Integration test example (uses the DB). Each test runs inside a transaction that is rolled back
 * afterwards, so it never pollutes the real database.
 */
final class SampleServiceIntegrationTest extends DatabaseTestCase
{
    private int $blogId;

    protected function setUpDatabase(): void
    {
        // Pass only the values you care about; the Seeder fills the rest (via Faker).
        $this->blogId = BlogSeeder::seed([
            'blog_name' => 'Test Blog',
        ]);
    }

    #[Test]
    #[TestDox('findBlogName() returns the blog name for an existing id')]
    public function returnsBlogNameForExistingId(): void
    {
        $this->assertSame('Test Blog', (new SampleService())->findBlogName($this->blogId));
    }

    #[Test]
    #[TestDox('findBlogName() returns null for a missing id')]
    public function returnsNullForMissingId(): void
    {
        $this->assertNull((new SampleService())->findBlogName(999999));
    }
}
