<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji\Services;

use Acms\Services\Facades\Database;
use SQL;

/**
 * Business logic extracted from the GET/POST handlers so it can be unit tested.
 *
 * a-blog cms handlers (ACMS_GET_* / ACMS_POST_*) depend on CSRF, session and global state, which
 * makes them hard to test directly. Keep the handlers thin and move logic into a service like this.
 */
class SampleService
{
    /**
     * Pure logic example (no DB). Covered by a unit test (TestCase).
     *
     * @return list<array{id: string, name: string}>
     */
    public function members(): array
    {
        return [
            ['id' => 'alice', 'name' => 'Alice'],
            ['id' => 'bob', 'name' => 'Bob'],
            ['id' => 'carol', 'name' => 'Carol'],
        ];
    }

    /**
     * Pure logic example (no DB). Covered by a unit test (TestCase).
     */
    public function memberCount(): int
    {
        return count($this->members());
    }

    /**
     * DB-backed example. Covered by an integration test (DatabaseTestCase + Seeder).
     *
     * @return string|null Blog name, or null when the blog does not exist.
     */
    public function findBlogName(int $blogId): ?string
    {
        $sql = SQL::newSelect('blog');
        $sql->addSelect('blog_name');
        $sql->addWhereOpr('blog_id', $blogId);

        $name = Database::query($sql->get(dsn()), 'one');

        return is_string($name) ? $name : null;
    }
}
