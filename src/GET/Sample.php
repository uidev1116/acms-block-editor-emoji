<?php

namespace Acms\Plugins\BlockEditorEmoji\GET;

use ACMS_Corrector;
use ACMS_GET;
use Acms\Plugins\BlockEditorEmoji\Services\SampleService;
use Template;

/**
 * Example display (GET) module.
 *
 * Called from templates like a built-in GET module:
 *   <!-- BEGIN_MODULE Sample --> ... <!-- END_MODULE Sample -->
 *
 * The handler stays thin: it only wires request/response and delegates the actual data to
 * {@see SampleService}, which is unit tested. Rename "Sample" to your own module name as needed.
 *
 * Example template:
 *   <!-- BEGIN_MODULE Sample -->
 *   <p>Total: {count}</p>
 *   <ul>
 *   <!-- BEGIN member:loop -->
 *     <li>{id}: {name}</li>
 *   <!-- END member:loop -->
 *   </ul>
 *   <!-- END_MODULE Sample -->
 */
class Sample extends ACMS_GET
{
    public function get()
    {
        $tpl = new Template($this->tpl, new ACMS_Corrector());

        $service = new SampleService();
        $members = $service->members();

        $vars = [
            'member' => $members,
            'count' => $service->memberCount(),
        ];

        return $tpl->render($vars);
    }
}
