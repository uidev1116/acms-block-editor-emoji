<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji;

/**
 * Custom template correctors (output filters).
 *
 * A corrector method is applied from templates as an option: {var}[sample('arg')].
 */
class Corrector
{
    /**
     * Example corrector method.
     *
     * Usage in a template: {var}[sample('foo', 'bar')]
     * If {var} is "a-blog cms", this returns "foobar+a-blog cms".
     *
     * @param string $txt The value the corrector option is applied to.
     * @param array<int, string> $args Corrector arguments, e.g. {var}[sample('foo', 'bar')].
     * @return string The corrected value.
     */
    public function sample(string $txt, array $args = []): string
    {
        $foo = $args[0] ?? '';
        $bar = $args[1] ?? '';

        return $foo . $bar . '+' . $txt;
    }
}
