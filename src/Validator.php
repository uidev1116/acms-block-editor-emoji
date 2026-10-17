<?php

declare(strict_types=1);

namespace Acms\Plugins\BlockEditorEmoji;

use Acms\Services\Validator\Attribute\AsValidationOption;

/**
 * Custom form validators.
 *
 * A validator method returns true when the input is valid, false otherwise. It is declared in a
 * form template with `name="var:v#sample"` (or `:validator#sample`).
 */
class Validator
{
    /**
     * Example validator method: passes when $val contains the substring $arg.
     *
     * Template usage:
     *   <input type="text" name="var" value="{var}">
     *   <input type="hidden" name="field[]" value="var">
     *   <input type="hidden" name="var:v#sample" value="cms">
     *
     *   <!-- BEGIN var:validator#sample -->
     *     <p class="acms-admin-text-error">The value must contain "cms".</p>
     *   <!-- END var:validator#sample -->
     *
     * Adding #[AsValidationOption] lists this method as a choice in the admin form UI.
     *
     * @param string $val The submitted value.
     * @param string $arg The argument from name="var:v#sample" value="...".
     * @return bool True when valid.
     */
    #[AsValidationOption(label: 'Sample', group: 'Other')]
    public function sample(string $val, string $arg): bool
    {
        return str_contains($val, $arg);
    }
}
