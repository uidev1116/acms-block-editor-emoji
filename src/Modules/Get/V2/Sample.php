<?php

namespace Acms\Plugins\BlockEditorEmoji\Modules\Get\V2;

use Acms\Modules\Get\V2\Base;
use Acms\Plugins\BlockEditorEmoji\Services\SampleService;

/**
 * Example V2 (Twig) module.
 *
 * V2 modules return a data array instead of rendering a template; the Twig side consumes it, e.g.:
 *   {% set data = module('V2_Sample') %}
 *   <p>{{ data.count }}</p>
 *   {% for m in data.members %}{{ m.name }}{% endfor %}
 *
 * The module name "V2_Sample" resolves to this class (Acms\Plugins\BlockEditorEmoji\Modules\Get\V2\Sample)
 * because a-blog cms registers the plugin's `{Name}\Modules` namespace automatically — the same way
 * it registers `Acms\Custom\Modules` for extension/acms. Keep the module thin and put the logic in a
 * service ({@see SampleService}) so it stays testable.
 */
class Sample extends Base
{
    /**
     * @return array{members: list<array{id: string, name: string}>, count: int}
     */
    public function get(): array
    {
        $service = new SampleService();

        return [
            'members' => $service->members(),
            'count' => $service->memberCount(),
        ];
    }
}
